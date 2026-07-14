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

// Цвет должен попадать только в то ПЗ, где непосредственно находится окрашенная деталь.
const getColors = (plans) => [...new Set(plans.map(plan => plan._color).filter(Boolean))]

// A production task should reserve its input materials only when it actually has any.
const shouldReserve = (plans) => plans.reduce((sum, plan) => sum + (plan?.materials?.meta?.size || 0), 0) > 0

// Собирает meta родительских ПЗ для заданий 2-го/3-го уровня:
// либо прямая ссылка (_parentTask, СМД), либо через родительскую техкарту (_parentPlan._task).
const collectParentTasks = (plans) => {
    const parents = new Map()
    for (const plan of plans) {
        const meta = plan._parentTask || plan._parentPlan?._task?.meta
        if (meta) parents.set(meta.href, meta)
    }
    return [...parents.values()]
}

const rollback = async (createdEntitys, ctx) => {
    const entities = [
        ['task', 'productiontask'],
        ['plan', 'processingplan'],
        ['product', 'product']
    ]
    for (const [key, entity] of entities) {
        if (createdEntitys[key].length > 0) {
            await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/${entity}/delete`, type: 'post', data: createdEntitys[key].map(el => ({ meta: el.meta })) })
        }
    }
}

export const createProductionTask = async ({ id, initiator }, ctx) => {
    const { settings } = getData()
    const order = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${id}?expand=positions.assortment,invoicesOut,agent,state,owner&limit=100` })
    if (!order) throw new Error(`Заказ покупателя с ${id} не найден`)

    const skip = await checkOrderDetails(order, initiator, ctx)
    if (skip) return

    const createdEntitys = { task: [], plan: [], product: [] }
    const results = {
        // Уровень 1 — финальная продукция (связь с заказом). СМД создаётся сразу в smd.js.
        glass: [],
        triplex: [],
        ceraglass: [],
        glasspacket: [],
        // Уровень 2 — полуфабрикаты (связь с ПЗ 1-го уровня)
        glasst2: [],
        cerat2: [],
        triplext2: [],
        // Уровень 3 — стекло для триплекса стеклопакета (связь с ПЗ triplext2)
        glasst3: [],
        print: false,
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
            if (data && !data?.result?.other?.customerSuppliedGlassForTempering) {
                await productTypeHandlers[data.result.other.type]({ ctx, data, order, position, createdEntitys, results })
                continue
            }
            if (position.assortment.name.toLowerCase().includes('упаковка')) {
                addComment += `${position.assortment.name}\n`
            }
            if (!data && (attrs['Тип СМД'] || attrs['Серия'])) {
                await productTypeHandlers['СМД']({ ctx, data: null, order, position, createdEntitys, results })
            }
        }

        //Симуляция и расчет даты окончания производства
        const simRes = await recalcDate(t3heap)
        const {calcMoment, lastTier3End, machines, tier3EndTimes, lastEnd, tier3Items } = simRes
        const date = new Date(lastTier3End?.time || lastEnd || Date.now());
        date.setDate(date.getDate() 
            + (settings?.addProdDays?.value || settings?.addProdDays?.default || 0)
            + (results.print ? (settings?.addPrintDays?.value || settings?.addPrintDays?.default || 0) : 0)
        );//Прибавляем дни в зависимости от настроек
        const day = date.getDay();//Прибавляем дни, если дата попадает на выходные
        if (day === 6) date.setDate(date.getDate() + 2);
        else if (day === 0) date.setDate(date.getDate() + 1);

        const depth2date = new Date(date)
        depth2date.setDate(depth2date.getDate() - Math.ceil((tier3Items[1] || 100) / 60 / 8)) //Иначе берем 100 минут, тк например доски не считаются в симуляции, и у них выдает ошибку
        const depth2day = depth2date.getDay();
        if (depth2day === 6) depth2date.setDate(depth2date.getDate() - 1);
        else if (depth2day === 0) depth2date.setDate(depth2date.getDate() - 2);

        const depth3date = new Date(depth2date)
        depth3date.setDate(depth3date.getDate() - Math.ceil((tier3Items[2] || 100) / 60 / 8))
        const depth3day = depth3date.getDay();
        if (depth3day === 6) depth3date.setDate(depth3date.getDate() - 1);
        else if (depth3day === 0) depth3date.setDate(depth3date.getDate() - 2);

        // Порядок важен: сначала уровень 1, затем 2 (ссылается на ПЗ уровня 1),
        // затем 3 (ссылается на ПЗ triplext2).
        const productionConfigs = [
            // —— Уровень 1 — финальная продукция, связь с заказом покупателя ——
            {
                groups: groupByMaterial(results.glass),
                materialsStore: 'Полеводство материалы/прочее', 
                productsStore: 'Полеводство СГИ', 
                checkboxes: { print: results.print },
                deliveryPlannedMoment: formatDate(date),
            },
            {
                source: results.triplex,
                materialsStore: 'Полеводство материалы/прочее', 
                productsStore: 'Полеводство СГИ', 
                checkboxes: { triplex: true, print: results.print },
                reserve: true,
                deliveryPlannedMoment: formatDate(date),
            },
            {
                source: results.ceraglass,
                materialsStore: 'ВИЗ ПФ', 
                productsStore: 'ВИЗ СГИ', 
                checkboxes: { viz: true, ceraglass: true, print: results.print },
                reserve: true,
                deliveryPlannedMoment: formatDate(date),
            },
            {
                source: results.glasspacket,
                materialsStore: 'Полеводство материалы/прочее', 
                productsStore: 'Полеводство СГИ', 
                checkboxes: { glasspacket: true },
                reserve: true,
                deliveryPlannedMoment: formatDate(date),
            },
            // —— Уровень 2 — полуфабрикаты, связь с ПЗ 1-го уровня ——
            {
                source: results.triplext2,
                materialsStore: 'Полеводство материалы/прочее', 
                productsStore: 'Полеводство материалы/прочее', 
                checkboxes: { triplex: true },
                reserve: true,
                linkToParent: true,
                deliveryPlannedMoment: formatDate(depth2date),
            },
            {
                groups: groupByMaterial(results.glasst2),
                materialsStore: 'Полеводство материалы/прочее', 
                productsStore: 'Полеводство материалы/прочее', 
                checkboxes: {},
                linkToParent: true,
                deliveryPlannedMoment: formatDate(depth2date),
            },
            {
                groups: groupByMaterial(results.cerat2),
                materialsStore: 'ВИЗ ПФ', 
                productsStore: 'ВИЗ ПФ', 
                checkboxes: {},
                linkToParent: true,
                deliveryPlannedMoment: formatDate(depth2date),
            },
            // —— Уровень 3 — стекло для триплекса стеклопакета, связь с ПЗ triplext2 ——
            {
                groups: groupByMaterial(results.glasst3),
                materialsStore: 'Полеводство материалы/прочее', 
                productsStore: 'Полеводство материалы/прочее', 
                checkboxes: {},
                linkToParent: true,
                deliveryPlannedMoment: formatDate(depth3date),
            }
        ]
        const createTask = async ({ source, materialsStore, productsStore, checkboxes, reserve, linkToParent, deliveryPlannedMoment }) => {
            const task = await makeProductionTask({
                ctx,
                materialsStore,
                productsStore,
                productionRows: source.map(plan => ({ processingPlan: { meta: plan.meta }, productionVolume: plan.quantity })),
                order,
                checkboxes,
                reserve,
                addComment,
                createdEntitys,
                productionTasks: linkToParent ? collectParentTasks(source) : null,
                deliveryPlannedMoment,
            })
            // Запоминаем созданное ПЗ на техкартах — по нему свяжутся ПЗ следующего уровня.
            for (const plan of source) plan._task = task
        }
        for (const cfg of productionConfigs) {
            if (cfg.groups) {
                for (const [material, plans] of Object.entries(cfg.groups)) {
                    if (!plans.length) continue
                    await createTask({ ...cfg, source: plans, checkboxes: { ...cfg.checkboxes, material, colors: getColors(plans) }, reserve: shouldReserve(plans) })
                }
            } else if (cfg.source.length) {
                await createTask({ ...cfg, checkboxes: { ...cfg.checkboxes, colors: getColors(cfg.source) } })
            }
        }
        await ctx.call('proxy.sklad', {
            url: order.meta.href,
            type: 'put',
            data: { deliveryPlannedMoment: formatDate(date)}
        })
    } catch (error) {
        ctx.broker.logger.error({ err: error, order: order.name }, 'Ошибка во время создания производственного задания')
        await rollback(createdEntitys, ctx)
        await ctx.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/task', type: 'post', data: {
            assignee: { meta: order.owner.meta },
            operation: { meta: order.meta },
            description: `Ошибка во время создания производственного задания ${order.name}`
        } })
        await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${order.id}`, type: 'put', data: {
            state: { meta: ERROR_STATE }
        } })
        return
    }

    // Best-effort notifications: a failure here must not roll back the tasks we just created.
    if (results.print) {
        try {
            await ctx.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/task', type: 'post', data: {
                assignee: { meta: UV_PRINT_ASSIGNEE },
                operation: { meta: order.meta },
                description: `В заказе №${order.name} есть уф печать`
            } })
        } catch (error) {
            ctx.broker.logger.error({ err: error, order: order.name }, `Не удалось создать задачу об УФ печати для заказа ${order.name}`)
        }
    }

    try {
        await ctx.call('proxy.request', { url: process.env.UNISENDER_URL_prod, type: 'post', data: {
            email: order?.agent?.email,
            orderName: order.name,
            deliveryPlannedMoment: order.deliveryPlannedMoment?.split(' ')[0]
        } })
    } catch (error) {
        ctx.broker.logger.error({ err: error, order: order.name }, `Не удалось отправить уведомление по заказу ${order.name}`)
    }
}
function formatDate(date) {
    const pad = n => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}