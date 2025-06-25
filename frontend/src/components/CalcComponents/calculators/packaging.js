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
    const larger = Math.max(temp.maxHeight, temp.maxWidth)
    const lesser = Math.min(temp.maxHeight, temp.maxWidth)
    switch (packagingType) {
        case 1:
            name = `Стандартный ящик 100`
            result.materials.push({
                name: 'Доска 25х100х3000',
                value: selfcost.packagingMaterials['Доска 25х100х3000'].value * ((larger * 0.006 + lesser * 0.002) / 3),
                string: `${(selfcost.packagingMaterials['Доска 25х100х3000'].value / 100)} * ${((larger * 0.006 + lesser * 0.002) / 3).toFixed(2)}`,
                formula: 'Себестоимость * ((Большая сторона * 0.006 + Меньшая сторона * 0.002) / 3)'
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value * (larger * 0.006 + lesser * 0.002) * 5,
                string: `${(selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value / 100)} * ${(larger * 0.006 + lesser * 0.002) * 5}`,
                formula: 'Себестоимость * ((Большая сторона * 0.006 + Меньшая сторона * 0.002) * 5)'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value * Math.ceil(larger * lesser / 1000000 * 2 / 4.59),
                string: `${(selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value) / 100} * ${Math.ceil(larger * lesser / 1000000 * 2 / 4.59)}`,
                formula: 'Себестоимость * Округление вверх(Большая сторона * меньшую сторону / 1000000 * 2 / 4.59)'
            })
            result.works.push({
                name: 'Работы',
                value: (selfcost.pricesAndCoefs['Зар.плата плотника'] * 1.395 / 168 + selfcost.pricesAndCoefs['Сделка упаковка'] * 1.1) * 0.833,
                string: `(${selfcost.pricesAndCoefs['Зар.плата плотника'] / 100} * 1.395 / 168 + ${selfcost.pricesAndCoefs['Сделка упаковка'] / 100} * 1.1) * 0.833`,
                formula: `(Зар.плата плотника * 1.395 / 168 + Сделка упаковка * 1.1) * 0.833`
            })
        break
        case 2:
            name = `Стандартный ящик 50`
            result.materials.push({
                name: 'Доска 25х100х3000',
                value: selfcost.packagingMaterials['Доска 25х100х3000'].value * (((larger * 0.006 + lesser * 0.002) - ((larger * 0.001 + lesser * 0.001) * 2)) / 3),
                string: `${selfcost.packagingMaterials['Доска 25х100х3000'].value / 100} * ((${larger} - ${lesser}) * 0.004 / 3)`,
                formula: `Себестоимость * ((Большая сторона - Меньшая сторона) * 0.004 / 3)`
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value * ((larger * 0.006 + lesser * 0.002) - ((larger * 0.001 + lesser * 0.001) * 2)) * 5,
                string: `${selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value / 100} * (${larger} - ${lesser}) * 0.004 * 5`,
                formula: 'Себестоимость * ((Большая сторона - Меньшая сторона) * 0.004 * 5)'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value * Math.ceil(larger * lesser / 1000000 * 2 / 4.59),
                string: `${(selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value) / 100} * ${Math.ceil(larger * lesser / 1000000 * 2 / 4.59)}`,
                formula: 'Себестоимость * Округление вверх(Большая сторона * меньшую сторону / 1000000 * 2 / 4.59)'
            })
            result.materials.push({
                name: 'Брус 50х40-50х3000',
                value: (selfcost.packagingMaterials['Брус 50х40-50х3000'].value / 3) * (((larger + lesser + 100) / 1000) * 2),
                string: `(${selfcost.packagingMaterials['Брус 50х40-50х3000'].value / 100} / 3) * (((${larger} + ${lesser} + 100) / 1000) * 2)`,
                formula: '(Себестоимость за шт / 3) * (((Большая сторона + Меньшая сторона + 100) / 1000) * 2)'
            })
            result.works.push({
                name: 'Работы',
                value: (selfcost.pricesAndCoefs['Зар.плата плотника'] * 1.395 / 168 + selfcost.pricesAndCoefs['Сделка упаковка'] * 1.1) * 0.95,
                string: `(${selfcost.pricesAndCoefs['Зар.плата плотника'] / 100} * 1.395 / 168 + ${selfcost.pricesAndCoefs['Сделка упаковка'] / 100} * 1.1) * 0.95`,
                formula: `(Зар.плата плотника * 1.395 / 168 + Сделка упаковка * 1.1) * 0.95`
            })
        break
        case 3:
            name = `Стандартный Короб`
            result.materials.push({
                name: 'Доска 25х100х3000',
                value: selfcost.packagingMaterials['Доска 25х100х3000'].value * ((4 * lesser + 6 * larger + Math.ceil(lesser / 100) * 0.6 * larger) / 1000),
                string: `${selfcost.packagingMaterials['Доска 25х100х3000'].value} * ${((4 * lesser + 6 * larger + Math.ceil(lesser / 100) * 0.6 * larger) / 1000)}`,
                formula: 'pupa'
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value * (Math.ceil(height * 6 * width * 4)),
                string: `dupa`,
                formula: 'dupa'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value * ((Math.max(height, width) < 1700 && Math.min(height, width) < 1300) ? 1 : 2),
                string: `lupa`,
                formula: 'lupa'
            })
            result.materials.push({
                name: 'Брус 50х40-50х3000',
                value: selfcost.packagingMaterials['Брус 50х40-50х3000'].value * ((width + 0.6) * Math.ceil(height) * 0.0025),
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
            name = `Короб для отгрузки СМД`
            result.materials.push({
                name: 'Доска 25х150х3000',
                value: selfcost.packagingMaterials['Доска 25х150х3000'].value * ((Math.round(height * 6 + width * 4) + Math.ceil(width * 10 * 0.6 * height)) * 0.1 * 0.025),
                string: `${selfcost.packagingMaterials['Доска 25х150х3000'].value} * ${((Math.round(height * 6 + width * 4) + Math.ceil(width * 10 * 0.6 * height)) * 0.1 * 0.025)}`,
                formula: 'pupa'
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value * (Math.ceil(height * 6 * width * 4)),
                string: `dupa`,
                formula: 'dupa'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value * ((Math.max(height, width) < 1700 && Math.min(height, width) < 1300) ? 1 : 2),
                string: `lupa`,
                formula: 'lupa'
            })
            result.materials.push({
                name: 'Брус 50х40-50х3000',
                value: selfcost.packagingMaterials['Брус 50х40-50х3000'].value * ((width + 0.6) * Math.ceil(height) * 0.0025),
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
        formula: `(Материалы + работы) * % цеховых расходов`
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