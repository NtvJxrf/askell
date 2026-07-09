import generateStages from '../generateStages.js'
import { makeProcessingProcess, makeProduct, makeProcessingPlan } from '../apiHelpers.js'

export const glass = async ({ ctx, data, order, position, createdEntitys, results }) => {
    if (data.initialData.print) results.print = true
    if (data.initialData.color) results.colors.push(data.initialData.color)
    
    if(data.initialData.color){

    }else{
        
    }
    const isPF = data.result.other.viz
    const processingProcess = await makeProcessingProcess(generateStages(data, 'glass'), ctx)
    const product = isPF
        ? await makeProduct({ ctx, data, material: data.initialData.material, createdEntitys, order, type: 'Стекло' })
        : position.assortment

    const plan = await makeProcessingPlan({ ctx, data, name: position.assortment.name, order, processingProcess, product, isPF, material: data.initialData.material, createdEntitys, mode: 'glass' })
    plan._material = data.initialData.material
    plan.quantity = position.quantity
    results.polevGlass.push(plan)

    if (isPF) {
        const processingProcessViz = await makeProcessingProcess(generateStages(data, 'viz'), ctx)
        const planViz = await makeProcessingPlan({
            ctx,
            data,
            name: position.assortment.name,
            order,
            processingProcess: processingProcessViz,
            product: position.assortment,
            isPF: false,
            materials: [{ assortment: { meta: product.meta }, quantity: 1 }],
            createdEntitys,
            viz: true
        })
        planViz.quantity = position.quantity
        results.viz.push(planViz)
    }
}
