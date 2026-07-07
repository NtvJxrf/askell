import { broker } from '../index.js'
import checkOrderDetails from './checkOrderDetails.js'
import { productTypeHandlers } from './productHandlers/index.js'
import { makeProductionTask } from './apiHelpers.js'
import recalcDate from './recalcDate.js'
import { getData } from './dataManager.js'
const ERROR_STATE = {
    href: "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/6a37967b-5899-11f0-0a80-1bc9000373a3",
    metadataHref: "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata",
    type: "state",
    mediaType: "application/json"
}

// Employee that handles UV-printing orders.
const UV_PRINT_ASSIGNEE = {
    href: "https://api.moysklad.ru/api/remap/1.2/entity/employee/167c3a00-f3dc-11ed-0a80-13fb000f16e1",
    metadataHref: "https://api.moysklad.ru/api/remap/1.2/entity/employee/metadata",
    type: "employee",
    mediaType: "application/json"
}

const toAttributeMap = (attributes) => (attributes || []).reduce((acc, attribute) => {
    acc[attribute.name] = attribute.value
    return acc
}, {})

const groupByMaterial = (plans) => plans.reduce((acc, plan) => {
    acc[plan._material] ??= []
    acc[plan._material].push(plan)
    return acc
}, {})

// A production task should reserve its input materials only when it actually has any.
const shouldReserve = (plans) => plans.reduce((sum, plan) => sum + (plan?.materials?.meta?.size || 0), 0) > 0

const rollback = async (createdEntitys) => {
    const entities = [
        ['task', 'productiontask'],
        ['plan', 'processingplan'],
        ['product', 'product']
    ]
    for (const [key, entity] of entities) {
        if (createdEntitys[key].length > 0) {
            await broker.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/${entity}/delete`, type: 'post', data: createdEntitys[key].map(el => ({ meta: el.meta })) })
        }
    }
}

export const createProductionTask = async ({ id, initiator }) => {
    const { settings } = getData()
    const order = await broker.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${id}?expand=positions.assortment,invoicesOut,agent,state,owner&limit=100` })
    if (!order) throw new Error(`Заказ покупателя с ${id} не найден`)

    const skip = await checkOrderDetails(order, initiator)
    if (skip) return

    const createdEntitys = { task: [], plan: [], product: [] }
    const results = {
        viz: [],
        polevSP: [],
        triplexPz: [],
        polevGlass: [],
        polevGlassForSp: [],
        print: false,
        triplex: false,
        ceraglass: false,
        colors: []
    }
    let addComment = ''
    const t3heap = []
    try {
        for (const position of order.positions.rows) {
            const attrs = toAttributeMap(position?.assortment?.attributes)
            let data = null
            if(attrs['Детали']){
                data = JSON.parse(attrs['Детали'])
                t3heap.push({position, data})
            }
            // if (data && !data?.result?.other?.customerSuppliedGlassForTempering) {
            //     await productTypeHandlers[data.result.other.type]({ data, order, position, createdEntitys, results })
            //     continue
            // }
            // if (position.assortment.name.toLowerCase().includes('упаковка')) {
            //     addComment += `${position.assortment.name}\n`
            // }
            // if (!data && (attrs['Тип СМД'] || attrs['Серия'])) {
            //     await productTypeHandlers['СМД']({ data: null, order, position, createdEntitys, results })
            // }
        }

        const productionConfigs = [
            {
                source: results.viz,
                materialsStore: 'ВИЗ ПФ',
                productsStore: 'ВИЗ СГИ',
                checkboxes: { viz: true, print: results.print, colors: results.colors, ceraglass: results.ceraglass },
                reserve: true
            },
            {
                source: results.triplexPz,
                materialsStore: 'Полеводство материалы/прочее',
                productsStore: 'Полеводство СГИ',
                checkboxes: { triplex: true, print: results.print, colors: results.colors },
                reserve: true
            },
            {
                source: results.polevSP,
                materialsStore: 'Полеводство материалы/прочее',
                productsStore: 'Полеводство СГИ',
                checkboxes: { glasspacket: true },
                reserve: true
            },
            {
                groups: groupByMaterial(results.polevGlass),
                materialsStore: 'Полеводство материалы/прочее',
                productsStore: 'Полеводство СГИ',
                checkboxes: {}
            },
            {
                groups: groupByMaterial(results.polevGlassForSp),
                materialsStore: 'Полеводство материалы/прочее',
                productsStore: 'Полеводство материалы/прочее',
                checkboxes: {}
            },
            {
                groups: groupByMaterial(results.polevGlassForTriplexForSp),
                materialsStore: 'Полеводство материалы/прочее',
                productsStore: 'Полеводство материалы/прочее',
                checkboxes: {}
            }
        ]
        const simRes = await recalcDate(t3heap)
        const {calcMoment, lastTier3End, machines, tier3EndTimes} = simRes
        const date = new Date(lastTier3End.time);
        date.setDate(date.getDate() + (settings?.addProdDays?.value || settings?.addProdDays?.default || 0));
        console.log(date)
        return
        const createTask = ({ source, materialsStore, productsStore, checkboxes, reserve }) =>
            makeProductionTask({
                materialsStore,
                productsStore,
                productionRows: source.map(plan => ({ processingPlan: { meta: plan.meta }, productionVolume: plan.quantity })),
                order,
                checkboxes,
                reserve,
                addComment,
                createdEntitys
            })
        for (const cfg of productionConfigs) {
            if (cfg.groups) {
                for (const [material, plans] of Object.entries(cfg.groups)) {
                    if (!plans.length) continue
                    await createTask({ ...cfg, source: plans, checkboxes: { ...cfg.checkboxes, material }, reserve: shouldReserve(plans) })
                }
            } else if (cfg.source.length) {
                await createTask(cfg)
            }
        }
    } catch (error) {
        console.error('Ошибка во время создания производственного задания', { stack: error.stack })
        await rollback(createdEntitys)
        await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/task', type: 'post', data: {
            assignee: { meta: order.owner.meta },
            operation: { meta: order.meta },
            description: `Ошибка во время создания производственного задания ${order.name}`
        } })
        await broker.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${order.id}`, type: 'put', data: {
            state: { meta: ERROR_STATE }
        } })
        return
    }

    // Best-effort notifications: a failure here must not roll back the tasks we just created.
    if (results.print) {
        try {
            await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/task', type: 'post', data: {
                assignee: { meta: UV_PRINT_ASSIGNEE },
                operation: { meta: order.meta },
                description: `В заказе №${order.name} есть уф печать`
            } })
        } catch (error) {
            console.error(`Не удалось создать задачу об УФ печати для заказа ${order.name}`, { stack: error.stack })
        }
    }

    try {
        await broker.call('proxy.request', { url: process.env.UNISENDER_URL_prod, type: 'post', data: {
            email: order?.agent?.email,
            orderName: order.name,
            deliveryPlannedMoment: order.deliveryPlannedMoment?.split(' ')[0]
        } })
    } catch (error) {
        console.error(`Не удалось отправить уведомление по заказу ${order.name}`, { stack: error.stack })
    }
}
