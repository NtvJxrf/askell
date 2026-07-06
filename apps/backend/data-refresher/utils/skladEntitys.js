import { broker } from "../index.js";
import { valkey } from "@askell/shared"

export const getMaterials = async () => {
    let materials = {}
    const promises = []
    const basePath = `pathName=0 Закупки/0.02.03 Стекло/Материал от поставщиков, Стекло/`
    const paths = [`Давальческое стекло`, `Матированное стекло (Matelux)`, `Осветленное стекло`, `Простое стекло`, `Рифленое стекло`, `Стекло Stopsol и Зеркало`, `Цветное стекло`, `Мультифункциональное стекло`, `Энергосберегающее стекло`].reduce((acc, curr) => {
        acc += basePath + curr + ';'
        return acc
    }, '')
    promises.push(broker.call('proxy.fetchAllRows', {url: `https://api.moysklad.ru/api/remap/1.2/entity/product?filter=${paths}&expand=buyPrice.currency,salePrices.currency`}))
    promises.push(broker.call('proxy.fetchAllRows', {url: "https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.04 Пленка EVA/Пленка EVA прозрачная;pathName=0 Закупки/0.02.04 Пленка EVA/Плёнки декоративные и цветные&expand=buyPrice.currency,salePrices.currency"}))
    promises.push(broker.call('proxy.fetchAllRows', {url: "https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.02 Керамика/LAMINAM;pathName=0 Закупки/0.02.02 Керамика/ДЕГОН Стандарт&expand=buyPrice.currency,salePrices.currency"}))
    promises.push(broker.call('proxy.fetchAllRows', {url: "https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/Материалы для стеклопакетов&expand=buyPrice.currency,salePrices.currency"}))
    promises.push(broker.call('proxy.fetchAllRows', {url: "https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/Материалы для дверей&expand=buyPrice.currency,salePrices.currency"}))
    promises.push(broker.call('proxy.fetchAllRows', {url: "https://api.moysklad.ru/api/remap/1.2/entity/product?filter=code=1060964;code=11111599;code=888000063044&expand=buyPrice.currency"}))//Пятак, смола, аргон
    const results = await Promise.all(promises)
    for(const result of results){
        for(const material of result){
            const res = {
                meta: material.meta,
                id: material.id,
                value: convertPrice(material.buyPrice),
                calcValue: convertPrice(material.salePrices.find(el => el.priceType.name == 'Цена для расчёта в калькуляторе')),
                objectValue: convertPrice(material.salePrices.find(el => el.priceType.name == 'Цена для коммерческих объектов'))
            }

            const sizes = material.attributes?.find(el => el.name === 'Детали')?.value
            if(sizes){
                const obj = JSON.parse(sizes)
                res.sizes = obj
            }
            materials[material.name] = res
        }
    }
    await valkey.set('sklad:data:materials', JSON.stringify(materials))
    await valkey.set('sklad:updates:materials', Date.now());
    await broker.emit('dataUpdated', 'materials')
}
export const getStock = async () => {
    const stock = await broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/report/stock/bystore/current'})
    const result = stock.reduce(( acc, curr ) => {
        acc[curr.assortmentId] ??= {}
        acc[curr.assortmentId].total ??= 0
        acc[curr.assortmentId].total += curr.stock
        acc[curr.assortmentId][curr.storeId] = curr.stock
        return acc
    }, {})
    await valkey.set('sklad:data:stock', JSON.stringify(result))
    await valkey.set('sklad:updates:stock', Date.now());
    await broker.emit('dataUpdated', 'stock')
}
export const getProcessingStages = async () => {
    const response = await broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/processingstage'})
    const result = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            name: curr.name,
        }
        return acc
    }, {})
    await valkey.set('sklad:data:processingStages', JSON.stringify(result))
    await valkey.set('sklad:updates:processingStages', Date.now());
    await broker.emit('dataUpdated', 'processingStages')
}
export const getPackagingMaterials = async () => {
    const response = await broker.call('proxy.fetchAllRows', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0 Закупки/0.02.09 Упаковка&expand=buyPrice.currency'})
    const result = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            name: curr.name,
            value: convertPrice(curr.buyPrice)
        }
        return acc
    }, {})
    await valkey.set('sklad:data:packaging', JSON.stringify(result))
    await valkey.set('sklad:updates:packaging', Date.now());
    await broker.emit('dataUpdated', 'packaging')
}
export const getStores = async () => {
    const response = await broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/store'})
    const result = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            name: curr.name,
        }
        return acc
    }, {})
    await valkey.set('sklad:data:stores', JSON.stringify(result))
    await valkey.set('sklad:updates:stores', Date.now());
    await broker.emit('dataUpdated', 'stores')
}
export const getUnders = async () => {
    const response = await broker.call('proxy.fetchAllRows', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=Керагласс товары и полуфабрикаты/Подстолья&expand=buyPrice.currency'})
    const result = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            name: curr.name,
            value: convertPrice(curr.buyPrice)
        }
        return acc
    }, {})
    await valkey.set('sklad:data:unders', JSON.stringify(result))
    await valkey.set('sklad:updates:unders', Date.now());
    await broker.emit('dataUpdated', 'unders')
}
export const getColors = async () => {
    const response = await broker.call('proxy.fetchAllRows', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=ТЕСТ/Цвета RAL (Только для продажи)&expand=buyPrice.currency'})
    const result = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            name: curr.name,
            value: convertPrice(curr.buyPrice)
        }
        return acc
    }, {})
    await valkey.set('sklad:data:colors', JSON.stringify(result))
    await valkey.set('sklad:updates:colors', Date.now());
    await broker.emit('dataUpdated', 'colors')
}
export const getCurrency = async () => {
    const response = await broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/currency/'})
    const result = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            name: curr.name,
        }
        return acc
    }, {})
    await valkey.set('sklad:data:currencies', JSON.stringify(result))
    await valkey.set('sklad:updates:currencies', Date.now());
    await broker.emit('dataUpdated', 'currencies')
}
export const getPriceTypes = async () => {
    const response = await broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/context/companysettings/pricetype'})
    const result = response.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            name: curr.name,
        }
        return acc
    }, {})
    await valkey.set('sklad:data:priceTypes', JSON.stringify(result))
    await valkey.set('sklad:updates:priceTypes', Date.now());
    await broker.emit('dataUpdated', 'priceTypes')
}
export const getPricesAndCoefs = async () => {
    const res = await broker.call('proxy.fetchAllRows', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/customentity/e4579b8f-8e43-11f0-0a80-0049002566f8?'})
    const attrMap = {
        'Значение': 'value',
        'Норма в час': 'ratePerHour',
        'Сделка': 'costOfWork',
        'Оклад': 'salary',
        'Где выполняется': 'place',
    }
    const result = res.reduce((acc, el) => {
        if(!el.attributes) return acc
        const attrs = el.attributes.reduce((obj, curr) => {
            const mappedKey = attrMap[curr.name];
            if (mappedKey) {
                obj[mappedKey] = curr.value;
            }
            return obj;
        }, {});
        acc[el.name] = {
            meta: el.meta,
            name: el.name,
            ...attrs
        };
        return acc;
    }, {});
    await valkey.set('sklad:data:pricesAndCoefs', JSON.stringify(result))
    await valkey.set('sklad:updates:pricesAndCoefs', Date.now());
    await broker.emit('dataUpdated', 'pricesAndCoefs')
}
export const getStagesAndNorms = async () => {
    const res = await broker.call('proxy.fetchAllRows', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/customentity/a61baf1d-790e-11f1-0a80-152e00296359?'})
    const attrMap = {
        'Ед изм': 'uom',
        'Норма в час': 'ratePerHour',
        'Сделка': 'costOfWork',
        'Оклад': 'salary',
        'Где выполняется': 'place',
    }
    const result = res.reduce((acc, el) => {
        if(!el.attributes) return acc
        const attrs = el.attributes.reduce((obj, curr) => {
            const mappedKey = attrMap[curr.name];
            if (mappedKey) {
                obj[mappedKey] = curr.value;
            }
            return obj;
        }, {});
        acc[el.name] = {
            meta: el.meta,
            name: el.name,
            ...attrs
        };
        return acc;
    }, {});
    await valkey.set('sklad:data:stagesAndNorms', JSON.stringify(result))
    await valkey.set('sklad:updates:stagesAndNorms', Date.now());
    await broker.emit('dataUpdated', 'stagesAndNorms')
}
export const getAttributes = async () => {
    const promises = []
    promises.push(broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes'}))
    promises.push(broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/attributes'}))
    promises.push(broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes'}))
    const res = await Promise.all(promises)
    const product = {}
    const productiontask = {}
    const customerorder = {}
    res[0].rows.forEach( el => product[el.name] = { meta: el.meta, name: el.name })
    res[1].rows.forEach( el => productiontask[el.name] = { meta: el.meta, name: el.name })
    res[2].rows.forEach( el => customerorder[el.name] = { meta: el.meta, name: el.name })
    const result = {
        product,
        productiontask,
        customerorder
    }
    await valkey.set('sklad:data:attributes', JSON.stringify(result))
    await valkey.set('sklad:updates:attributes', Date.now());
    await broker.emit('dataUpdated', 'attributes')
}
export const getEmployees = async () => {
    const response = await broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/employee?filter=archived=true;archived=false'})
    const result = response.rows.reduce(( acc, curr ) => {
        acc[curr.id] = {
            meta: curr.meta,
            name: curr.name,
            uid: curr.uid
        }
        return acc
    }, {})
    await valkey.set('sklad:data:employees', JSON.stringify(result))
    await valkey.set('sklad:updates:employees', Date.now());
    await broker.emit('dataUpdated', 'employees')
}
export const getStates = async () => {
    const promises = []
    promises.push(broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata'}))
    promises.push(broker.call('proxy.sklad', {url: 'https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata'}))
    const res = await Promise.all(promises)
    const customerorder = {}
    const productiontask = {}
    res[0].states.forEach( el => customerorder[el.name] = { meta: el.meta, name: el.name })
    res[1].states.forEach( el => productiontask[el.name] = { meta: el.meta, name: el.name })
    const result = {
        customerorder,
        productiontask
    }
    await valkey.set('sklad:data:states', JSON.stringify(result))
    await valkey.set('sklad:updates:states', Date.now());
    await broker.emit('dataUpdated', 'states')
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
        'askell video',
        'askell watch',
        'askell round'
    ];

    const urls = filters.map((name) => `https://api.moysklad.ru/api/remap/1.2/entity/processingplan?filter=name~${name}&expand=products.assortment`);

    const promises = urls.map((url) => broker.call('proxy.sklad', { url }));
    const res = await Promise.all(promises);

    const allPlans = [];

    for (const group of res) {
        for (const el of group.rows) {
            const name = el.products?.rows?.[0]?.assortment?.name;
            const meta = el.meta;

            if (name && meta) {
                allPlans.push({ name, meta });
            }
        }
    }

    const result = Object.fromEntries(
        allPlans.map((plan) => [plan.name, { meta: plan.meta, name: plan.name }])
    );
    await valkey.set('sklad:data:smdPlans', JSON.stringify(result))
    await valkey.set('sklad:updates:smdPlans', Date.now());
    await broker.emit('dataUpdated', 'smdPlans')
};
const convertPrice = price => {
    return +(price.value / 100 * price.currency.rate).toFixed(2) || 0
}
