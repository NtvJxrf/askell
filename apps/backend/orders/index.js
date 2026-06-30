import { ServiceBroker } from "moleculer";
import { initEnv, valkey } from "@askell/shared";
import { ROLES } from "@askell/shared/roles";
import { dictionary, mapPrices, productFoldersByType, uomMeta } from './utils/constants.js'
import deleteEntitys from './utils/deleteEntitys.js'
import generateProductAttributes from './utils/generateProductAttributes.js'
const broker = new ServiceBroker({
  nodeID: "orders",
  transporter: "nats://localhost:4222",
  logger: true
});

const priceItems = [
    { key: 'gostPrice', label: 'Выше госта' },
    { key: 'retailPrice', label: 'Розница' },
    { key: 'bulkPrice', label: 'Опт' },
    { key: 'dealerPrice', label: 'Дилер' },
    { key: 'vipPrice', label: 'ВИП' },
];
const priceMap = priceItems.reduce((acc, { key, label }) => {
    acc[label] = key;
    return acc;
}, {});
const reverseMap = priceItems.reduce((acc, { key, label }) => {
    acc[key] = label;
    return acc;
}, {});

let smdPlans = JSON.parse(await valkey.get('sklad:data:smdPlans'))
let sklad_materials = JSON.parse(await valkey.get('sklad:data:materials'))
let sklad_packaging = JSON.parse(await valkey.get('sklad:data:packaging'))
let currencies = JSON.parse(await valkey.get('sklad:data:currencies'))
let stores = JSON.parse(await valkey.get('sklad:data:stores'))
let priceTypes = JSON.parse(await valkey.get('sklad:data:priceTypes'))
let processingStages = JSON.parse(await valkey.get('sklad:data:processingStages'))
let attributes = JSON.parse(await valkey.get('sklad:data:attributes'))
let colors = JSON.parse(await valkey.get('sklad:data:colors'))

