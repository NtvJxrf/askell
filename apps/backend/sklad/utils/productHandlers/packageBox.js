import { makeProcessingProcess, makeProcessingPlan } from '../apiHelpers.js'
import { getData } from '../dataManager.js'

export const packageBox = async ({ ctx, data, order, position, createdEntitys, results }) => {
    const { sklad_packaging } = getData()

    const processingProcess = await makeProcessingProcess(['Сборка ящика', 'ОТК'], ctx)
    const materials = data.result.materials.map(el => ({ assortment: { meta: sklad_packaging[el.name].meta }, quantity: el.count }))
    const plan = await makeProcessingPlan({ ctx, name: position.assortment.name, order, processingProcess, product: position.assortment, materials, createdEntitys, mode: 'package' })
    plan.quantity = position.quantity
    results.polevGlass.push(plan)
}
