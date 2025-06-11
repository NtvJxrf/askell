import { constructWorks } from './triplexCalc'
const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { material, height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, color, print, customertype, rounding, trim } = data
    const works = { tempered, polishing, drills, zenk, cutsv1, cutsv2, print, color }
    let S = (height * width) / 1000000
    const P = ((height + width) * 2) / 1000
    const thickness = Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
    let weight = S * 2.5 * thickness
    let name = `${material} (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`
    const stanok = (shape && cutsv1 == 0 && cutsv2 == 0 && cutsv3 == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {}
    }
    result.materials.push({
        name: material,
        value: selfcost.materials[material].salePrices[0].value * S * trim,
        string: `${selfcost.materials[material].salePrices[0].value / 100} * ${S.toFixed(2)} * ${trim}`,
        formula: 'Цена за м² * Площадь * Коэффициент обрези'
    });
    const materials = [material]
    const context = { works, selfcost, result, P, stanok, materials, thickness, S };
    constructWorks('cutting', context);
    constructWorks('washing', context);
    constructWorks('grinding', context);
    for(const work in works){
        if(!work) continue
        constructWorks(work, context)
    }

    let materialsandworks = 0
    for (const item of Object.values(result.materials)) {
        materialsandworks += item.value
    }
    for (const item of Object.values(result.works)) {
        materialsandworks += item.value
    }
    const workshopExpenses = materialsandworks * 0.48   // % цеховых расходов
    const commercialExpenses = (materialsandworks + workshopExpenses) * 0.064 // % коммерческих расходов
    const householdExpenses =  (materialsandworks + workshopExpenses) * 0.2525 //общехозяйственные расходы

    result.expenses.push({
        name: 'Цеховые расходы',
        value: workshopExpenses,
        string: `${(materialsandworks / 100).toFixed(2)} * 0.48`,
        formula: 'Материалы + работы * 48%'
    });

    result.expenses.push({
        name: 'Коммерческие расходы',
        value: commercialExpenses,
        string: `(${(materialsandworks / 100).toFixed(2)} + ${(workshopExpenses / 100).toFixed(2)}) * 0.064`,
        formula: '(Материалы + Работы + Цеховые) * 6.4%'
    });

    result.expenses.push({
        name: 'Общехозяйственные расходы',
        value: householdExpenses,
        string: `(${(materialsandworks / 100).toFixed(2)} + ${(workshopExpenses / 100).toFixed(2)}) * 0.2525`,
        formula: '(Материалы + Работы + Цеховые) * 25.25%'
    });
    const price = materialsandworks + (commercialExpenses + householdExpenses + workshopExpenses) * selfcost.pricesAndCoefs[`Стекло ${customertype}`]

    result.other = {...result.other, ...{
        S,
        P,
        trim,
        stanok,
        weight,
        type: 'Стекло',
        productType: true,
    }}
    console.log(result)
    return {
            key: Date.now(),
            name,
            price,
            added: false,
            quantity: 1,
            initialData: data,
            selfcost,
            result
    }
}

export default Calculate



//площадь *( себес Стекло (зеркало) )* коэф.обрези+ стоимость Полуфабрикат краски выбранной (себес)*2 *0,3*площадь+ площадь*(стоимость краски печатной*0,048+RAL 9003 (Белый)себес *0,3)
// 0.3 = это норматив краски на 1м2
// уф печать делается на стороне, как ее включить в расчеты?

