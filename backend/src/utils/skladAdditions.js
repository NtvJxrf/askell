import Client from './got.js'
import SkladService from '../services/sklad.service.js'
import PricesAndCoefs from '../databases/models/sklad/pricesAndCoefs.model.js'
import { dictionary } from '../services/sklad.service.js'
const updates = {}
const getMaterials = async () => {
    let materials = {}
    const promises = []
    promises.push(Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Матированное%20стекло%20(Matelux);pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Осветленное%20стекло;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Простое%20стекло;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Рифленое%20стекло;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Стекло%20Stopsol%20и%20Зеркало;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Цветное%20стекло"))
    promises.push(Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0%20Закупки/0.02.04%20Пленка%20EVA/Пленка%20EVA%20прозрачная;pathName=0%20Закупки/0.02.04%20Пленка%20EVA/Плёнки%20декоративные%20и%20цветные"))
    promises.push(Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0%20Закупки/0.02.02%20Керамика/LAMINAM;pathName=0%20Закупки/0.02.02%20Керамика/ДЕГОН%20Стандарт"))
    const results = await Promise.all(promises)

    for(const result of results){
        for(const material of result.rows){
            materials[material.name] = {
                meta: material.meta,
                name: material.name,
                salePrices: material.salePrices,
            }
        }
    }
    SkladService.selfcost.materials = materials
    updates['Материалы'] = Date.now()
}
const getProcessingStages = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingstage')
    dictionary.processingstages = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
    updates['Техпроцессы'] = Date.now()
}
const getStores = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/store')
    dictionary.stores = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
    updates['Склады'] = Date.now()
}
const getProcuctAttributes = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes')
    dictionary.productAttributes = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
    updates['Атрибуты товаров'] = Date.now()
}
const getUnders = async () => {
    const response = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=Керагласс%20товары%20и%20полуфабрикаты/Подстолья")
    SkladService.selfcost.unders = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
    updates['Подстолья'] = Date.now()
}
const getColors = async () => {
    const response = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=ТЕСТ/Цвета%20RAL%20(Только%20для%20продажи)")
    SkladService.selfcost.colors = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            salePrices: curr.salePrices
        }
        return acc
    }, {})
    updates['Цвета'] = Date.now()
}
export const getPicesAndCoefs = async () => {
    const elements = await PricesAndCoefs.findAll()
    SkladService.selfcost.pricesAndCoefs = elements.reduce((acc, curr) => {
        acc[curr.name] = curr.value
        return acc
    }, {})
    updates['Цены и коэффиценты'] = Date.now()
}

export const initSkladAdditions = async () => {
    const promises = []
    promises.push(getMaterials())
    promises.push(getProcessingStages())
    promises.push(getStores())
    promises.push(getProcuctAttributes())
    promises.push(getUnders())
    promises.push(getColors())
    promises.push(getPicesAndCoefs())
    await Promise.all(promises)
    SkladService.selfcost.updates = updates
}

setInterval(() => {
    initSkladAdditions()
}, 3_600_000);