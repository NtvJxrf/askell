import generateStages from '../generateStages.js'
import { makeProcessingProcess, makeProcessingPlan } from '../apiHelpers.js'
import generateProductAttributes from '../generateProductAttributes.js'
import { getData } from '../dataManager.js'
import { productFoldersByType } from '../constants.js'

export const ceraglass = async ({ ctx, data, order, position, createdEntitys, results }) => {
    const { sklad_materials, attributes } = getData()

    results.ceraglass = true
    if (data.initialData.color) results.colors.push(data.initialData.color)

    const materials = [data.initialData.material1, data.initialData?.material2].filter(Boolean)
    const heights = data.result.other.heights
    const widths = data.result.other.widths
    const stagesSelk = generateStages(data, 'glass')
    const stagesViz = generateStages(data, 'vizCera')
    const { processing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, color, print } = data.initialData
    const { stanok } = data.result.other
    const pfs = []

    for (const material of materials) {
        const isGlass = material.toLowerCase().includes('стекло')
        for (let i = 0; i < heights.length; i++) {
            const attrs = { height: heights[i], width: widths[i], processing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, color, print, ifPF: true, order, material, stanok, type: isGlass ? 'Стекло' : 'Керамика' }
            const name = isGlass
                ? `ПФ ${material} (${heights[i]}х${widths[i]}${processing}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''})`
                : `ПФ ${material} (${heights[i]}х${widths[i]}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''})`

            const product = await ctx.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/product', type: 'post', data: {
                name,
                attributes: generateProductAttributes(attrs, attributes, sklad_materials),
                productFolder: productFoldersByType['ПФ']
            } })
            createdEntitys.product.push(product)

            if (isGlass) {
                const processingProcess = await makeProcessingProcess(stagesSelk, ctx)
                const plan = await makeProcessingPlan({
                    ctx,
                    data: { ...data, initialData: { height: heights[i], width: widths[i] } },
                    name: position.assortment.name, order, processingProcess, product, isPF: true, material, createdEntitys, mode: 'glass'
                })
                plan.quantity = position.quantity
                plan._material = material
                results.polevGlass.push(plan)
            } else {
                const processingProcess = await makeProcessingProcess(stagesViz, ctx)
                const newData = { ...data, initialData: { height: heights[i], width: widths[i] }, ceraTrim: data.result.other.ceraTrim }
                const mode = material === 'Керамика клиента' ? 'default' : 'glass'
                const plan = await makeProcessingPlan({ ctx, data: newData, name: position.assortment.name, order, processingProcess, product, isPF: true, material, createdEntitys, mode })
                plan.quantity = position.quantity
                results.viz.push(plan)
            }
            pfs.push(product)
        }
    }

    const materialsViz = pfs.map(pf => ({ assortment: { meta: pf.meta }, quantity: 1 }))
    data.initialData.blank && materialsViz.push({ assortment: { meta: sklad_materials['Пятак капролон черный D32 H11 М8'].meta }, quantity: data.initialData.blank })
    data.initialData.type !== 'Керамика' && materialsViz.push({ assortment: { meta: sklad_materials['Клей кераглас'].meta }, quantity: data.result.materials.find(el => el.name === 'Клей кераглас').count })
    data.result.additions.forEach(el => materialsViz.push({ assortment: { meta: sklad_materials[el.name].meta }, quantity: el.count }))

    const processingProcessViz = await makeProcessingProcess(['ОТК'], ctx)
    const planViz = await makeProcessingPlan({ ctx, data, name: position.assortment.name, order, processingProcess: processingProcessViz, product: position.assortment, isPF: false, materials: materialsViz, createdEntitys, viz: true })
    planViz.quantity = position.quantity
    results.viz.push(planViz)
}
