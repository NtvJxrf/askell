  
import { store } from "@/lib/slice";
import { toast } from "sonner";
import simulation from "@askell/shared/calc/simulation";

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
    for(const pos of positions){
        const posType = pos?.result?.other?.type
        if(posType == 'Стекло'){
            for (let i = 0; i < pos.quantity; i++) {
                heaps?.['Раскрой']?.push({
                    name: pos?.name,
                    initialData: pos?.initialData,
                    productionPath: buildGlassPath(pos),
                    orderingPosition: 0,
                    tier: 3
                });
            }
        }
        if(posType == 'Триплекс'){
            for (let i = 0; i < pos.quantity; i++) {
                const obj = {
                    name: pos?.name,
                    initialData: pos?.initialData,
                    productionPath: [{stageName: 'Триплексование', orderingPosition: 0, materials: {}}, {stageName: 'ОТК', orderingPosition: 1}],
                    orderingPosition: 0,
                    tier: 3,
                }
                for(let i = 0; i < (pos?.result?.other?.materials?.length || 2); i++) {
                    const assortmentId = crypto.randomUUID();
                    heaps?.['Раскрой']?.push({//Раскрой
                        name: `Стекло для ${pos?.name}`,
                        initialData: pos?.initialData,
                        productionPath: buildGlassPath(pos),
                        orderingPosition: 0,
                        tier: 3,
                        assortmentId
                    });
                    obj.productionPath[0].materials[assortmentId] ??= 0
                    obj.productionPath[0].materials[assortmentId] += 1
                }
                heaps?.['Триплексование']?.push(obj)//Триплексование
            }
        }
        if(posType == 'Стеклопакет'){
            for (let i = 0; i < pos.quantity; i++) {
                const obj = {
                    name: pos?.name,
                    initialData: pos?.initialData,
                    productionPath: [
                        {stageName: 'Изготовление рамки', orderingPosition: 0, materials: {}},
                        {stageName: 'Сборка стеклопакета', orderingPosition: 1},
                        {stageName: 'Вторичная герметизация', orderingPosition: 2}
                    ],
                    orderingPosition: 0,
                    tier: 3
                }
                for(const material of (pos?.result?.other?.materials || [])) {
                    const assortmentId = crypto.randomUUID();
                    heaps?.['Раскрой']?.push({//Раскрой
                        name: `Стекло для ${pos?.name}`,
                        initialData: pos?.initialData,
                        productionPath: buildGlassPathForGlasspacket(pos, material),
                        orderingPosition: 0,
                        tier: 3,
                        assortmentId
                    });
                    obj.productionPath[0].materials[assortmentId] ??= 0
                    obj.productionPath[0].materials[assortmentId] += 1
                }
                heaps?.['Изготовление рамки']?.push(obj)//Изготовление рамки
            }
        }
    }
    const res = simulation({
        schedule,
        startIndex: index,
        heaps,
        pricesAndCoefs,
        stages,
        stagesAndNorms
    })
    console.timeEnd('simulation')
    return res
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