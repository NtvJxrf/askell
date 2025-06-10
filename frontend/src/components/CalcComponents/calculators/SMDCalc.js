import { constructWorks } from './triplexCalc'
const Calculate = (data, selfcost) => {
    console.log(selfcost)
    console.log(data)
    const { material, height, width, cuts, type, shape, color, customertype, print, rounding, trim } = data
    const result = {
        materials: [],
        works: [],
        expenses: [],
        other: {}
    }
    const S = (height * width) / 1000000
    const thickness = Number(material.match(/\d+/)[0])
    const works = { cuts, print, color }
    let weight = S * 2.5 * thickness
    let name = `Доска стеклянная магнитно-маркерная ASKELL ${type === 'Иное' ? 'Size' : type} (${height}х${width}), ${material}${color ? `, ${color}` : ''}${print ? `, УФ печать` : ''}${cuts ? `, Вырезы: ${cuts}` : ''}`
    const straightTypes = ['Lux', 'Standart', 'Krystal']
    const larger = Math.max(height, width)
    const stanok = (straightTypes.includes(type), larger > 2500 && cuts == 0 && weight < 50) ? 'Прямолинейка' : 'Криволинейка'
    const context = { works, selfcost, result, stanok, S };
    for (const work in works) {
            if (!work) continue;
            constructWorks(work, context);
        }

    result.materials.push({
        name: material,
        value: selfcost.materials[material].salePrices[0].value * S * trim,
        string: `${selfcost.materials[material].salePrices[0].value / 100} * ${S.toFixed(2)} * ${trim}`,
        formula: 'Цена за м² * Площадь * Коэффициент обрези'
    });

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
    const price = workshopExpenses + commercialExpenses + householdExpenses + materialsandworks
    result.other = {
        S,
        trim,
        productType: true,
        type: 'СМД'
    }
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