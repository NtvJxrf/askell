import generateStages from '../generateStages.js'
import { makeProcessingProcess, makeProduct, makeProcessingPlan } from '../apiHelpers.js'
import { getData } from '../dataManager.js'

export const triplex = async ({ data, order, position, createdEntitys, results }) => {
    const { sklad_materials } = getData()

    results.triplex = true
    if (data.initialData.print) results.print = true
    if (data.initialData.color) results.colors.push(data.initialData.color)

    const materials = Object.entries(data.initialData)
        .filter(([key, value]) => key.startsWith('material') && value !== undefined)
        .map(([, value]) => value)
    const stagesSelk = generateStages(data, 'selk')
    const pfs = []
    for (const material of materials) {
        const [processingProcess, product] = await Promise.all([
            makeProcessingProcess(stagesSelk),
            makeProduct({ data, material, createdEntitys, order, type: 'Стекло' })
        ])
        const plan = await makeProcessingPlan({ data, name: position.assortment.name, order, processingProcess, product, isPF: true, material, createdEntitys, mode: 'glass' })
        plan.quantity = position.quantity
        plan._material = material
        results.polevGlassForSp.push(plan)
        pfs.push(product)
    }

    const processingProcessViz = await makeProcessingProcess(generateStages(data, 'viz'))
    const materialsViz = pfs.map(pf => ({ assortment: { meta: pf.meta }, quantity: 1 }))
    const tapes = data.result.materials.filter(material => material.name.toLowerCase().includes('пленка'))
    for (const tape of tapes) {
        materialsViz.push({ assortment: { meta: sklad_materials[tape.name].meta }, quantity: tape.count })
    }
    const planTriplex = await makeProcessingPlan({
        data,
        name: position.assortment.name,
        order,
        processingProcess: processingProcessViz,
        product: position.assortment,
        isPF: false,
        materials: materialsViz,
        createdEntitys,
        viz: true
    })
    planTriplex.quantity = position.quantity
    results.triplexPz.push(planTriplex)
}
