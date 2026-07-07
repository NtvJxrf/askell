import { valkey } from "@askell/shared";
import simulation from "@askell/shared/calc/simulation"
const recalc = async (positions) => {
    let { schedule, index } = JSON.parse(await valkey.get('schedule'));
    let pricesAndCoefs = JSON.parse(await valkey.get('sklad:data:pricesAndCoefs'))
    const heaps = JSON.parse(await valkey.get('heaps'))
    const stages = JSON.parse(await valkey.get('sklad:data:processingStages'))
    const stagesAndNorms = JSON.parse(await valkey.get('sklad:data:stagesAndNorms'))
    for(const pos of positions){
        const { position, data } = pos
        const posType = data?.result?.other?.type
        if(posType == 'Стекло'){
            for (let i = 0; i < position.quantity; i++) {
                heaps?.['Раскрой']?.push({
                    name: position?.name,
                    initialData: data?.initialData,
                    productionPath: buildGlassPath(data),
                    orderingPosition: 0,
                    tier: 3
                });
            }
        }
        if(posType == 'Триплекс'){
            for (let i = 0; i < position.quantity; i++) {
                const obj = {
                    name: position?.name,
                    initialData: data?.initialData,
                    productionPath: [{stageName: 'Триплексование', orderingPosition: 0, materials: {}}, {stageName: 'ОТК', orderingPosition: 1}],
                    orderingPosition: 0,
                    tier: 3,
                }
                for(let i = 0; i < (data?.result?.other?.materials?.length || 2); i++) {
                    const assortmentId = crypto.randomUUID();
                    heaps?.['Раскрой']?.push({//Раскрой
                        name: `Стекло для ${position?.name}`,
                        initialData: data?.initialData,
                        productionPath: buildGlassPath(data),
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
            for (let i = 0; i < position.quantity; i++) {
                const obj = {
                    name: position?.name,
                    initialData: data?.initialData,
                    productionPath: [
                        {stageName: 'Изготовление рамки', orderingPosition: 0, materials: {}},
                        {stageName: 'Сборка стеклопакета', orderingPosition: 1},
                        {stageName: 'Вторичная герметизация', orderingPosition: 2}
                    ],
                    orderingPosition: 0,
                    tier: 3
                }
                for(const material of (data?.result?.other?.materials || [])) {
                    const assortmentId = crypto.randomUUID();
                    heaps?.['Раскрой']?.push({//Раскрой
                        name: `Стекло для ${position?.name}`,
                        initialData: data?.initialData,
                        productionPath: buildGlassPathForGlasspacket(data, material),
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
    return res
}

export default recalc

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
const buildGlassPathForGlasspacket = (data, material) => {
  const path = ['Раскрой']
  if(material[2] == 'Притупка') path.push('ПР Притупка')
  if(material[2] == 'Полировка' && data.result.other.stanok == 'Прямолинейка') path.push('ПР Полировка')
  if(material[2] == 'Шлифовка' && data.result.other.stanok == 'Прямолинейка') path.push('ПР Шлифовка')
  if(material[2] == 'Полировка' && data.result.other.stanok == 'Криволинейка') path.push('КР Полировка')
  if(material[2] == 'Шлифовка' && data.result.other.stanok == 'Криволинейка') path.push('КР Шлифовка')
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