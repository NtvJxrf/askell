const goodInfo = async ({ user, dataFromForm}, ctx) => {
    const good = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/product/${dataFromForm.id}` });
    const stocks = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/report/stock/bystore?filter=product=https://api.moysklad.ru/api/remap/1.2/entity/product/${good.id}` });
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    const momentFrom = d.toISOString().slice(0, 19).replace('T', ' ')
    const operations = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/report/turnover/byoperations?filter=product=https://api.moysklad.ru/api/remap/1.2/entity/product/${good.id}&momentFrom=${encodeURIComponent(momentFrom)}` });
    const supplies = operations.rows
        .filter(op => op.operation.meta.type === 'supply')
        .sort((a, b) => {
            return new Date(b.operation.moment) - new Date(a.operation.moment)
        })
    const lossByMonths = Object.values(operations.rows.reduce((acc, op) => {
            if (['productionstagecompletion', 'loss'].includes(op.operation.meta.type)) {
                const monthDate = new Date(op.operation.moment)
                const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`

                if (!acc[month]) {
                    acc[month] = {
                        month,
                        sum: 0,
                        quantity: 0,
                        operationsCount: 0,
                    }
                }

                acc[month].sum += op.sum / 100
                acc[month].quantity += op.quantity
                acc[month].operationsCount += 1
            }
            return acc
        }, {})).map(monthLoss => ({
            ...monthLoss,
            averageSum: monthLoss.operationsCount ? monthLoss.sum / monthLoss.operationsCount : 0,
            averageQuantity: monthLoss.operationsCount ? monthLoss.quantity / monthLoss.operationsCount : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
    const averageLossByYear = lossByMonths.reduce((acc, monthLoss, _, lossMonths) => {
        acc.averageSum += monthLoss.sum / lossMonths.length
        acc.averageQuantity += monthLoss.quantity / lossMonths.length
        return acc
    }, { averageSum: 0, averageQuantity: 0 })
    return {
        message: `Информация по товару "${good.name}"`,
        lastSupplies: supplies?.slice(0, 5)?.map(supply => ({
            sum: supply.sum / 100,
            cost: supply.cost / 100,
            quantity: supply.quantity,
            date: supply.operation.moment,
        })) || [],
        stocks: stocks?.rows[0]?.stockByStore?.map(stock => ({
            store: stock.name,
            stock: stock.stock,
            reserve: stock.reserve,
            available: stock.stock - stock.reserve,
        })) || [],
        loss: lossByMonths,
        averageLoss: averageLossByYear,
        uom: operations.rows[0]?.assortment?.uom?.name || undefined,
        minimumStock: good.minimumBalance
    }
}
export default goodInfo;