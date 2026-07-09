import generateStages from '../generateStages.js'
import { makeProcessingProcess, makeProcessingPlan } from '../apiHelpers.js'

export const glass = async ({ ctx, data, order, position, createdEntitys, results }) => {
    if (data.initialData.print) results.print = true
    if (data.initialData.color) results.colors.push(data.initialData.color)

    const processingProcess = await makeProcessingProcess(generateStages(data, 'glass'), ctx)
    const plan = await makeProcessingPlan({ ctx, data, name: position.assortment.name, order, processingProcess, product: position.assortment, isPF: false, material: data.initialData.material, createdEntitys, mode: 'glass' })
    plan._material = data.initialData.material
    plan.quantity = position.quantity
    results.glass.push(plan)
}
