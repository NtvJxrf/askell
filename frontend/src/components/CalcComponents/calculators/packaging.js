import store from "../../../store.js"
const allowedTypes = ['СМД', 'Керагласс', 'Триплекс', 'Стекло']
const packaging = (positions) => {
    const selfcost = store.getState().selfcost.selfcost
    const temp = {
        smd: false,
        weight: 0,
        count: 0,
        maxHeight: 0,
        maxWidth: 0,
    }
    positions.forEach( position => {
        if(!allowedTypes.includes(position?.result?.other?.type))
            return
        position.initialData.height > temp.maxHeight && (temp.maxHeight = position.initialData.height)
        position.initialData.width > temp.maxWidth && (temp.maxWidth = position.initialData.width)
        temp.weight += position.result.other.weight * position.quantity
        temp.count += position.quantity
        position.result.other.type === 'СМД' && (temp.smd = true)
    })
    if(!temp.count)
        return false
    const packagingType = getPackagingType(temp)

    const result = {
        materials: [],
        works: [],
        expenses: [],
    }
    let name = ''
    const height = temp.maxHeight / 1000
    const width = temp.maxWidth / 1000
    switch (packagingType) {
        case 1:
            name = `Стандартный ящик 100`
            result.materials.push({
                name: 'Доска 25х100х3000',
                value: selfcost.packagingMaterials['Доска 25х100х3000'].salePrices[0].value * ((height * 6 * 1.1 + width * 2 * 1.05) * 0.1 * 0.025),
                string: `${selfcost.packagingMaterials['Доска 25х100х3000'].salePrices[0].value} * ${((height * 6 * 1.1 + width * 2 * 1.05) * 0.1 * 0.025)}`,
                formula: 'pupa'
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].salePrices[0].value * (Math.ceil(height * 6 * 1.1 + width * 2 * 1.05) * 5),
                string: `dupa`,
                formula: 'dupa'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].salePrices[0].value * ((Math.max(height, width) < 1700 && Math.min(height, width) < 1300) ? 1 : 2),
                string: `lupa`,
                formula: 'lupa'
            })
            result.works.push({
                name: 'Работы',
                value: (selfcost.pricesAndCoefs['Зар.плата плотника'] * 1.395 / 168 + selfcost.pricesAndCoefs['Сделка упаковка'] * 1.1) * 0.833,
                string: `bupa`,
                formula: 'bupa'
            })
        break
        case 2:
            name = `Стандартный ящик 50`
            result.materials.push({
                name: 'Доска 25х100х3000',
                value: selfcost.packagingMaterials['Доска 25х100х3000'].salePrices[0].value * ((height * 4 * 1.1) * 0.1 * 0.025),
                string: `${selfcost.packagingMaterials['Доска 25х100х3000'].salePrices[0].value} * ${((height * 6 * 1.1 + width * 2 * 1.05) * 0.1 * 0.025)}`,
                formula: 'pupa'
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].salePrices[0].value * (Math.ceil(height * 4 * 1.1* 5)),
                string: `dupa`,
                formula: 'dupa'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].salePrices[0].value * ((Math.max(height, width) < 1700 && Math.min(height, width) < 1300) ? 1 : 2),
                string: `lupa`,
                formula: 'lupa'
            })
            result.materials.push({
                name: 'Брус 50х40-50х3000',
                value: selfcost.packagingMaterials['Брус 50х40-50х3000'].salePrices[0].value * ((height * 2 * 1.1 + width * 2 * 1.05) * 0.1 * 0.025),
                string: `dupa`,
                formula: 'dupa'
            })
            result.works.push({
                name: 'Работы',
                value: (selfcost.pricesAndCoefs['Зар.плата плотника'] * 1.395 / 168 + selfcost.pricesAndCoefs['Сделка упаковка'] * 1.1) * 0.95,
                string: `bupa`,
                formula: 'bupa'
            })
        break
        case 3:
            name = `Стандартный Короб`
            result.materials.push({
                name: 'Доска 25х100х3000',
                value: selfcost.packagingMaterials['Доска 25х100х3000'].salePrices[0].value * ((height * 4 * 1.1) * 0.1 * 0.025),
                string: `${selfcost.packagingMaterials['Доска 25х100х3000'].salePrices[0].value} * ${((height * 6 * 1.1 + width * 2 * 1.05) * 0.1 * 0.025)}`,
                formula: 'pupa'
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].salePrices[0].value * (Math.ceil(height * 4 * 1.1* 5)),
                string: `dupa`,
                formula: 'dupa'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].salePrices[0].value * ((Math.max(height, width) < 1700 && Math.min(height, width) < 1300) ? 1 : 2),
                string: `lupa`,
                formula: 'lupa'
            })
            result.materials.push({
                name: 'Брус 50х40-50х3000',
                value: selfcost.packagingMaterials['Брус 50х40-50х3000'].salePrices[0].value * ((height * 2 * 1.1 + width * 2 * 1.05) * 0.1 * 0.025),
                string: `dupa`,
                formula: 'dupa'
            })
            result.works.push({
                name: 'Работы',
                value: (selfcost.pricesAndCoefs['Зар.плата плотника'] * 1.395 / 168 + selfcost.pricesAndCoefs['Сделка упаковка'] * 1.1) * 0.95,
                string: `bupa`,
                formula: 'bupa'
            })
        break
        case 4:

        break
    }
    let materialsandworks = 0
    for (const item of Object.values(result.materials)) 
        materialsandworks += item.value
    for (const item of Object.values(result.works)) 
        materialsandworks += item.value
    const workshopExpenses = materialsandworks * selfcost.pricesAndCoefs[`% цеховых расходов`]   // % цеховых расходов
    const commercialExpenses = (materialsandworks + workshopExpenses) * selfcost.pricesAndCoefs[`% коммерческих расходов`] // % коммерческих расходов
    const householdExpenses =  (materialsandworks + workshopExpenses) * selfcost.pricesAndCoefs[`% общехозяйственных расходов`] // % общехозяйственных расходов
    result.expenses.push({
        name: 'Цеховые расходы',
        value: workshopExpenses,
        string: `${(materialsandworks / 100).toFixed(2)} * ${selfcost.pricesAndCoefs[`% цеховых расходов`]}`,
        formula: `Материалы + работы * % цеховых расходов`
    })
    result.expenses.push({
        name: 'Коммерческие расходы',
        value: commercialExpenses,
        string: `(${(materialsandworks / 100).toFixed(2)} + ${(workshopExpenses / 100).toFixed(2)}) * ${selfcost.pricesAndCoefs[`% коммерческих расходов`]}`,
        formula: `(Материалы + Работы + Цеховые) * % коммерческих расходов}`
    })
    result.expenses.push({
        name: 'Общехозяйственные расходы',
        value: householdExpenses,
        string: `(${(materialsandworks / 100).toFixed(2)} + ${(workshopExpenses / 100).toFixed(2)}) * ${selfcost.pricesAndCoefs[`% общехозяйственных расходов`]}`,
        formula: `(Материалы + Работы + Цеховые) * % общехозяйственных расходов`
    })
    const price = (materialsandworks + commercialExpenses + householdExpenses + workshopExpenses) * selfcost.pricesAndCoefs[`Коэф-нт прибыли упаковка`]
    result.finalPrice = {
        name: 'Итоговая цена',
        string: `(${(materialsandworks / 100).toFixed(2)} + ${((commercialExpenses + householdExpenses + workshopExpenses) / 100).toFixed(2)}) * ${selfcost.pricesAndCoefs[`Коэф-нт прибыли упаковка`]}`,
        formula: `(Материалы и Работы + Расходы) * Коэф-нт прибыли упаковка`,
        value: price
    }
    return {
        key: Date.now(),
        name,
        price,
        added: false,
        initialData: temp,
        quantity: Math.ceil(temp.weight / selfcost.pricesAndCoefs[`Вес, входящий в стандартный ящик 100`]),
        result
    }
}


function getPackagingType({ smd, weight, count }) {
    if (weight > 120) 
    return smd ? 4 : 3
    return count <= 2 ? 1 : 2
}

export default packaging