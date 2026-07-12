const expDemands = async (filter, ctx) => {
    const { startDate, endDate } = filter
    const res = await ctx.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/demand?filter=moment>${startDate} 00:00:00;moment<${endDate} 23:59:59&expand=positions.assortment,agent,store,factureOut,organization`})
    const uom = await ctx.call('proxy.fetchAllRows', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/uom?' })
    const result = []

    for(const demand of res){
        const itemToPush = {
            organizationINN: demand.organization.inn,
            documentName: demand.name,
            moment: demand.moment,
            store: demand.store.name,
            agentINN: demand.agent?.inn || undefined,
            agentKPP: demand.agent?.kpp || undefined,
            agentName: demand.agent?.name || undefined,
            factureOut: demand?.factureOut?.name || undefined,
            positions: demand.positions.rows.map( el => {
                const discountedUnitPrice = el.price * (1 - el.discount / 100)
                return {
                    type: el.assortment.type,
                    code: el.assortment.code,
                    name: el.assortment.name,
                    group: chooseGroupProduct(el.assortment),
                    uomCode: uom.find(u => u.meta.href === el.assortment?.uom?.meta?.href)?.code || undefined,
                    quantity: el.quantity,
                    discount: el.discount,
                    vat: el.vat,
                    vatValue: Math.round(discountedUnitPrice * el.vat / (100 + el.vat) * el.quantity) / 100,
                    price: discountedUnitPrice / 100 * el.quantity,
                }
            })
        }
        result.push(itemToPush)
    }
    function chooseGroupProduct(assortment){
        if(assortment.meta.type === 'service') return 'Услуга'
        if(assortment.meta.type === 'variant') return 'Стекло'
        const productType = assortment.attributes?.find(attr => attr.name === 'Тип изделия')?.value
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
                return undefined
        }
    }
    return result
}
export default expDemands