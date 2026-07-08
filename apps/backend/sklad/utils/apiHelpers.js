import crypto from 'crypto'
import { valkey } from "@askell/shared"
import { broker } from '../index.js'
import { getData } from './dataManager.js'
import { generateSmdMaterials } from './generateSmdMaterials.js'
import generateProductAttributes from './generateProductAttributes.js'
import generateProductionTaskAttributes from './generateProductionTaskAttributes.js'
import { productFoldersByType, uomMeta } from './constants.js'

const PRODUCTION_TASK_STATE = {
    href: "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/states/80ac3d11-6c11-11ef-0a80-0c2300044c17",
    metadataHref: "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata",
    type: "state",
    mediaType: "application/json"
}

// Cache created processing processes by a hash of their (normalized) stage list
// so identical routes reuse a single MoySklad entity instead of duplicating it.
const PROCESSING_PROCESS_CACHE_KEY = 'sklad:processingProcesses'

const getStagesHash = (stages) =>
    crypto.createHash('sha256').update(JSON.stringify(stages)).digest('hex')

export const makeProductionTask = async ({
    materialsStore,
    productsStore,
    productionRows,
    order,
    checkboxes,
    reserve,
    addComment,
    createdEntitys
}) => {
    const { stores, attributes } = getData()
    const task = await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/productiontask',
        type: 'post',
        data: {
            materialsStore: { meta: stores[materialsStore].meta },
            productsStore: { meta: stores[productsStore].meta },
            organization: { meta: order?.organization?.meta },
            attributes: generateProductionTaskAttributes(order, checkboxes, attributes),
            productionRows,
            reserve,
            awaiting: true,
            description: `${order.attributes?.find(el => el.name === 'Комментарий для производства')?.value || ''}\n${addComment}`,
            state: { meta: PRODUCTION_TASK_STATE },
            productionStart: new Date().toISOString().slice(0, 19).replace('T', ' '),
            customerOrders: [{ meta: order.meta }],
            ...(order?.owner?.meta ? { owner: { meta: order.owner.meta } } : {}),
            ...(order?.deliveryPlannedMoment ? { deliveryPlannedMoment: order.deliveryPlannedMoment } : {})
        }})
    createdEntitys.task.push(task)
    return task
}

export const makeProcessingPlan = async ({
    data,
    name,
    order,
    processingProcess,
    product,
    isPF = false,
    materials = null,
    material = null,
    color = null,
    materialMeta = null,
    folderId = "f699d4ef-7cdb-11f0-0a80-17360009d500",
    createdEntitys,
    mode = "default", // "package", "tempering", "glass", "smd"
    viz
}) => {
    const { sklad_materials, sklad_packaging } = getData()
    let finalMaterials = materials
    if (mode === "glass") {
        let trimCoef = data.ceraTrim || 1.2
        if (data.result.other?.trims?.[material]) {
            trimCoef = data.result.other.trims[material]
            if (material.includes('М1') && trimCoef > 1.5) trimCoef = 1.5
        }
        finalMaterials = [{
            assortment: { meta: sklad_materials[material].meta },
            quantity: (data.initialData.width * data.initialData.height) / 1000000 * trimCoef
        }]
    }
    if (mode === "smd") {
        finalMaterials = await generateSmdMaterials(data, color, materialMeta)
        folderId = "92522e19-80c1-11f0-0a80-09fe001efbca"
    }
    if (data?.result?.other?.package && !isPF) {
        const positions = await broker.call('proxy.sklad', { url: `${processingProcess.href}/positions` })
        finalMaterials.push({
            processingProcessPosition: { meta: positions.rows.at(-1).meta },
            assortment: { meta: sklad_packaging[viz ? 'Гофролист Т22 1050х2500 мм' : 'Гофролист Т21 1050х2000 мм'].meta },
            quantity: data.result.other.S * 2
        })
    }
    const processingProcessFull = await broker.call('proxy.sklad', { url: `${processingProcess.href}/positions?expand=processingstage` })
    const response = await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/processingplan', type: 'post', data: {
        name: `${order.name}, ${isPF ? 'ПФ, ' : ''}${name}`,
        processingProcess: { meta: processingProcess },
        ...(finalMaterials ? { materials: finalMaterials } : {}),
        products: [{
            assortment: { meta: product.meta },
            quantity: 1
        }],
        parent: {
            meta: {
                href: `https://api.moysklad.ru/api/remap/1.2/entity/processingplanfolder/${folderId}`,
                metadataHref: "https://api.moysklad.ru/api/remap/1.2/entity/processingplanfolder/metadata",
                type: "processingplanfolder",
                mediaType: "application/json"
            }
        },
        stages: processingProcessFull.rows.map(el => ({
            processingProcessPosition: { meta: el.meta },
            standardHour: calculateStandardHour(data, el),
            enableHourAccounting: false
        }))
    } })
    createdEntitys.plan.push(response)
    return response
}