broker.createService({
    name: "orders",
    actions: {
        order: {
            rest: "GET /order",
            roles: [ROLES.MANAGER],
            async handler(ctx) {
                const { name } = ctx.params;
                const orders = await broker.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${name}&expand=positions.assortment,agent,organization&limit=100`})
                const order = [...(orders.rows || [])].sort((left, right) => {
                    const leftTime = new Date(left?.moment || 0).getTime()
                    const rightTime = new Date(right?.moment || 0).getTime()
                    return rightTime - leftTime
                })[0]
                const positions = order.positions?.rows.map(p => {
                    const attrs = (p?.assortment?.attributes || []).reduce((a, x) => {
                        a[x.name] = x.value;
                        return a;
                    }, {});
                    const res = {
                        key: p.id,
                        name: p.assortment.name,
                        prices: p.assortment.salePrices.reduce((acc, curr) => {
                            acc[priceMap[curr.priceType.name]] = curr.value / 100
                            return acc
                        }, {}),
                        added: true,
                        quantity: p.quantity,
                        meta: p.assortment.meta,
                        discount: p.discount || 0,
                        price: p.price / 100, // Цена позиции в заказе в копейках, делим на 100 чтобы получить рубли на фронте
                    }
                    if(attrs['Детали']){
                        const details = JSON.parse(attrs['Детали'])
                        res.result = details.result
                        res.initialData = details.initialData
                    }
                    return res
                }) 
                const response = {
                    order: {
                        meta: order.meta,
                        id: order.id,
                        agent: order.agent.name,
                        organization: order.organization.name,
                        name: order.name,
                        moment: order.moment,
                        positions: positions.map(p => ({href: p?.meta?.href})) //Сохраняем только href, чтобы потом удалить из МС те позиции, которые в итоге не сохранили в заказ
                    },
                    positions
                }
                return response
            }
        },
        saveOrder: {
            rest: "POST /saveOrder",
            roles: [ROLES.MANAGER],
            async handler(ctx) {
                const data = ctx.params
                const order = await broker.call('proxy.sklad', {url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}?expand=state,positions.assortment`})
                if(['В работе', 'Поставлено в производство'].includes(order.state.name)) throw new Error(400, `Нельзя менять позиции у заказа который в работе, смените статус на "Карантин"`)//Кидаю ошибку чтоб не пересохраняли заказы которые уже в работе
                const positionsToSave = []
                let vizEngaged = false
                for(const pos of data.positions){
                    if(pos.result?.other?.viz) vizEngaged = true
                    if(pos.added){
                        positionsToSave.push({ 
                            assortment: { meta: pos.meta },
                            added: pos.added,
                            quantity: pos.quantity,
                            price: pos.price * 100, //При передачи заказа на фронт конвертировали все в рубли, а при сохранении обратно в копейки
                            discount: pos.discount,
                            vat: data.order.organization.name === 'ООО "А2"' ? 22 : 5
                        }) 
                    }else{
                        const isService = Boolean(pos?.result?.other?.customerSuppliedGlassForTempering);
                        const params = {
                            name: pos.name,
                            shared: false,
                            attributes: generateProductAttributes({...pos.initialData, ...pos.result.other, order: data.order, details: {initialData: pos.initialData, selfcost: pos.selfcost, result: pos.result}}, attributes, sklad_materials),
                            uom: uomMeta
                        }
                        params.salePrices = Object.entries(pos.prices).map(([key, value]) => ({value: Number((value * 100).toFixed(2)), priceType: priceTypes[mapPrices[key]], currency: currencies['руб']}));
                        params.productFolder = dictionary.productFolders.glassGuard;
                        params.minPrice = {currency: currencies['руб'], value: pos?.result?.other?.materialsandworks * 100 || 0};
                        switch (pos.result.other.type){
                            case 'Стекло': params.productFolder = productFoldersByType['Стекло']; break
                            case 'Керагласс': params.productFolder = productFoldersByType['Керагласс']; break
                            case 'Триплекс': params.productFolder = productFoldersByType['Триплекс']; break
                            case 'СМД': params.productFolder = productFoldersByType['СМД']; break
                            case 'Упаковка': params.productFolder = productFoldersByType['Упаковка']; break
                            case 'Стеклопакет': params.productFolder = productFoldersByType['Стеклопакет']; break
                        }
                        if (!isService) {
                            params.weight = Number((pos.result.other.weight).toFixed(2));
                            params.volume = Number((pos.result.other.S).toFixed(2));
                        } else {
                            params.productFolder = productFoldersByType['Услуга']
                        }
                        positionsToSave.push(
                            broker.call('proxy.sklad', {
                                url: `https://api.moysklad.ru/api/remap/1.2/entity${isService ? '/service' : '/product'}`,
                                type: "post",
                                data: params
                            }).then(result => {
                                return {
                                    assortment: { meta: result?.meta },
                                    quantity: pos.quantity,
                                    price: Number((pos.prices[data.displayPrice] * 100).toFixed(2)),
                                    discount: pos?.discount || 0,
                                    vat: data.order.organization.name === 'ООО "А2"' ? 22 : 5
                                }
                            })
                        );
                    }
                }
                const finalPositions = await Promise.all(positionsToSave)
                const deletedPositions = order?.positions?.rows?.filter(pos => !finalPositions.some(p => p?.assortment?.href === pos?.assortment?.meta?.href))
                try {
                    const params = {
                        positions: finalPositions,
                        attributes: [{
                            meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/99884b94-8f93-11f0-0a80-029a000276da","type":"attributemetadata","mediaType":"application/json"},
                            value: String(data.planDate.workingDays)
                        },{
                            meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/afc68830-5368-11f1-0a80-156a000b5f1e","type":"attributemetadata","mediaType":"application/json"},
                            value: Array.from(new Set(data.positions.map(pos => pos.result?.other?.type).filter(Boolean))).join(';')
                        }],
                        store: { meta: vizEngaged ? stores['ВИЗ СГИ'].meta : stores['Полеводство СГИ'].meta }
                    }
                    if(data.planDate.apiDate) params.deliveryPlannedMoment = data.planDate.apiDate
                    console.dir(params, {depth: null})
                    return await broker.call('proxy.sklad', {url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}`, type: "put", data: params})
                } catch(error) {
                    console.error(error, `Ошибка во время добавления позиций в заказ ${data.order.name}`)
                    // logger.error(error, `Ошибка во время добавления позиций в заказ ${data.order.name}`)
                    finalPositions && broker.call('proxy.sklad', {url: `https://api.moysklad.ru/api/remap/1.2/entity/product/delete`, type: "post", data: finalPositions.filter(el => !el.added).map(el => ({meta: el.assortment.meta}))})
                    // throw new ApiError(500, `Ошибка при добавлении позиций в заказ: ${error?.message || error}`)
                    throw new Error(`Ошибка при добавлении позиций в заказ: ${error?.message || error}`)
                } finally {
                    deleteEntitys(deletedPositions)
                }
            }
        }
    },
    events: {
        async dataUpdated(ctx) {
            switch(ctx.params.type) {
                case 'smdPlans': JSON.parse(await valkey.get('sklad:data:smdPlans')); break
                case 'materials': JSON.parse(await valkey.get('sklad:data:materials')); break
                case 'packaging': sklad_packaging = JSON.parse(await valkey.get('sklad:data:packaging')); break
                case 'currencies': currencies = JSON.parse(await valkey.get('sklad:data:currencies')); break
                case 'stores': stores = JSON.parse(await valkey.get('sklad:data:stores')); break
                case 'priceTypes': priceTypes = JSON.parse(await valkey.get('sklad:data:priceTypes')); break
                case 'processingStages': processingStages = JSON.parse(await valkey.get('sklad:data:processingStages')); break
                case 'attributes': attributes = JSON.parse(await valkey.get('sklad:data:attributes')); break
                case 'colors': colors = JSON.parse(await valkey.get('sklad:data:colors')); break
            }
        },
    }
});

broker.start();