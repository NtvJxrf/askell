import generateStages from '../generateStages.js'
import { makeProcessingProcess, makeProduct, makeProcessingPlan } from '../apiHelpers.js'
import generateProductAttributes from '../generateProductAttributes.js'
import { getData } from '../dataManager.js'
import { productFoldersByType, uomMeta } from '../constants.js'

// Триплексная панель стеклопакета: стёкла панели -> glasst3, сама панель (ПФ) -> triplext2.
const buildTriplexPane = async ({ ctx, triplexData, order, position, createdEntitys, results }) => {
    const { sklad_materials, attributes } = getData()

    if (triplexData.initialData.print) results.print = true

    const materials = Object.entries(triplexData.initialData)
        .filter(([key, value]) => key.startsWith('material') && value !== undefined)
        .map(([, value]) => value)
    const stagesGlass = generateStages(triplexData, 'glass')
    const pfs = []
    const glassPlans = []
    for (const material of materials) {
        const [processingProcess, product] = await Promise.all([
            makeProcessingProcess(stagesGlass, ctx),
            makeProduct({ ctx, data: triplexData, material, createdEntitys, order, type: 'Стекло', pfFor: 'Триплекс' })
        ])
        const plan = await makeProcessingPlan({ ctx, data: triplexData, name: position.assortment.name, order, processingProcess, product, isPF: true, material, createdEntitys, mode: 'glass' })
        plan.quantity = position.quantity
        plan._material = material
        glassPlans.push(plan)
        pfs.push(product)
    }

    // Синтетический ПФ собранной триплексной панели (в каталоге такой позиции нет).
    const { height, width } = triplexData.initialData
    const paneProduct = await ctx.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/product', type: 'post', data: {
        name: `ПФ Триплекс (${height}х${width}, ${materials.join(' + ')}, площадь: ${(height * width / 1000000).toFixed(2)})`,
        attributes: generateProductAttributes({ height, width, isPF: true, order, type: 'Триплекс', material1: materials[0], material2: materials[1] }, attributes, sklad_materials),
        volume: Number((triplexData.result.other.S).toFixed(2)),
        uom: uomMeta,
        productFolder: productFoldersByType['ПФ']
    } })
    createdEntitys.product.push(paneProduct)

    const materialsTriplex = pfs.map(pf => ({ assortment: { meta: pf.meta }, quantity: 1 }))
    const tapes = triplexData.result.materials.filter(material => material.name.toLowerCase().includes('пленка'))
    for (const tape of tapes) {
        materialsTriplex.push({ assortment: { meta: sklad_materials[tape.name].meta }, quantity: tape.count })
    }
    const processingProcessTriplex = await makeProcessingProcess(generateStages(triplexData, 'triplex'), ctx)
    const panePlan = await makeProcessingPlan({ ctx, data: triplexData, name: position.assortment.name, order, processingProcess: processingProcessTriplex, product: paneProduct, isPF: true, materials: materialsTriplex, createdEntitys })
    panePlan.quantity = position.quantity
    if (triplexData.initialData.color) panePlan._color = triplexData.initialData.color

    // Стёкла панели — ПЗ 3-го уровня, связываются с ПЗ триплексной панели.
    for (const plan of glassPlans) {
        plan._parentPlan = panePlan
        results.glasst3.push(plan)
    }
    return { paneProduct, panePlan }
}

export const glassPacket = async ({ ctx, data, order, position, createdEntitys, results }) => {
    const { sklad_materials, colors } = getData()
    const materialsList = { ...sklad_materials, ...colors }

    const {
        material1, material2, material3,
        tempered1, tempered2, tempered3,
        processing1, processing2, processing3,
        color1, color2, color3
    } = data.initialData
    const materials = [
        [material1, tempered1, processing1, color1],
        [material2, tempered2, processing2, color2],
        [material3, tempered3, processing3, color3]
    ].filter(el => el[0])

    // Полные расчёты триплексных панелей, потребляются в порядке следования панелей.
    const usedTriplex = [...(data.result.other.usedTriplex || [])]
    const pfs = []
    const glassPlans = []
    const panePlans = []
    for (const material of materials) {
        if (material[0].toLowerCase().includes('триплекс')) {
            const triplexData = usedTriplex.find(t => t.name === material[0])
            if (!triplexData) throw new Error(`Нет данных триплекса для панели "${material[0]}" стеклопакета`)
            const { paneProduct, panePlan } = await buildTriplexPane({ ctx, triplexData, order, position, createdEntitys, results })
            pfs.push(paneProduct)
            panePlans.push(panePlan)
            continue
        }
        const [processingProcess, product] = await Promise.all([
            makeProcessingProcess(generateStages(material, 'glassPolev'), ctx),
            makeProduct({ ctx, data, material: material[0], createdEntitys, order, type: 'Стекло', processingSPO: material[2], colorSPO: material[3], temperedSPO: material[1], pfFor: 'Стеклопакет' })
        ])
        const plan = await makeProcessingPlan({ ctx, data, name: position.assortment.name, order, processingProcess, product, isPF: true, material: material[0], createdEntitys, mode: 'glass' })
        plan._material = material[0]
        plan.quantity = position.quantity
        glassPlans.push(plan)
        pfs.push(product)
    }

    const processingProcessPolev = await makeProcessingProcess(generateStages(data, 'SPbuild'), ctx)
    const materialsSP = pfs.map(pf => ({ assortment: { meta: pf.meta }, quantity: 1 }))
    const excludedWords = ['стекло', 'зеркало', 'триплекс']
    const filteredMaterials = data.result.materials.filter(el => !excludedWords.some(word => el.name.toLowerCase().includes(word)))
    for (const material of filteredMaterials) {
        materialsSP.push({
            assortment: { meta: materialsList[material.name].meta },
            quantity: material.count
        })
    }

    const planPolev = await makeProcessingPlan({ ctx, data, name: position.assortment.name, order, processingProcess: processingProcessPolev, product: position.assortment, isPF: false, materials: materialsSP, createdEntitys })
    planPolev.quantity = position.quantity
    results.glasspacket.push(planPolev)
    // ПФ стеклопакета — ПЗ 2-го уровня, связываются с ПЗ сборки стеклопакета.
    for (const plan of glassPlans) {
        plan._parentPlan = planPolev
        results.glasst2.push(plan)
    }
    for (const plan of panePlans) {
        plan._parentPlan = planPolev
        results.triplext2.push(plan)
    }
}
