import generateStages from '../generateStages.js'
import { makeProcessingProcess, makeProduct, makeProcessingPlan, makeProductionTask } from '../apiHelpers.js'
import { getData } from '../dataManager.js'

const VIZ_SMD_PROCESSING_PROCESS = {
    href: "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/43072ea8-17cf-11ef-0a80-178100023cbc",
    metadataHref: "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/metadata",
    type: "processingprocess",
    mediaType: "application/json",
    uuidHref: "https://online.moysklad.ru/app/#processingprocess/edit?id=43072ea8-17cf-11ef-0a80-178100023cbc"
}

export const smd = async ({ ctx, data, order, position, createdEntitys, results }) => {
    const { smdPlans } = getData()

    if (!data) {
        const attributes = (position?.assortment?.attributes || []).reduce((acc, curr) => {
            acc[curr.name] = curr.value
            return acc
        }, {})
        const print = position.assortment.name.toLowerCase().includes('уф печать')
        await makeProductionTask({
            ctx,
            materialsStore: 'ВИЗ ПФ',
            productsStore: 'ВИЗ СГИ',
            productionRows: [{ processingPlan: { meta: smdPlans[position.assortment.name].meta }, productionVolume: position.quantity }],
            order,
            checkboxes: { viz: true, smd: true, print, height: attributes['Длина в мм'], width: attributes['Ширина в мм'], colors: [attributes['Цвет доски']?.name] },
            reserve: true,
            addComment: '',
            createdEntitys
        })
        return
    }

    const { print, color } = data.initialData
    if (print) results.print = true
    if (color) results.colors.push(color)

    const [processingProcess, product] = await Promise.all([
        makeProcessingProcess(generateStages(data, 'glass'), ctx),
        makeProduct({ ctx, data, material: data.initialData.material, createdEntitys, order, type: 'Стекло' })
    ])
    const plan = await makeProcessingPlan({ ctx, data, name: 'Доска стеклянная магнитно-маркерная ASKELL Size', order, processingProcess, product, isPF: true, material: data.initialData.material, createdEntitys, mode: 'glass' })
    plan.quantity = position.quantity
    plan._material = data.initialData.material
    results.polevGlass.push(plan)

    const planViz = await makeProcessingPlan({ ctx, data, name: 'Доска стеклянная магнитно-маркерная ASKELL Size', order, processingProcess: VIZ_SMD_PROCESSING_PROCESS, product: position.assortment, color, materialMeta: product.meta, createdEntitys, mode: 'smd', viz: true })
    await makeProductionTask({
        ctx,
        materialsStore: 'ВИЗ ПФ',
        productsStore: 'ВИЗ СГИ',
        productionRows: [{ processingPlan: { meta: planViz.meta }, productionVolume: position.quantity }],
        order,
        checkboxes: { viz: true, smd: true, print, height: data.initialData.height, width: data.initialData.width, colors: [color] },
        reserve: true,
        addComment: '',
        createdEntitys
    })
}
