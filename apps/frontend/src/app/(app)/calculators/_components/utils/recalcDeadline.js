  
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
            console.log(pos)
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
                    if(material[0].toLowerCase().includes('триплекс')){
                        const usedTriplex = pos?.result?.other?.usedTriplex.find(el => el.name == material[0])
                        const obj = {
                            name: `Триплекс для ${pos?.name}`,
                            initialData: usedTriplex?.initialData,
                            productionPath: [{stageName: 'Триплексование', orderingPosition: 0, materials: {}}, {stageName: 'ОТК', orderingPosition: 1}],
                            orderingPosition: 0,
                            tier: 3,
                        }
                        for(let i = 0; i < (pos?.result?.other?.materials?.length || 2); i++) {
                            const assortmentId = crypto.randomUUID();
                            heaps?.['Раскрой']?.push({//Раскрой
                                name: `Стекло для ${usedTriplex.name} для ${pos?.name}`,
                                initialData: usedTriplex?.initialData,
                                productionPath: buildGlassPath(usedTriplex),
                                orderingPosition: 0,
                                tier: 3,
                                assortmentId
                            });
                            obj.productionPath[0].materials[assortmentId] ??= 0
                            obj.productionPath[0].materials[assortmentId] += 1
                        }
                        heaps?.['Триплексование']?.push(obj)//Триплексование
                        continue
                    }
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


// added
// : 
// false
// initialData
// : 
// color
// : 
// ""
// color1
// : 
// undefined
// color2
// : 
// undefined
// gas
// : 
// ""
// height
// : 
// 1000
// ignoreRestricts
// : 
// ""
// material
// : 
// ""
// material1
// : 
// "Триплекс, Стекло Arctic Blue, 4 мм + Стекло Arctic Blue, 4 мм, (1000х1000, ПР, Притупка, Закаленное, площадь: 1.00)"
// material2
// : 
// "Стекло Arctic Blue, 6 мм"
// plane1
// : 
// "Рамка алюминиевая дистанционная (гибкая + коннектор) 10мм."
// plane2
// : 
// undefined
// print
// : 
// ""
// processing
// : 
// ""
// processing1
// : 
// "Шлифовка"
// processing2
// : 
// "Шлифовка"
// quantity
// : 
// 1
// rounding
// : 
// "Округление до 0.5"
// sealant
// : 
// ""
// shape
// : 
// true
// tempered
// : 
// ""
// tempered1
// : 
// undefined
// tempered2
// : 
// undefined
// width
// : 
// 1000
// [[Prototype]]
// : 
// Object
// key
// : 
// "941a7e4d-3eec-412c-9737-de94cfeff122"
// name
// : 
// "СПО, 24, Arctic Blue 4.Arctic Blue 4.1, 10 алюм, Arctic Blue 6, (1000х1000, площадь: 1.00)"
// prices
// : 
// {gostPrice: 0, retailPrice: 29322.74871711309, bulkPrice: 21258.992819906987, dealerPrice: 19792.855384051338, vipPrice: 18326.71794819568}
// quantity
// : 
// 1
// result
// : 
// errors
// : 
// []
// expenses
// : 
// []
// finalPrice
// : 
// (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
// materials
// : 
// (7) [{…}, {…}, {…}, {…}, {…}, {…}, {…}]
// other
// : 
// P
// : 
// 4
// S
// : 
// 1
// allThickness
// : 
// 24
// calcmaterialsandworks
// : 
// 14661.374358556544
// materials
// : 
// (2) [Array(4), Array(4)]
// materialsandworks
// : 
// 14661.374358556544
// productType
// : 
// true
// stanok
// : 
// "Прямолинейка"
// trims
// : 
// {}
// type
// : 
// "Стеклопакет"
// usedTriplex
// : 
// Array(1)
// 0
// : 
// added
// : 
// false
// initialData
// : 
// {width: 1000, height: 1000, processing: 'Притупка', drills: '', zenk: '', …}
// key
// : 
// "8106a2e9-59e2-4e75-bc05-2f5113f0805b"
// name
// : 
// "Триплекс, Стекло Arctic Blue, 4 мм + Стекло Arctic Blue, 4 мм, (1000х1000, ПР, Притупка, Закаленное, площадь: 1.00)"
// prices
// : 
// {gostPrice: 0, retailPrice: 21698.595855314965, bulkPrice: 15651.166591856389, dealerPrice: 13790.419126176826, vipPrice: 12860.045393337048}
// quantity
// : 
// 1
// result
// : 
// {materials: Array(3), calcMaterials: Array(0), works: Array(9), expenses: Array(0), other: {…}, …}
// [[Prototype]]
// : 
// Object
// length
// : 
// 1
// [[Prototype]]
// : 
// Array(0)
// viz
// : 
// true
// weight
// : 
// 35.768
// [[Prototype]]
// : 
// Object
// warnings
// : 
// []
// works
// : 
// (6) [{…}, {…}, {…}, {…}, {…}, {…}]