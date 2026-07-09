const normalizeTaskUrl = (url) => {
    const match = url.match(
        /(https:\/\/api\.moysklad\.ru\/api\/remap\/1\.2\/entity\/productiontask\/[^/]+)/
    )
    return match?.[1]
}
const expProd = async (filter, ctx) => {
    const { startDate, endDate } = filter
    const completions = await ctx.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/productionstagecompletion?filter=moment>${startDate} 00:00:00;moment<${endDate} 23:59:59&expand=productionStage.productionRow,products.assortment` })
    const uom = await ctx.call('proxy.fetchAllRows', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/uom?' })
    const productionTasks = new Set()
    const completionsForExport = []
    for(const completion of completions){
        if(completion.products){
            completionsForExport.push(completion)
            const taskId = normalizeTaskUrl(completion.productionStage.productionRow.meta.href)
            if (productionTasks.has(taskId)) continue
            productionTasks.add(taskId)
        }
    }
    const promises = []
    const promises2 = []
    for(const task of productionTasks){
        promises.push(ctx.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/productionstagecompletion?filter=productionTask=${task}&expand=productionStage.productionRow,materials.assortment` }))
        promises2.push(ctx.call('proxy.sklad', { url: `${task}?expand=organization,productsStore` }))
    }
    const completionsByTasks = await Promise.all(promises)
    const allTasks = await Promise.all(promises2)
    const seen = new Set()
    const allCompletionsByProductionRow = []

    for (const arr of completionsByTasks) {
        for (const obj of arr) {
            if (obj.defect) continue
            if (seen.has(obj.meta.href)) continue

            seen.add(obj.meta.href)
            allCompletionsByProductionRow.push(obj)
        }
    }
    const allCompletedStages = {}
    for (const row of allCompletionsByProductionRow) {
        const rowHref = row.productionStage.productionRow.meta.href
        const pos = row.productionStage.orderingPosition

        allCompletedStages[rowHref] ??= {}
        allCompletedStages[rowHref][pos] ??= []

        const volume = row.productionVolume

        if (volume === 1) {
            allCompletedStages[rowHref][pos].push({
                quantity: row.productionVolume,
                created: row.created,
                materials: row?.materials?.rows.map(m => ({
                    ...m,
                    quantity: m.consumedQuantity / volume
                })) ?? [],
                id: row.id
            })
            continue
        }

        const perUnitMaterials = (row?.materials?.rows ?? []).map(m => ({
            ...m,
            quantity: m.consumedQuantity / volume
        }))

        for (let i = 0; i < volume; i++) {
            allCompletedStages[rowHref][pos].push({
                quantity: row.productionVolume,
                created: row.created,
                materials: perUnitMaterials,
                id: row.id
            })
        }
    }
    for (const rowHref of Object.keys(allCompletedStages)) {
        for (const pos of Object.keys(allCompletedStages[rowHref])) {
            allCompletedStages[rowHref][pos].sort(
                (a, b) => new Date(a.created) - new Date(b.created)
            )
        }
    }
    const result = []
    for (const el of completionsForExport) {
        const rowHref = el.productionStage.productionRow.meta.href
        const lastStage = el.productionStage.orderingPosition
        const finalMaterials = {}
        const mainTaskHref = normalizeTaskUrl(el.productionStage.productionRow.meta.href)
        let finalStageCounted = false
        let mainTask = allTasks.find(el => el.meta.href.split('?')[0] === mainTaskHref)
        const attrs = (el.products.rows[0].assortment.attributes || []).reduce((a, x) => {
            a[x.name] = x.value;
            return a;
        }, {});
        for(const [index, item] of allCompletedStages[rowHref][lastStage].entries()){
            if(item.id === el.id){
                for(let i = 0; i < lastStage; i++){
                    for(const material of allCompletedStages[rowHref][i][index].materials){
                        const assortment = material.assortment
                        finalMaterials[assortment.name] ??= {
                            name: assortment.name,
                            quantity: 0,
                            code: assortment.code,
                            group: chooseGroupProduct(attrs['Тип изделия']),
                            uomCode: uom.find(el => el?.meta?.href === assortment?.uom?.meta?.href)?.code || ''
                        }
                        finalMaterials[assortment.name].quantity += material?.quantity || 0
                    }
                }
                if (!finalStageCounted) {
                    for (const material of item.materials) {
                        const assortment = material.assortment
                        finalMaterials[assortment.name] ??= {
                            name: assortment.name,
                            quantity: 0,
                            code: assortment.code,
                            group: chooseGroupProduct(attrs['Тип изделия']),
                            uomCode: uom.find(el => el.meta.href === assortment?.uom?.meta?.href)?.code || ''
                        }
                        finalMaterials[assortment.name].quantity += material.consumedQuantity
                    }
                    finalStageCounted = true
                }
            }
        }
        result.push({
            documentId: el.id,
            materials: Object.values(finalMaterials),
            documentName: el.name,
            productName: el.products.rows[0].assortment.name,
            productUomCode: uom.find(m => m.meta.href === el?.products?.rows[0]?.assortment?.uom?.meta?.href)?.code || '',
            productGroup: chooseGroupProduct(attrs['Тип изделия']),
            productId: el.products.rows[0].assortment.id,
            productCode: el.products.rows[0].assortment.code,
            productQuantity: el.products.rows[0].producedQuantity,
            organizationINN: mainTask.organization.inn,
            productsStore: mainTask.productsStore.name,
            moment: el.moment
        })
    }
    return result
}
function chooseGroupProduct(productType){
    switch(productType){
        case 'Керагласс':
            return 'Керагласс'

        case 'ПФ':
        case 'Триплекс':
        case 'Стекло':
            return 'Стекло'

        case 'СМД':
            return 'СМД'

        case 'Стеклопакет':
            return 'Стеклопакет'
        default: 
            return 'Стекло'
    }
}
export default expProd