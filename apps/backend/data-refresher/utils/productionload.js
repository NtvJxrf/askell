import { broker } from "../index.js";
import { valkey } from "@askell/shared"

export const updateHeaps = async () => {
    console.time('get-heaps-total')
    const stagesRaw = JSON.parse(await valkey.get('sklad:data:processingStages'))
    const heapsRaw = {}
    for(const [name, stage] of Object.entries(stagesRaw)) { 
        heapsRaw[stage.meta.href] = { name, heap: [] }
    }
    console.time('get-heaps-tasks')
    const tasks = await broker.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/productiontask?filter=`
        +`state.name=Раскроен`
        +`;state.name=Ждёт раскрой`
        +`;state.name=Поставлен в производство`
        +`;state.name=Новое задание`
        +`;state.name=Окрашено`
        +`;state.name=Зачищено`
        +`;state.name=Упаковано`
        +`;state.name=Перерезать`
        +`;state.name=Обработан`
    })
    console.timeEnd('get-heaps-tasks')
    console.time('get-heaps-details')
    const tasksWithDetails = await Promise.all(
        tasks.map(async (task) => {
            const taskHref = task.meta.href;

            const [productionstages, products] = await Promise.all([
                broker.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/productionstage?filter=productionTask=${encodeURIComponent(taskHref)}` }),
                broker.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/productiontask/${task.id}/products?expand=assortment` }),
            ]);

            return {
            ...task,
            productionstages,
            products,
            };
        })
    );
    await valkey.set('tasksWithDetails', JSON.stringify(tasksWithDetails)) //Удалить после отладики await valkey.set('tasksWithDetails', null) //Удалить после отладки
    console.timeEnd('get-heaps-details')
    const assortmentReqAttrs = ['Длина в мм', 'Ширина в мм', 'Окрашивание', 'Тип станка', 'Тип изделия',
        'Материал 1','Материал 2', 'Материал 3', 'Материал 4', 'Вид обработки', '№ заказа покупателя',
        'Кол-во вырезов 1 категорий', 'Кол-во вырезов 2 категорий', 'Кол-во вырезов 3 категорий', 'Печать',
        'Кол-во сверлений', 'Кол-во зенкований', 'Закалка'
    ]
    const taskReqAttrs = ['№ заказа покупателя', 'Получатель']
    for(const el of tasksWithDetails){
        for(const pstage of el.productionstages){
            if(pstage.availableQuantity > 0){
                const prowHref = pstage.productionRow.meta.href
                const assortment = el.products.find(p => p.productionRow.meta.href === prowHref).assortment
                const attrs = (assortment?.attributes || []).reduce((a, x) => {
                    if (assortmentReqAttrs.includes(x.name)) {
                        a[x.name] = x.value;
                    }
                    return a;
                }, {});
                const taskAttrs = el.attributes.reduce((a, x) => {
                    if (taskReqAttrs.includes(x.name)) {
                        if(x.name === 'Получатель') 
                            a[x.name] = x.value.name
                        else 
                            a[x.name] = x.value;
                    }
                    return a;
                }, {});
                for(let i = 0; i < pstage.availableQuantity; i++){
                    heapsRaw[pstage.stage.meta.href].heap.push({
                        productionTaskId: el.id,
                        taskName: el.name,
                        taskAttrs,
                        name: assortment?.name,
                        attributes: attrs,
                        productionStageId: pstage.id,
                        productionRowId: prowHref.split('/').pop(),
                        deliveryPlannedMoment: el.deliveryPlannedMoment,
                        productionPath: el.productionstages.filter(ps => ps.productionRow.meta.href === prowHref).map(ps => {
                            return {
                                productionStageId: ps.id,
                                stageHref: ps.stage.meta.href,
                                stageName: heapsRaw[ps.stage.meta.href]?.name,
                                productionRowId: ps.productionRow.meta.href.split('/').pop(),
                                orderingPosition: ps.orderingPosition,
                            }
                        }),
                        orderingPosition: pstage.orderingPosition,
                    })
                }
            }
        }
    }
    const heaps = {}
    for(const [stageHref, { name, heap }] of Object.entries(heapsRaw)){
        heaps[name] = heap
    }
    await valkey.set('heaps', JSON.stringify(heaps))
    console.timeEnd('get-heaps-total')
    return true
}