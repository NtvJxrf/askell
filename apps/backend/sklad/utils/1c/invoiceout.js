const expInvoiceout = async (filter, ctx) => {
    const { startDate, endDate } = filter
    const res = await ctx.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/invoiceout?filter=moment>${startDate} 00:00:00;moment<${endDate} 23:59:59&expand=positions.assortment,agent,store,organization,agentAccount` })
    const uom = await ctx.call('proxy.fetchAllRows', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/uom?' })
    const result = []

    for(const invoice of res){
        const itemToPush = {
            organizationINN: invoice.organization.inn,
            documentName: invoice.name,
            moment: invoice.moment,
            store: invoice?.store?.name || undefined,
            paymentPlannedMoment: invoice?.paymentPlannedMoment || undefined,
            agentINN: invoice.agent?.inn || undefined,
            agentKPP: invoice.agent?.kpp || undefined,
            agentName: invoice.agent?.name || undefined,
            agentAccountNumber: invoice.agentAccount?.accountNumber || undefined,
            agentBic: invoice.agentAccount?.bic || undefined,
            factureOut: invoice?.factureOut?.name || undefined,
            positions: invoice.positions.rows.map( el => {
                const discountedUnitPrice = el.price * (1 - el.discount / 100)
                return {
                    type: el.assortment.meta.type,
                    code: el.assortment.code,
                    name: el.assortment.name,
                    group: chooseGroupProduct(el.assortment),
                    uomCode: uom.find(u => u.meta.href === el.assortment?.uom?.meta?.href)?.code || undefined,
                    quantity: el.quantity,
                    vat: el.vat,
                    vatValue: Math.round(discountedUnitPrice * el.vat / (100 + el.vat) * el.quantity) / 100,
                    price: discountedUnitPrice / 100 * el.quantity,
                    discount: el.discount,
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
export default expInvoiceout