import { Errors } from "moleculer";
import { createBroker } from "../lib/broker.js";
import { dictionary, mapPrices, productFoldersByType, uomMeta } from './utils/constants.js'
import deleteEntitys from './utils/deleteEntitys.js'
import generateProductAttributes from './utils/generateProductAttributes.js'
import { getData, refreshData } from './utils/dataManager.js'
import { createProductionTask } from './utils/createProductionTask.js'
const { MoleculerClientError, MoleculerError } = Errors;
export const broker = createBroker("sklad");

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

broker.createService({
    name: "sklad",
    actions: {
        order: {
            rest: "GET /order",
            permissions: ['Калькулятор'],
            async handler(ctx) {
                const { name } = ctx.params;
                const orders = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${name}&expand=positions.assortment,agent,organization&limit=100`, priority: true})
                const order = [...(orders.rows || [])].sort((left, right) => {
                    const leftTime = new Date(left?.moment || 0).getTime()
                    const rightTime = new Date(right?.moment || 0).getTime()
                    return rightTime - leftTime
                })[0]
                if (!order) throw new MoleculerClientError(`Заказ с номером "${name}" не найден`, 404, 'ORDER_NOT_FOUND', { name })
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
                        agent: {
                            name: order.agent.name,
                            priceType: order?.agent?.priceType?.name || 'Не установлен',
                        },
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
            permissions: ['Калькулятор'],
            async handler(ctx) {
                const { attributes, sklad_materials, currencies, priceTypes, stores } = getData()
                const data = ctx.params
                const order = await ctx.call('proxy.sklad', {url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}?expand=state,positions.assortment`, priority: true})
                if(['В работе', 'Поставлено в производство'].includes(order.state.name)) throw new MoleculerClientError(`Нельзя менять позиции у заказа который в работе, смените статус на "Карантин"`, 400, 'ORDER_IN_PROGRESS', { order: data.order.name })//Кидаю ошибку чтоб не пересохраняли заказы которые уже в работе
                const positionsToSave = []
                let vizEngaged = false
                for(const pos of data.positions){
                    if(pos.result?.other?.viz) vizEngaged = true
                    if(pos.added){
                        positionsToSave.push({ 
                            assortment: { meta: pos.meta },
                            added: pos.added,
                            quantity: pos.quantity,
                            price: pos.prices[data.displayPrice].toFixed(2) * 100, //При передачи заказа на фронт конвертировали все в рубли, а при сохранении обратно в копейки
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
                            ctx.call('proxy.sklad', {
                                url: `https://api.moysklad.ru/api/remap/1.2/entity${isService ? '/service' : '/product'}`,
                                type: "post",
                                data: params,
                                priority: true
                            }).then(result => {
                                return {
                                    assortment: { meta: result?.meta },
                                    quantity: pos.quantity,
                                    price: pos.prices[data.displayPrice].toFixed(2) * 100,
                                    discount: pos?.discount || 0,
                                    vat: data.order.organization.name === 'ООО "А2"' ? 22 : 5
                                }
                            })
                        );
                    }
                }
                const finalPositions = await Promise.all(positionsToSave)
                const deletedPositions = order?.positions?.rows?.filter(pos => !finalPositions.some(p => p?.assortment?.meta?.href === pos?.assortment?.meta?.href))
                try {
                    const params = {
                        positions: finalPositions,
                        attributes: [{
                            meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/99884b94-8f93-11f0-0a80-029a000276da","type":"attributemetadata","mediaType":"application/json"},
                            value: String(data.planDate.workDays)
                        },{
                            meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/afc68830-5368-11f1-0a80-156a000b5f1e","type":"attributemetadata","mediaType":"application/json"},
                            value: Array.from(new Set(data.positions.map(pos => pos.result?.other?.type).filter(Boolean))).join(';')
                        }],
                        store: { meta: vizEngaged ? stores['ВИЗ СГИ'].meta : stores['Полеводство СГИ'].meta }
                    }
                    if(data.planDate.date) params.deliveryPlannedMoment = data.planDate.date
                    this.logger.debug({ order: data.order.name, positions: finalPositions.length }, 'Сохранение заказа')
                    return await ctx.call('proxy.sklad', {url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}`, type: "put", data: params})
                } catch(error) {
                    this.logger.error({ err: error, order: data.order.name }, `Ошибка во время добавления позиций в заказ ${data.order.name}`)
                    finalPositions && ctx.call('proxy.sklad', {url: `https://api.moysklad.ru/api/remap/1.2/entity/product/delete`, type: "post", data: finalPositions.filter(el => !el.added).map(el => ({meta: el.assortment.meta}))})
                    throw new MoleculerError(`Ошибка при добавлении позиций в заказ: ${error?.message || error}`, 500, 'SAVE_ORDER_FAILED', { order: data.order.name })
                } finally {
                    deleteEntitys(deletedPositions, ctx)
                }
            }
        },
        createPZ: {
            rest: "POST /createPZ",
            permissions: ['Админ'],
            async handler(ctx) {
                const { id, initiator } = ctx.params
                return await createProductionTask({ id, initiator }, ctx)
            }
        },
        aiGlass: {
            rest: 'POST /ai/glass',
            permissions: ['Калькулятор'],
            async handler(ctx) {
                const { text } = ctx.params;
                return JSON.parse(await doAiRequest(ctx, text, process.env.TIMEWEB_GLASS_AI_AGENT_URL)).map(expandObject)
            }
        },
        aiGlasspacket: {
            rest: 'POST /ai/glasspacket',
            permissions: ['Калькулятор'],
            async handler(ctx) {
                const { text } = ctx.params;
                return JSON.parse(await doAiRequest(ctx, text, process.env.TIMEWEB_GLASSPACKET_AI_AGENT_URL))
            }
        },
        aiTempering: {
            rest: 'POST /ai/tempering',
            permissions: ['Калькулятор'],
            async handler(ctx) {
                const { text } = ctx.params;
                return JSON.parse(await doAiRequest(ctx, text, process.env.TIMEWEB_GLASS_TEMPERING_AI_AGENT_URL))
            }
        },
        orderChanged: {
            rest: "POST /orderChanged",
            permissions: ["Админ"],
            async handler(ctx) {
                handleOrderChanged(ctx)
                return true
            }
        },
        pzChanged: {
            rest: "POST /pzChanged",
            permissions: [],
            async handler(ctx) {
                handlePZChanged(ctx)
                return true
            }
        },
        paymentInChanged: {
            rest: "POST /paymentInChanged",
            permissions: [],
            async handler(ctx) {
                handlePaymentInChanged(ctx)
                return true
            }
        },
        orderCreated: {
            rest: "POST /orderCreated",
            permissions: [],
            async handler(ctx) {
                handleOrderCreated(ctx)
                return true
            }
        }
    },
    events: {
        async dataUpdated(ctx) {
            await refreshData(ctx.params)
        },
    }
});

