import generateStages from '../generateStages.js'
import { makeProcessingProcess, makeProduct, makeProcessingPlan } from '../apiHelpers.js'
import { getData } from '../dataManager.js'

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

    const pfs = []
    for (const material of materials) {
        const [processingProcess, product] = await Promise.all([
            makeProcessingProcess(generateStages(material, 'glassPolev'), ctx),
            makeProduct({ ctx, data, material: material[0], createdEntitys, order, type: 'Стекло', processingSPO: material[2], colorSPO: material[3], temperedSPO: material[1] })
        ])
        const plan = await makeProcessingPlan({ ctx, data, name: position.assortment.name, order, processingProcess, product, isPF: true, material: material[0], createdEntitys, mode: 'glass' })
        plan._material = material[0]
        plan.quantity = position.quantity
        results.polevGlassForSp.push(plan)
        pfs.push(product)
    }

    const processingProcessPolev = await makeProcessingProcess(generateStages(data, 'SPbuild'), ctx)
    const materialsSP = pfs.map(pf => ({ assortment: { meta: pf.meta }, quantity: 1 }))
    const excludedWords = ['стекло', 'зеркало', 'триплекс']
    const filteredMaterials = data.result.materials.filter(el => !excludedWords.some(word => el.name.toLowerCase().includes(word)))
    for (const material of filteredMaterials) {
        materialsSP.push({
            assortment: { meta: materialsList[material.name].meta },
            quantity: material.name === 'Аргон' ? material.value / 58.75 : material.count
        })
    }

    const planPolev = await makeProcessingPlan({ ctx, data, name: position.assortment.name, order, processingProcess: processingProcessPolev, product: position.assortment, isPF: false, materials: materialsSP, createdEntitys })
    planPolev.quantity = position.quantity
    results.polevSP.push(planPolev)
}
