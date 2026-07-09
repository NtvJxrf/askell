import generateStages from '../generateStages.js'
import { makeProcessingProcess, makeProduct, makeProcessingPlan } from '../apiHelpers.js'
import { getData } from '../dataManager.js'

export const triplex = async ({ ctx, data, order, position, createdEntitys, results }) => {
    const { sklad_materials } = getData()

    if (data.initialData.print) results.print = true
    if (data.initialData.color) results.colors.push(data.initialData.color)

    const materials = Object.entries(data.initialData)
        .filter(([key, value]) => key.startsWith('material') && value !== undefined)
        .map(([, value]) => value)
    const stagesSelk = generateStages(data, 'glass')
    const pfs = []
    const glassPlans = []
    for (const material of materials) {
        const [processingProcess, product] = await Promise.all([
            makeProcessingProcess(stagesSelk, ctx),
            makeProduct({ ctx, data, material, createdEntitys, order, type: 'Стекло', pfFor: 'Триплекс' })
        ])
        const plan = await makeProcessingPlan({ ctx, data, name: position.assortment.name, order, processingProcess, product, isPF: true, material, createdEntitys, mode: 'glass' })
        plan.quantity = position.quantity
        plan._material = material
        glassPlans.push(plan)
        pfs.push(product)
    }

    const processingProcessTriplex = await makeProcessingProcess(generateStages(data, 'triplex'), ctx)
    const materialsViz = pfs.map(pf => ({ assortment: { meta: pf.meta }, quantity: 1 }))
    const tapes = data.result.materials.filter(material => material.name.toLowerCase().includes('пленка'))
    for (const tape of tapes) {
        materialsViz.push({ assortment: { meta: sklad_materials[tape.name].meta }, quantity: tape.count })
    }
    const planTriplex = await makeProcessingPlan({
        ctx,
        data,
        name: position.assortment.name,
        order,
        processingProcess: processingProcessTriplex,
        product: position.assortment,
        isPF: false,
        materials: materialsViz,
        createdEntitys,
        viz: true
    })
    planTriplex.quantity = position.quantity
    results.triplex.push(planTriplex)
    // Стёкла триплекса — ПЗ 2-го уровня, связываются с ПЗ самого триплекса.
    for (const plan of glassPlans) {
        plan._parentPlan = planTriplex
        results.glasst2.push(plan)
    }
}