broker.start();

const keyMap = {
  m: "material",
  t: "tempered",
  p: "processing",
  w: "width",
  h: "height",
  q: "quantity",
  d: "drills",
  c1: "cutsv1",
  c2: "cutsv2",
  c3: "cutsv3",
  s: "shape",
  z: "zenk",
};
function expandObject(obj) {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = keyMap[key];
    if (!fullKey) {
      result[key] = value;
      continue;
    }

    result[fullKey] = value;
  }

  return result;
}
async function doAiRequest(ctx, text, endpoint) {
    try {
        const response = await ctx.call('proxy.request', {
            url: endpoint,
            type: "post",
            data: { message: text },
            headers: { authorization: `Bearer ${process.env.TIMEWEB_AI_TOKEN}` } 
        });
        ctx.broker.logger.debug({ endpoint, response }, "AI agent response")
        return response.message
    }catch (err) {
        ctx.broker.logger.error({ err, endpoint }, "Error calling AI agent")
        throw new MoleculerError("Failed to generate glass positions from AI", 502, 'AI_AGENT_FAILED', { endpoint })
    }
}
async function handleOrderChanged(ctx) {
    const { attributes, states, employees } = getData()
    let order = null
    for(const event of ctx.params.events){
        try{
            if(event?.updatedFields?.includes('state')){
                order ??= await ctx.call('proxy.sklad', {url: `${event.meta.href}?expand=agent,store,state`})
                const attrs = (order.attributes || []).reduce((a, x) => {
                    a[x.name] = x.value;
                    return a;
                }, {});
                switch(order.state.name){
                    case 'Готово':
                        if(order.payedSum < order.sum && !attrs['Рекламация'] && order?.agent?.name !== 'ООО "ИНТЕРНЕТ РЕШЕНИЯ".'){
                            await ctx.call('proxy.sklad', {
                                url: order.meta.href,
                                type: 'put',
                                data: {
                                    state: { meta: states.customerorder['Готово, не оплачено'].meta }
                                }
                            })
                            return
                        }
                        await ctx.call('proxy.sklad', {
                            url: order.meta.href,
                            type: 'put',
                            data: {
                                attributes: [{ 
                                    meta: attributes.customerorder['Дата готовности факт'].meta,
                                    value: new Date().toISOString().slice(0, 19).replace('T', ' ')
                                }]
                            }
                        })
                        if(order?.owner?.meta?.href == `https://api.moysklad.ru/api/remap/1.2/entity/employee/03579653-eedf-11e8-9107-50480000f34d`) return
                        if (!order?.agent?.email) {
                            if (order?.owner?.meta) {
                                await ctx.call('proxy.sklad', {
                                    url: 'https://api.moysklad.ru/api/remap/1.2/entity/task',
                                    type: 'post',
                                    data: {
                                        assignee: { meta: order.owner.meta },
                                        operation: { meta: order.meta },
                                        description: `Уведомление о готовом заказе не отправлено, тк не указан email`
                                    }
                                })
                            }
                        }else{
                            let store = 'Кажется что-то пошло не так, обратитесь к менеджеру для уточнения адреса'
                            switch(order?.store?.name){
                                case('Селькоровская СГИ'):
                                    store = 'Селькоровская улица, 114А, Екатеринбург, Свердловская область.\nЧасы работы: 09:00 - 19:00'
                                break
                                case('ВИЗ СГИ'):
                                    store = 'Верх-Исетский бульвар, 13Н, Екатеринбург, Свердловская область.\nЧасы работы: 09:00 - 19:00'
                                break
                                case('Полеводство СГИ'):
                                    store = 'Улица Николы Теслы, 1/2, Екатеринбург, Свердловская область.\nЧасы работы: 09:00 - 19:00'//УКАЗАТЬ АДРЕС ПОЛЕВОДСТВА
                                break
                            }
                            await ctx.call('proxy.request', {
                                url: process.env.UNISENDER_URL,
                                type: 'post',
                                data: { 
                                    email: order?.agent?.email,
                                    orderName: order.name,
                                    store
                                }
                            })
                        }
                    break
                    case 'Поставлено в производство':
                        ctx.call('sklad.createPZ', { id: order.id, initiator: ctx.params.auditContext?.uid })
                    break
                    case 'Поставлено в производство ВИЗ':
                        ctx.call('sklad.createPZ', { id: order.id, initiator: ctx.params.auditContext?.uid })
                    break
                    // case 'Тест':
                    //     ctx.call('sklad.createPZ', { id: order.id, initiator: ctx.params.auditContext?.uid })
                    // break
                    case 'Карантин':
                        if(!order.productionTasks) break
                        for(const productiontask of order.productionTasks){
                            const task = await ctx.call('proxy.sklad', {
                                url: `https://api.moysklad.ru/api/remap/1.2/entity/task`,
                                type: 'post',
                                data: {
                                    assignee: { meta: employees['ea79c5e9-b7fd-11ed-0a80-03260003eb9f'].meta }, //Руслан
                                    operation: { meta: productiontask.meta },
                                    description: `Остановить выпуск продукции по этому ПЗ`
                                }
                            })
                            await ctx.call('proxy.sklad', {
                                url: productiontask.meta.href,
                                type: 'put',
                                data: {
                                    state: { meta: states.productiontask['Остановлено'].meta }
                                }
                            })
                        }
                    break
                }
            }
        }catch(err){
            ctx.broker.logger.error({ err, order: order?.name, event }, `Ошибка обработки изменения заказа ${order?.name || ''}`)
            try {
                await ctx.call('proxy.sklad', {
                    url: 'https://api.moysklad.ru/api/remap/1.2/entity/task',
                    type: 'post',
                    data: {
                        assignee: { meta: employees['62d9a852-3488-11f0-0a80-043b00408594'].meta },
                        description: `Ошибка во время обработки изменения заказа покупателя № ${order?.name}
                        Ошибка: ${err.message}
                        Stack:
                        ${err.stack}
                        Event: ${JSON.stringify(ctx.params)}`
                    }
                })
                if (order?.id) {
                    await ctx.call('proxy.sklad', {
                        url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${order.id}`,
                        type: 'put',
                        data: {
                            state: { meta: {
                                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/6a37967b-5899-11f0-0a80-1bc9000373a3",
                                "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata",
                                "type" : "state",
                                "mediaType" : "application/json"
                            }}
                        }
                    })
                }
            } catch (notifyErr) {
                ctx.logger.error({ err: notifyErr, order: order?.name }, 'Не удалось отправить уведомление об ошибке orderChanged')
            }
        }
    }
}
async function handlePZChanged(ctx) {
    let document = null
    let order = null
    const data  = ctx.params
    const { states } = getData()
    for(const event of data.events){
        try{
            if(event?.updatedFields?.includes('productionEnd')){
                document ??= await ctx.call('proxy.sklad',{ url: event.meta.href })
                order ??= await ctx.call('proxy.sklad',{ url: document.customerOrders[0].meta.href + '?expand=productionTasks' })
                let orderCompleted = true
                for(const task of (order?.productionTasks || [])){
                    if(!task.productionEnd) orderCompleted = false
                }
                if(orderCompleted)
                    await ctx.call('proxy.sklad',{
                        url: order.meta.href,
                        type: 'put',
                        data: {
                            state: { meta: states.customerorder['Готово'].meta }
                        }
                    })
            }
        }catch(err){
            ctx.broker.logger.error({ err, order: order?.name, event }, `Ошибка обработки изменения ПЗ ${document?.name || ''}`)
        }
    }
}
async function handlePaymentInChanged(ctx) {
    let document = null
    let invoice = null
    const data = ctx.params
    for(const event of data.events){
        try{
            if(event?.updatedFields?.includes('operationLink')){
                document ??= await ctx.call('proxy.sklad',{ url: event.meta.href })
                const invoices = document?.operations?.filter(el => el.meta.type == 'invoiceout')
                if(!invoices || invoices.length == 0) return
                invoice ??= await ctx.call('proxy.sklad',{ url: invoices[0].meta.href })
                const attrs = {
                    attributes: [{
                        meta: {
                            href: 'https://api.moysklad.ru/api/remap/1.2/entity/paymentin/metadata/attributes/26decc76-3403-11f1-0a80-01be000d4638',
                            type: 'attributemetadata',
                            mediaType: 'application/json'
                        },
                        value: invoice.owner
                    }]
                }
                invoice?.project?.meta && (attrs.project = { meta: invoice.project.meta })
                const response = await ctx.call('proxy.sklad',{
                    url: document.meta.href,
                    type: 'put',
                    data: attrs
                })
            }
        }catch(err){
            this.logger.error({ err, invoice: invoice?.name, event }, `Ошибка обработки изменения входящего платежа ${document?.name || ''}`)
        }
    }
}
async function handleOrderCreated(ctx) {
    const data = ctx.params
    for(const event of data.events){
        let order = null
        try{
            order = await ctx.call('proxy.sklad', { url: event.meta.href })
            const contracts = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/contract?filter=agent=${order.agent.meta.href}&order=moment` })
            if(contracts.rows.length == 0) continue
            await ctx.call('proxy.sklad', {
                url: order.meta.href,
                type: 'put',
                data: {
                    contract: { meta: contracts.rows[0].meta }
                }
            })
        }catch(err){
            ctx.broker.logger.error({ err, order: order?.name, event }, `Ошибка обработки создания заказа ${order?.name || ''}`)
        }
    }
}