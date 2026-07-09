const deleteEntitys = async (deletedPositions, ctx) => {
    try{
        if(deletedPositions.length > 0){
            const productsToDelete = deletedPositions.filter(el => el.meta.type === 'product')
            const servicesToDelete = deletedPositions.filter(el => el.meta.type === 'service')

            let responseProducts = []
            let responseServices = []

            if(productsToDelete.length > 0){
                responseProducts = await ctx.call('proxy.sklad', {url: "https://api.moysklad.ru/api/remap/1.2/entity/product/delete", type: "post", data: productsToDelete.map(el => ({meta: el.meta}))}).catch(err => {ctx.broker.logger.error({ err }, "Ошибка при удалении товаров"); return []})
            }
            if(servicesToDelete.length > 0){
                responseServices = await ctx.call('proxy.sklad', {url: "https://api.moysklad.ru/api/remap/1.2/entity/service/delete", type: "post", data: servicesToDelete.map(el => ({meta: el.meta}))}).catch(err => {ctx.broker.logger.error({ err }, "Ошибка при удалении услуг"); return []})
            }

            const responses = [...responseProducts, ...responseServices]
            const allRecords = [...productsToDelete, ...servicesToDelete]
        }
    }catch(err){
        ctx.broker.logger.error({ err }, 'Ошибка в deleteEntitys')
    }
}
export default deleteEntitys