export const makeProduct = async ({ data, material, createdEntitys, order, type, processingSPO, colorSPO, temperedSPO }) => {
    const { attributes, sklad_materials } = getData()
    const { height, width, drills, zenk, cutsv1, cutsv2, cutsv3, print } = data.initialData
    const processing = data.initialData.processing || processingSPO
    const color = data.initialData.color || colorSPO
    const tempered = data.initialData.tempered || temperedSPO
    const { stanok } = data.result.other
    const attrs = { height, width, processing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, color, print, isPF: true, order, material, stanok }
    if (type) attrs.type = type
    const product = await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/product', type: 'post', data: {
        name: `ПФ ${material} (${height}х${width}, ${stanok && stanok}, ${processing && processing}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''}, площадь: ${(height * width / 1000000).toFixed(2)})`,
        attributes: generateProductAttributes(attrs, attributes, sklad_materials),
        volume: Number((data.result.other.S).toFixed(2)),
        uom: uomMeta,
        productFolder: productFoldersByType['ПФ']
    } })
    createdEntitys.product.push(product)
    return product
}

export const makeProcessingProcess = async (stages) => {
    const { processingStages } = getData()
    const normalizedStages = stages.map(s => s.trim().toLowerCase())
    const hash = getStagesHash(normalizedStages)
    const cached = await valkey.hget(PROCESSING_PROCESS_CACHE_KEY, hash)
    if (cached) return JSON.parse(cached)
    const response = await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/processingprocess', type: 'post', data: {
        name: String(Date.now()),
        positions: stages.map((el, i) => {
            const next = stages[i + 1]
            const position = {
                processingstage: { meta: processingStages[el].meta }
            }
            if (next) position.nextPositions = [{ processingstage: { meta: processingStages[next].meta } }]
            return position
        }),
        description: stages.join('\n')
    } })
    await valkey.hset(PROCESSING_PROCESS_CACHE_KEY, hash, JSON.stringify(response.meta))
    return response.meta
}

const calculateStandardHour = (data, el) => {
    switch (el.processingstage.name) {
        case 'КР Полировка':
        case 'КР Шлифовка':
            return (data.result?.other?.P + (data.initialData?.cutsv1 || 0) * 1.86 + (data.initialData?.cutsv2 || 0) * 3.5 + (data.initialData?.cutsv3 || 0) * 7) * 100
        case 'ПР Полировка':
        case 'ПР Притупка':
        case 'ПР Шлифовка':
        case 'Полировка':
        case 'Притупка':
            return data.result?.other?.P * 100

        case 'Раскрой':
        case 'Окраска стекла':
        case 'Раскрой гидрорез Керамики':
        case 'Закалка':
        case 'Триплексование':
        case 'Упаковка в картон':
        case 'Подготовка лист мет ( для СМД)':
            return data.result?.other?.S * 100

        case 'Сверление':
            return data.initialData.drills * 100 || data.initialData.drillssmd * 100
        case 'Зенковка':
            return data.initialData.zenk * 100

        default:
            return 0
    }
}
