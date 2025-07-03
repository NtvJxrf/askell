import Client from './got.js'
import SkladService from '../services/sklad.service.js'
import Coefs from '../databases/models/sklad/coefs.model.js'
import Prices from '../databases/models/sklad/prices.mode.js'
import WorkPrices from '../databases/models/sklad/workPrices.model.js'
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
                value: material.salePrices[0].value / 100
            }
        }
    }
    SkladService.selfcost.materials = materials
    updates['Материалы'] = Date.now()
}
const getPackagingMaterials = async () => {
    const response = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0%20Закупки/0.02.09%20Упаковка")
    SkladService.selfcost.packagingMaterials = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            value: curr.salePrices[0].value / 100
        }
        return acc
    }, {})
    updates['Упаковочные материалы'] = Date.now()
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
            value: curr.salePrices[0].value / 100
        }
        return acc
    }, {})
    updates['Цвета'] = Date.now()
}
export const getPicesAndCoefs = async () => {
    const promises = []
    promises.push(Coefs.findAll())
    promises.push(Prices.findAll())
    promises.push(WorkPrices.findAll())
    const result = await Promise.all(promises)
    const pricesAndCoefs = {}
    result[0].forEach( el => {
        pricesAndCoefs[el.name] = el.value
    })
    result[1].forEach( el => {
        pricesAndCoefs[el.name] = el.value
    })
    result[2].forEach( el => {
        pricesAndCoefs[el.name] = {ratePerHour: el.ratePerHour, costOfWork: el.costOfWork}
    })
    SkladService.selfcost.pricesAndCoefs = pricesAndCoefs
    updates['Цены и коэффиценты'] = Date.now()
}
const getAttributes = async () => {
    const promises = []
    promises.push(Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes'))
    promises.push(Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/attributes'))
    const result = await Promise.all(promises)
    const productAttributes = {}
    const productiontaskAttributes = {}
    result[0].rows.forEach( el => productAttributes[el.name] = el.meta)
    result[1].rows.forEach( el => productiontaskAttributes[el.name] = el.meta)
    dictionary.productAttributes = productAttributes
    dictionary.productiontaskAttributes = productiontaskAttributes
    updates['Атрибуты'] = Date.now()
}
export const getProcessingPlansSmd = async () => {
    const promises = []
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell standart&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell lux&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell krystal&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell krystall&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell premium&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell acoustic&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell Mobile&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell Flipchart&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell Multiwall&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell wave&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell hexagon&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell triangle&expand=products.assortment`))
    promises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~askell long&expand=products.assortment`))
    const result = await Promise.all(promises)
    const plans = {}
    for(const group of result)
        group.forEach( el => plans[el.products.rows[0].assortment.name] = {meta: el.meta})
    dictionary.smdPlans = plans
    updates['Техкарты для смд'] = Date.now()
}
let lastUpdate = 0
export const initSkladAdditions = async () => {
    if(lastUpdate - Date.now() < 300_000) throw new ApiError(404, 'Only one update per 5 minutes')
    lastUpdate = Date.now()
    const promises = []
    promises.push(getMaterials())
    promises.push(getProcessingStages())
    promises.push(getStores())
    promises.push(getAttributes())
    promises.push(getUnders())
    promises.push(getColors())
    promises.push(getPicesAndCoefs())
    promises.push(getPackagingMaterials())
    promises.push(getProcessingPlansSmd())
    await Promise.allSettled(promises)
    SkladService.selfcost.updates = updates
    console.log('all dependencies loaded')
}

async function fetchAllRows(urlBase) {
  const limit = 100;
  const firstUrl = `${urlBase}&limit=${limit}&offset=0`;
  const firstResponse = await Client.sklad(firstUrl);

  if (!firstResponse.rows || firstResponse.rows.length === 0) {
    return [];
  }

  const allRows = [...firstResponse.rows];
  const totalSize = firstResponse.meta?.size || allRows.length;

  const requests = [];
  for (let offset = limit; offset < totalSize; offset += limit) {
    const url = `${urlBase}&limit=${limit}&offset=${offset}`;
    requests.push(Client.sklad(url));
  }

  const responses = await Promise.all(requests);
  for (const res of responses) {
    if (res.rows) {
      allRows.push(...res.rows);
    }
  }

  return allRows;
}


setInterval(() => {
    initSkladAdditions()
}, 3_600_000);