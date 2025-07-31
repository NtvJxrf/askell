import store from "../../../store.js"
import { constructExpenses } from "./triplexCalc.js"
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
        errors: [],
        warnings: []
    }
    let name = ''
    const larger = Math.max(temp.maxHeight, temp.maxWidth)
    const lesser = Math.min(temp.maxHeight, temp.maxWidth)
    let plankCount = 0
    switch (packagingType) {
        case 1:
            name = `Стандартный ящик 100`
            plankCount = Math.max(larger, lesser) * 0.006 + Math.min(larger, lesser) * 0.002
            result.materials.push({
                name: 'Доска 25х100х3000',
                value: selfcost.packagingMaterials['Доска 25х100х3000'].value * (plankCount / 3),
                string: `${selfcost.packagingMaterials['Доска 25х100х3000'].value} * ${(plankCount / 3).toFixed(2)}`,
                formula: 'Себестоимость * Количество'
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value * plankCount * 5,
                string: `${selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value} * ${plankCount * 5}`,
                formula: 'Себестоимость * Количество досок * 5'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value * Math.ceil(larger * lesser / 1000000 * 2 / 4.59),
                string: `${selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value} * ${Math.ceil(larger * lesser / 1000000 * 2 / 4.59)}`,
                formula: 'Себестоимость * Количество'
            })
            result.works.push({
                name: 'Работы',
                value: (selfcost.pricesAndCoefs['Зар.плата плотника'] * 1.395 / 168 + selfcost.pricesAndCoefs['Сделка упаковка'] * 1.1) * 0.833,
                string: `(${selfcost.pricesAndCoefs['Зар.плата плотника'] } * 1.395 / 168 + ${selfcost.pricesAndCoefs['Сделка упаковка'] } * 1.1) * 0.833`,
                formula: `(Зар.плата плотника * 1.395 / 168 + Сделка упаковка * 1.1) * 0.833`
            })
        break
        case 2:
            name = `Стандартный ящик 50`
            plankCount = (Math.max(larger, lesser) * 0.006 + Math.min(larger, lesser) * 0.002) - ((larger * 0.001 + lesser * 0.001) * 2)
            result.materials.push({
                name: 'Доска 25х100х3000',
                value: selfcost.packagingMaterials['Доска 25х100х3000'].value * (plankCount / 3),
                string: `${selfcost.packagingMaterials['Доска 25х100х3000'].value } * ${(plankCount / 3)}`,
                formula: `Себестоимость * Количество`
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value * plankCount * 5,
                string: `${selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value } * Количество досок * 5`,
                formula: 'Себестоимость * Количество досок * 5'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value * Math.ceil(larger * lesser / 1000000 * 2 / 4.59),
                string: `${(selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value) } * ${Math.ceil(larger * lesser / 1000000 * 2 / 4.59)}`,
                formula: 'Себестоимость * Количество'
            })
            result.materials.push({
                name: 'Брус 50х40-50х3000',
                value: (selfcost.packagingMaterials['Брус 50х40-50х3000'].value / 3) * (((larger + lesser + 100) / 1000) * 2),
                string: `(${selfcost.packagingMaterials['Брус 50х40-50х3000'].value } / 3) * ${((larger + lesser + 100) / 1000) * 2}`,
                formula: '(Себестоимость за шт / 3) * Количество'
            })
            result.works.push({
                name: 'Работы',
                value: (selfcost.pricesAndCoefs['Зар.плата плотника'] * 1.395 / 168 + selfcost.pricesAndCoefs['Сделка упаковка'] * 1.1) * 0.95,
                string: `(${selfcost.pricesAndCoefs['Зар.плата плотника'] } * 1.395 / 168 + ${selfcost.pricesAndCoefs['Сделка упаковка'] } * 1.1) * 0.95`,
                formula: `(Зар.плата плотника * 1.395 / 168 + Сделка упаковка * 1.1) * 0.95`
            })
        break
        case 3:
            name = `Стандартный Короб`
            plankCount = 4 * Math.min(larger, lesser) / 1000 + 6 * Math.max(larger, lesser) / 1000 + (Math.ceil(Math.min(larger, lesser) / 100) * 0.6 * Math.max(larger, lesser) / 1000)

            result.materials.push({
                name: 'Доска 25х100х3000',
                value: selfcost.packagingMaterials['Доска 25х100х3000'].value * plankCount / 3,
                string: `${selfcost.packagingMaterials['Доска 25х100х3000'].value} * ${(plankCount / 3).toFixed(2)}`,
                formula: `Себестоимость * Количество`
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value * plankCount * 6,
                string: `${selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value} * ${plankCount} * 6`,
                formula: 'Себестоимость * Количество досок * 6'
            })
            result.materials.push({
                name: 'ДВП 3,2*1700*2745',
                value: selfcost.packagingMaterials['ДВП 3,2*1700*2745'].value * Math.ceil(larger * lesser / 1000000 / 4.59),
                string: `Себестоимость * ${Math.ceil(larger * lesser / 1000000 / 4.59)}`,
                formula: 'Себестоимость * Количество'
            })
            result.materials.push({
                name: 'Брус 50х40-50х3000',
                value: selfcost.packagingMaterials['Брус 50х40-50х3000'].value / 3 * Math.min(larger, lesser) / 1000 + 0.6,
                string: `${selfcost.packagingMaterials['Брус 50х40-50х3000'].value} / 3 * ${Math.min(larger, lesser) / 1000 + 0.6}`,
                formula: '(Себестоимость за шт / 3) * Количество'
            })
            result.works.push({
                name: 'Работы',
                value: (selfcost.pricesAndCoefs['Зар.плата плотника'] * 1.395 / 168 + selfcost.pricesAndCoefs['Сделка упаковка'] * 1.1) * 0.95,
                string: `(${selfcost.pricesAndCoefs['Зар.плата плотника'] } * 1.395 / 168 + ${selfcost.pricesAndCoefs['Сделка упаковка'] } * 1.1) * 0.95`,
                formula: `(Зар.плата плотника * 1.395 / 168 + Сделка упаковка * 1.1) * 0.95`
            })  
        break   
        case 4:
            name = `Короб для отгрузки СМД`
            plankCount = (Math.min(larger, lesser)/1000) * (4 + 0.6 * Math.ceil(Math.min(larger, lesser) / 100)) + (Math.max(larger, lesser)/1000) * 6
            result.materials.push({
                name: 'Доска 25х150х3000',
                value: selfcost.packagingMaterials['Доска 25х150х3000'].value * 12,
                string: `${selfcost.packagingMaterials['Доска 25х150х3000'].value} * ${12}`,
                formula: 'Себестоимость * 12'
            })
            result.materials.push({
                name: 'Саморез по дереву 4,2х75',
                value: selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value * 48,
                string: `${selfcost.packagingMaterials['Саморез по дереву 4,2х75'].value } * 48`,
                formula: 'Себестоимость * 48'
            })
            result.materials.push({
                name: 'Саморез по дереву 3,5х51',
                value: selfcost.packagingMaterials['Саморез по дереву 3,5х51'].value * 63,
                string: `${selfcost.packagingMaterials['Саморез по дереву 3,5х51'].value } * 63`,
                formula: 'Себестоимость * 63'
            })
            result.materials.push({
                name: 'Брус 50х40-50х3000',
                value: selfcost.packagingMaterials['Брус 50х40-50х3000'].value / 3 * 4,
                string: `${selfcost.packagingMaterials['Брус 50х40-50х3000'].value} / 3 * 4`,
                formula: '(Себестоимость за шт / 3) * 4'
            })
            result.works.push({
                name: 'Работы',
                value: (selfcost.pricesAndCoefs['Зар.плата плотника'] * 1.395 / 168 + selfcost.pricesAndCoefs['Сделка упаковка'] * 1.1) * 2.117,
                string: `(${selfcost.pricesAndCoefs['Зар.плата плотника'] } * 1.395 / 168 + ${selfcost.pricesAndCoefs['Сделка упаковка'] } * 1.1) * 2.117`,
                formula: `(Зар.плата плотника * 1.395 / 168 + Сделка упаковка * 1.1) * 2.117`
            }) 
        break
    }
    let materialsandworks = 0
    for (const item of Object.values(result.materials))
        materialsandworks += item.value
    for (const item of Object.values(result.works))
        materialsandworks += item.value
    const price = materialsandworks * selfcost.pricesAndCoefs[`Коэф-нт прибыли упаковка`]
    result.finalPrice = [{
        name: 'Себестоимость',
        value: materialsandworks,
        string: `${(materialsandworks).toFixed(2)}`,
        formula: `(Материалы и работы) + Расходы`
    },{
        name: 'Наценка',
        value: selfcost.pricesAndCoefs[`Коэф-нт прибыли упаковка`],
        string: selfcost.pricesAndCoefs[`Коэф-нт прибыли упаковка`],
        formula: `Наценка для типа клиента ${selfcost.pricesAndCoefs[`Коэф-нт прибыли упаковка`]}`
    }]

    return {
        key: crypto.randomUUID(),
        name,
        price,
        added: false,
        initialData: temp,
        quantity: Math.ceil(temp.weight / selfcost.pricesAndCoefs[`Вес, входящий в ${name}`]),
        result
    }
}


function getPackagingType({ smd, weight, count }) {
    if (weight > 120) 
    return smd ? 4 : 3
    return count <= 2 ? 1 : 2
}

export default packaging