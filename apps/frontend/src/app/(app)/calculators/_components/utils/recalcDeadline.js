  
import { store } from "@/lib/slice";
import { toast } from "sonner";
import simulation from "@askell/shared/calc/simulation";
// import simulation from '../../../../../../../../packages/shared/src/simulation2.js'

export default function handleRecalcDeadline() {
    const origHeaps = store.getState().app.heaps
    if(Object.keys(origHeaps).length === 0) {
        toast.error('Нет данных о текущей загрузке, либо они еще не загрузились');
        return;
    }
    console.time('simulation')
    const { schedule, index } = store.getState().app.schedule
    const positions = store.getState().app.positions
    if(positions.length === 0) {
        toast.error('Нет позиций');
        return;
    }
    const pricesAndCoefs = store.getState().app?.selfcost?.pricesAndCoefs
    const stages = store.getState().app?.selfcost?.processingStages
    const stagesAndNorms = store.getState().app?.selfcost?.stagesAndNorms
    const heaps = JSON.parse(JSON.stringify(origHeaps))
    let hasPrint = false
    const thicknesses = []
    const dayThicknessMap = {
        1: [4],
        2: [5],
        3: [6],
        4: [8],
        5: [10, 12],
    }
    for(const pos of positions){
        if(pos?.initialData?.print) hasPrint = true
        const posType = pos?.result?.other?.type
        if(posType == 'Стекло'){
            const thickness = Number(pos?.initialData?.material?.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
            thicknesses.push(thickness)
            for (let i = 0; i < pos.quantity; i++) {
                heaps?.['Раскрой']?.push({
                    name: pos?.name,
                    initialData: pos?.initialData,
                    productionPath: buildGlassPath(pos),
                    orderingPosition: 0,
                    tier: 3,
                    pfDepth: 1,
                });
            }
        }
        else if(posType == 'Триплекс'){
            for (let i = 0; i < pos.quantity; i++) {
                const obj = {
                    name: pos?.name,
                    initialData: pos?.initialData,
                    productType: 'Триплекс',
                    productionPath: [{stageName: 'Триплексование', orderingPosition: 0, materials: {}}, {stageName: 'ОТК', orderingPosition: 1}],
                    orderingPosition: 0,
                    tier: 3,
                    pfDepth: 1,
                }
                for(const material of (pos?.result?.other?.materials || [])) {
                    const assortmentId = crypto.randomUUID();
                    const thickness = Number(material?.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
                    thicknesses.push(thickness)
                    heaps?.['Раскрой']?.push({//Раскрой
                        name: `Стекло для ${pos?.name}`,
                        initialData: {...pos?.initialData, material},
                        productionPath: buildGlassPath(pos),
                        orderingPosition: 0,
                        tier: 3,
                        pfDepth: 2,
                        assortmentId
                    });
                    obj.productionPath[0].materials[assortmentId] ??= 0
                    obj.productionPath[0].materials[assortmentId] += 1
                }
                heaps?.['Триплексование']?.push(obj)//Триплексование
            }
        }
        else if(posType == 'Стеклопакет'){
            for (let i = 0; i < pos.quantity; i++) {
                const obj = {
                    name: pos?.name,
                    initialData: pos?.initialData,
                    productType: 'Стеклопакет',
                    productionPath: [
                        {stageName: 'Изготовление рамки', orderingPosition: 0, materials: {}},
                        {stageName: 'Сборка стеклопакета', orderingPosition: 1},
                        {stageName: 'Вторичная герметизация', orderingPosition: 2}
                    ],
                    orderingPosition: 0,
                    tier: 3,
                    pfDepth: 1,
                }
                for(const material of (pos?.result?.other?.materials || [])) {
                    if(material[0].toLowerCase().includes('триплекс')){
                        const usedTriplex = pos?.result?.other?.usedTriplex.find(el => el.name == material[0])
                        const assortmentId = crypto.randomUUID();
                        const triplexObj = {
                            name: `Триплекс для ${pos?.name}`,
                            initialData: usedTriplex?.initialData,
                            productionPath: [{stageName: 'Триплексование', orderingPosition: 0, materials: {}}, {stageName: 'ОТК', orderingPosition: 1}],
                            orderingPosition: 0,
                            tier: 3,
                            pfDepth: 2,
                            assortmentId
                        }
                        for(const material of (usedTriplex?.result?.other?.materials || [])) {
                            const glassAssortmentId = crypto.randomUUID();
                            const thickness = Number(material?.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
                            thicknesses.push(thickness)
                            heaps?.['Раскрой']?.push({//Раскрой
                                name: `Стекло для ${usedTriplex.name} для ${pos?.name}`,
                                initialData: { ...usedTriplex?.initialData, material },
                                productionPath: buildGlassPath(usedTriplex),
                                orderingPosition: 0,
                                tier: 3,
                                pfDepth: 3,
                                assortmentId: glassAssortmentId
                            });
                            triplexObj.productionPath[0].materials[glassAssortmentId] ??= 0
                            triplexObj.productionPath[0].materials[glassAssortmentId] += 1
                        }
                        heaps?.['Триплексование']?.push(triplexObj)//Триплексование
                        obj.productionPath[0].materials[assortmentId] ??= 0
                        obj.productionPath[0].materials[assortmentId] += 1
                        continue
                    }
                    const assortmentId = crypto.randomUUID();
                    heaps?.['Раскрой']?.push({//Раскрой
                        name: `Стекло для ${pos?.name}`,
                        initialData: pos?.initialData,
                        productionPath: buildGlassPathForGlasspacket(pos, material),
                        orderingPosition: 0,
                        tier: 3,
                        pfDepth: 2,
                        assortmentId
                    });
                    obj.productionPath[0].materials[assortmentId] ??= 0
                    obj.productionPath[0].materials[assortmentId] += 1
                }
                heaps?.['Изготовление рамки']?.push(obj)//Изготовление рамки
            }
        }else{
            toast.error(`Позиция ${pos?.name} пропущена при расчете сроков, т.к. не поддерживается тип ${posType}`);
        }
    }
    const currentDay = new Date().getDay()
    let maxDays = 0;
    for (const thickness of thicknesses) {
        const cutDay = Number(Object.keys(dayThicknessMap).find(day => dayThicknessMap[day].includes(thickness)));
        if (!cutDay) continue;

        // сколько дней ждать до следующего такого дня
        let diff = cutDay - currentDay;

        if (diff < 0) {
            diff += 7;
        }

        maxDays = Math.max(maxDays, diff);
    }

    const res = simulation({
        schedule,
        startIndex: index,
        heaps,
        pricesAndCoefs,
        stages,
        stagesAndNorms
    })
    console.log(res)
    console.timeEnd('simulation')
    return {hasPrint, ...res, addDaysByThickness: maxDays}
}

const buildGlassPath = (data) => {
  const path = ['Раскрой']
  if(data.initialData.processing == 'Притупка') path.push('ПР Притупка')
  if(data.initialData.processing == 'Полировка' && data.result.other.stanok == 'Прямолинейка') path.push('ПР Полировка')
  if(data.initialData.processing == 'Шлифовка' && data.result.other.stanok == 'Прямолинейка') path.push('ПР Шлифовка')
  if(data.initialData.processing == 'Полировка' && data.result.other.stanok == 'Криволинейка') path.push('КР Полировка')
  if(data.initialData.processing == 'Шлифовка' && data.result.other.stanok == 'Криволинейка') path.push('КР Шлифовка')
  if(data.initialData.drills > 0) path.push('Сверление')
  if(data.initialData.zenk > 0) path.push('Зенковка')
  if(data.initialData.tempered) path.push('Закалка')
  path.push('ОТК')
  const res = path.map((stageName, index) => {
    return {
      stageName,
      orderingPosition: index
    }
  })
  return res
}
const buildGlassPathForGlasspacket = (pos, material) => {
  const path = ['Раскрой']
  if(material[2] == 'Притупка') path.push('ПР Притупка')
  if(material[2] == 'Полировка' && pos.result.other.stanok == 'Прямолинейка') path.push('ПР Полировка')
  if(material[2] == 'Шлифовка' && pos.result.other.stanok == 'Прямолинейка') path.push('ПР Шлифовка')
  if(material[2] == 'Полировка' && pos.result.other.stanok == 'Криволинейка') path.push('КР Полировка')
  if(material[2] == 'Шлифовка' && pos.result.other.stanok == 'Криволинейка') path.push('КР Шлифовка')
  if(material[1]) path.push('Закалка')
  if(material[3]) path.push('Окрашивание')
  path.push('ОТК')
  const res = path.map((stageName, index) => {
    return {
      stageName,
      orderingPosition: index
    }
  })
  return res
}