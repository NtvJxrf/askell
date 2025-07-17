import Client from './got.js'
import SkladService from '../services/sklad.service.js'
import Coefs from '../databases/models/sklad/coefs.model.js'
import Prices from '../databases/models/sklad/prices.mode.js'
import WorkPrices from '../databases/models/sklad/workPrices.model.js'
import { dictionary } from '../services/sklad.service.js'
import ApiError from './apiError.js'
const updates = {}
const getMaterials = async () => {
    let materials = {}
    const promises = []
    promises.push(fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Матированное стекло (Matelux);pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Осветленное стекло;pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Простое стекло;pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Рифленое стекло;pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Стекло Stopsol и Зеркало;pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Цветное стекло&expand=salePrices.currency"))
    promises.push(fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.04 Пленка EVA/Пленка EVA прозрачная;pathName=0 Закупки/0.02.04 Пленка EVA/Плёнки декоративные и цветные&expand=salePrices.currency"))
    promises.push(fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.02 Керамика/LAMINAM;pathName=0 Закупки/0.02.02 Керамика/ДЕГОН Стандарт&expand=salePrices.currency"))
    promises.push(fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/Материалы для стеклопакетов&expand=salePrices.currency"))
    const results = await Promise.all(promises)
    for(const result of results){
        for(const material of result){
            materials[material.name] = {
                meta: material.meta,
                value: convertPrice(material.salePrices[0])
            }
        }
    }
    SkladService.selfcost.materials = materials
    updates['Материалы'] = Date.now()
}
const getPackagingMaterials = async () => {
    const response = await fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.09 Упаковка&expand=salePrices.currency")
    SkladService.selfcost.packagingMaterials = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            value: convertPrice(curr.salePrices[0])
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
    const response = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=Керагласс товары и полуфабрикаты/Подстолья")
    SkladService.selfcost.unders = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
    updates['Подстолья'] = Date.now()
}
const getColors = async () => {
    const response = await fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=ТЕСТ/Цвета RAL (Только для продажи)&expand=salePrices.currency")
    SkladService.selfcost.colors = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            value: convertPrice(curr.salePrices[0])
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
        pricesAndCoefs[el.name] = {ratePerHour: el.ratePerHour, costOfWork: el.costOfWork, salary: el.salary}
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
    if (lastUpdate !== 0 && Date.now() - lastUpdate < 300_000) throw new ApiError(404, 'Only one update per 5 minutes')
    lastUpdate = Date.now()
    const promises = []
    // promises.push(getProcessingPlansSmd())
    promises.push(getMaterials())
    promises.push(getProcessingStages())
    promises.push(getStores())
    promises.push(getAttributes())
    promises.push(getUnders())
    promises.push(getColors())
    promises.push(getPicesAndCoefs())
    promises.push(getPackagingMaterials())
    await Promise.allSettled(promises)
    SkladService.selfcost.updates = updates
    console.log('all dependencies loaded')
}
const convertPrice = (price) => {
    return +(price.value / 100 * price.currency.rate).toFixed(2)
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


setInterval(async () => {
    try {
        await initSkladAdditions()
    } catch (err) {
        console.error('initSkladAdditions error:', err)
    }
}, 3_600_000)