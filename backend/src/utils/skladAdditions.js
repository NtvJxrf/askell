import Client from './got.js'
import SkladService from '../services/sklad.service.js'
import Coefs from '../databases/models/sklad/coefs.model.js'
import Prices from '../databases/models/sklad/prices.mode.js'
import WorkPrices from '../databases/models/sklad/workPrices.model.js'
import { dictionary } from '../services/sklad.service.js'
import ApiError from './apiError.js'
import logger from './logger.js'
import ProcessingPlansSmd from '../databases/models/sklad/processingPlansSmd.js'
export const getMaterials = async () => {
    let materials = {}
    const promises = []
    promises.push(fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Матированное стекло (Matelux);pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Осветленное стекло;pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Простое стекло;pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Рифленое стекло;pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Стекло Stopsol и Зеркало;pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/Цветное стекло&expand=buyPrice.currency"))
    promises.push(fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.04 Пленка EVA/Пленка EVA прозрачная;pathName=0 Закупки/0.02.04 Пленка EVA/Плёнки декоративные и цветные&expand=buyPrice.currency"))
    promises.push(fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.02 Керамика/LAMINAM;pathName=0 Закупки/0.02.02 Керамика/ДЕГОН Стандарт&expand=buyPrice.currency"))
    promises.push(fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/Материалы для стеклопакетов&expand=buyPrice.currency"))
    promises.push(fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=code=1060964;code=11111599&expand=buyPrice.currency"))//Пятак, смола
    const results = await Promise.all(promises)
    for(const result of results){
        for(const material of result){
            const res = {
                meta: material.meta,
                value: convertPrice(material.buyPrice),
                calcValue: material.salePrices.find(el => el.priceType.name == 'Цена для расчёта в калькуляторе').value / 100
            }
            if(material.name.toLowerCase()?.includes('плита')){
                const l = material?.attributes?.find(el => el.name === 'Длина в мм')?.value
                const w = material?.attributes?.find(el => el.name === 'Ширина в мм')?.value
                res.l = +l || 0,
                res.w = +w || 0
            }
            materials[material.name] = res
        }
    }
    SkladService.selfcost.materials = materials
    SkladService.selfcost.updates['Материалы'] = {
        key: 'materials',
        date: Date.now()
    }
}
export const getPackagingMaterials = async () => {
    const response = await fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.09 Упаковка&expand=buyPrice.currency")
    SkladService.selfcost.packagingMaterials = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            value: convertPrice(curr.buyPrice)
        }
        return acc
    }, {})
    SkladService.selfcost.updates['Упаковочные материалы'] = {
        key: 'packaging',
        date: Date.now()
    }
}
export const getProcessingStages = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingstage')
    dictionary.processingstages = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
    SkladService.selfcost.updates['Техпроцессы'] = {
        key: 'processingStages',
        date: Date.now()
    }
}
export const getStores = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/store')
    dictionary.stores = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
    SkladService.selfcost.updates['Склады'] = {
        key: 'stores',
        date: Date.now()
    }
}
export const getUnders = async () => {
    const response = await fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=Керагласс товары и полуфабрикаты/Подстолья&expand=buyPrice.currency")
    SkladService.selfcost.unders = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            value: convertPrice(curr.buyPrice)
        }
        return acc
    }, {})
    SkladService.selfcost.updates['Подстолья'] = {
        key: 'unders',
        date: Date.now()
    }
}
export const getColors = async () => {
    const response = await fetchAllRows("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=ТЕСТ/Цвета RAL (Только для продажи)&expand=buyPrice.currency")
    SkladService.selfcost.colors = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            value: convertPrice(curr.buyPrice)
        }
        return acc
    }, {})
    SkladService.selfcost.updates['Цвета'] = {
        key: 'colors',
        date: Date.now()
    }
}
export const getCurrency = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/currency/')
    dictionary.currencies = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
        }
        return acc
    }, {})
    SkladService.selfcost.updates['Валюты'] = {
        key: 'currencies',
        date: Date.now()
    }
}
export const getPriceTypes = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/context/companysettings/pricetype')
    dictionary.priceTypes = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
        }
        return acc
    }, {})
    SkladService.selfcost.updates['Типы цен'] = {
        key: 'priceTypes',
        date: Date.now()
    }
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
        pricesAndCoefs[el.name] = {ratePerHour: el.ratePerHour, costOfWork: el.costOfWork, salary: el.salary, place: el.place}
    })
    SkladService.selfcost.pricesAndCoefs = pricesAndCoefs
    SkladService.selfcost.updates['Цены и коэффиценты'] = {
        key: 'pricing',
        date: Date.now()
    }
}
export const getAttributes = async () => {
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
    SkladService.selfcost.updates['Атрибуты'] = {
        key: 'attributes',
        date: Date.now()
    }
}
export const getProcessingPlansSmd = async () => {
  const filters = [
    'askell standart',
    'askell lux',
    'askell krystal',
    'askell krystall',
    'askell premium',
    'askell acoustic',
    'askell mobile',
    'askell flipchart',
    'askell multiwall',
    'askell wave',
    'askell hexagon',
    'askell triangle',
    'askell long',
    'askell twirl',
    'askell video'
  ];

  const urls = filters.map((name) => `https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~${name}&expand=products.assortment`);

  const promises = urls.map((url) => fetchAllRows(url));
  const result = await Promise.all(promises);

  const allPlans = [];

  for (const group of result) {
    for (const el of group) {
      const name = el.products?.rows?.[0]?.assortment?.name;
      const meta = el.meta;

      if (name && meta) {
        allPlans.push({ name, meta });
      }
    }
  }

  await ProcessingPlansSmd.destroy({ where: {} });

  await ProcessingPlansSmd.bulkCreate(allPlans);

  dictionary.smdPlans = Object.fromEntries(
    allPlans.map((plan) => [plan.name, { meta: plan.meta }])
  );
  SkladService.selfcost.updates['Техкарты для смд'] = {
    key: 'smdPlans',
    date: Date.now(),
  };
};
let lastUpdate = 0
export const initSkladAdditions = async () => {
    if (lastUpdate !== 0 && Date.now() - lastUpdate < 300_000) throw new ApiError(404, 'Only one update per 5 minutes')
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
    promises.push(getCurrency())
    promises.push(getPriceTypes())
    const res = await Promise.allSettled(promises)
    console.log(res)
    console.log('all dependencies loaded')
}
const convertPrice = (price, ) => {
    return +(price.value / 100 * price.currency.rate).toFixed(2) || 0
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
        logger.error('initSkladAdditions error:', err)
    }
}, 3_600_000)//Каждый час