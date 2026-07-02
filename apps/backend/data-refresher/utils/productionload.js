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
    console.timeEnd('get-heaps-details')
    const assortmentReqAttrs = ['Длина в мм', 'Ширина в мм', 'Окрашивание', 'Тип станка', 'Тип изделия',
        'Материал 1','Материал 2', 'Материал 3', 'Материал 4', 'Вид обработки', '№ заказа покупателя',
        'Кол-во вырезов 1 категорий', 'Кол-во вырезов 2 категорий', 'Кол-во вырезов 3 категорий', 'Печать',
        'Кол-во сверлений', 'Кол-во зенкований', 'Закалка'
    ]
    const taskReqAttrs = ['№ заказа покупателя', 'Получатель']
    // const allMaterials = Object.fromEntries(
    //     await Promise.all(
    //         tasksWithDetails
    //             .flatMap(el => el.productionstages)
    //             .filter(pstage => pstage.materials.meta.size > 0)
    //             .map(async pstage => [
    //                 pstage.materials.meta.href.replace('/materials', ''),
    //                 1
    //                 // await broker.call('proxy.fetchAllRows', { url: `${pstage.materials.meta.href}?` })
    //             ])
    //     )
    // );
    // console.log(Object.keys(allMaterials).length, 'materials fetched')
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
                        totalQuantity: pstage.totalQuantity,
                        productionPath: el.productionstages.filter(ps => ps.productionRow.meta.href === prowHref).map(ps => {
                            return {
                                productionStageId: ps.id,
                                stageHref: ps.stage.meta.href,
                                stageName: heapsRaw[ps.stage.meta.href]?.name,
                                productionRowId: ps.productionRow.meta.href.split('/').pop(),
                                orderingPosition: ps.orderingPosition,
                                // materials: (allMaterials[ps.meta.href] || []).reduce((acc, curr) => {
                                //     acc[curr.assortment.meta.href.split('/').pop()] = curr.planQuantity
                                //     return acc
                                // }, {})
                            }
                        }),
                        orderingPosition: pstage.orderingPosition,
                        tier: 1
                    })
                }
            }
        }
    }
    const orders = await broker.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=`
        +`state.name=Подготовить (переделать) чертежи`
        +`;state.name=Чертежи подготовлены, прикреплены`
        +`;state.name=Проверить чертежи`
        +`;state.name=Проверено технологом`
        +`&expand=positions.assortment`
    })
    for(const order of orders){
        for(const pos of order.positions.rows){
            const assortment = pos.assortment
            const attrs = (assortment?.attributes || []).reduce((a, x) => {
                if (assortmentReqAttrs.includes(x.name)) {
                    a[x.name] = x.value;
                }
                return a;
            }, {});
            const posType = attrs['Тип изделия']
            if(posType == 'Стекло'){
                for (let i = 0; i < pos.quantity; i++) {
                    heapsRaw?.['https://api.moysklad.ru/api/remap/1.2/entity/processingstage/d94b1d68-59e2-11ed-0a80-03cd0012392b']?.heap.push({ //Раскрой
                        name: assortment?.name,
                        attributes: attrs,
                        deliveryPlannedMoment: order.deliveryPlannedMoment,
                        productionPath: buildGlassPath(attrs),
                        orderingPosition: 0,
                        tier: 2
                    });
                }
            }
            if(posType == 'Триплекс'){
                for (let i = 0; i < pos.quantity; i++) {
                    heapsRaw?.['https://api.moysklad.ru/api/remap/1.2/entity/processingstage/2f32cd1b-63ed-11ed-0a80-022c00494587']?.heap.push({ //Триплексование
                        name: assortment?.name,
                        attributes: attrs,
                        deliveryPlannedMoment: order.deliveryPlannedMoment,
                        productionPath: [{stageName: 'Триплексование', orderingPosition: 0}, {stageName: 'ОТК', orderingPosition: 1}],
                        orderingPosition: 0,
                        tier: 2
                    });
                    for(let i = 0; i < (attrs['Кол-во полуфабрикатов'] || 2); i++) {
                        heapsRaw?.['https://api.moysklad.ru/api/remap/1.2/entity/processingstage/d94b1d68-59e2-11ed-0a80-03cd0012392b']?.heap.push({//Раскрой
                            name: `Стекло для ${assortment?.name}`,
                            attributes: attrs,
                            deliveryPlannedMoment: order.deliveryPlannedMoment,
                            productionPath: buildGlassPath(attrs),
                            orderingPosition: 0,
                            tier: 2
                        });
                    }
                }
            }
            if(posType == 'Стеклопакет'){
                for (let i = 0; i < pos.quantity; i++) {
                    heapsRaw?.['https://api.moysklad.ru/api/remap/1.2/entity/processingstage/b4389fb6-9213-11f0-0a80-0717002f0375']?.heap.push({//Изготовление рамки
                        name: assortment?.name,
                        attributes: attrs,
                        deliveryPlannedMoment: order.deliveryPlannedMoment,
                        productionPath: [
                            {stageName: 'Изготовление рамки', orderingPosition: 0},
                            {stageName: 'Сборка стеклопакета', orderingPosition: 1},
                            {stageName: 'Вторичная герметизация', orderingPosition: 2}
                        ],
                        orderingPosition: 0,
                        tier: 2
                    });
                    for(let i = 0; i < (attrs['Кол-во полуфабрикатов'] || 2); i++) {
                        heapsRaw?.['https://api.moysklad.ru/api/remap/1.2/entity/processingstage/d94b1d68-59e2-11ed-0a80-03cd0012392b']?.heap.push({//Раскрой
                            name: `Стекло для ${assortment?.name}`,
                            attributes: attrs,
                            deliveryPlannedMoment: order.deliveryPlannedMoment,
                            productionPath: buildGlassPath(attrs),
                            orderingPosition: 0,
                            tier: 2
                        });
                    }
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


const buildGlassPath = (attrs) => {
    const path = ['Раскрой']
    if(attrs['Вид обработки'] === 'Притупка') path.push('ПР Притупка')
    if(attrs['Вид обработки'] === 'Полировка' && attrs['Тип станка'] == 'Прямолинейка') path.push('ПР Полировка')
    if(attrs['Вид обработки'] === 'Шлифовка' && attrs['Тип станка'] == 'Прямолинейка') path.push('ПР Шлифовка')
    if(attrs['Вид обработки'] === 'Полировка' && attrs['Тип станка'] == 'Криволинейка') path.push('ПР Полировка')
    if(attrs['Вид обработки'] === 'Шлифовка' && attrs['Тип станка'] == 'Криволинейка') path.push('ПР Шлифовка')
    if(attrs['Кол-во сверлений']) path.push('Сверление')
    if(attrs['Кол-во зенкований']) path.push('Зенковка')
    if(attrs['Закалка']) path.push('Закалка')
    path.push('ОТК')
    const res = path.map((stageName, index) => {
        return {
            stageName,
            orderingPosition: index + 1
        }
    })
    return res
}