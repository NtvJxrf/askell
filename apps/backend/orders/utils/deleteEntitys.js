const deleteEntitys = async (deletedPositions, broker) => {
    try{
        if(deletedPositions.length > 0){
            const productsToDelete = deletedPositions.filter(el => el.meta.type === 'product')
            const servicesToDelete = deletedPositions.filter(el => el.meta.type === 'service')

            let responseProducts = []
            let responseServices = []

            if(productsToDelete.length > 0){
                responseProducts = await broker.call('proxy.sklad', {url: "https://api.moysklad.ru/api/remap/1.2/entity/product/delete", type: "post", data: productsToDelete.map(el => ({meta: el.meta}))}).catch(err => {console.error("Ошибка при удалении товаров", err); return []})
            }
            if(servicesToDelete.length > 0){
                responseServices = await broker.call('proxy.sklad', {url: "https://api.moysklad.ru/api/remap/1.2/entity/service/delete", type: "post", data: servicesToDelete.map(el => ({meta: el.meta}))}).catch(err => {console.error("Ошибка при удалении услуг", err); return []})
            }

            const responses = [...responseProducts, ...responseServices]
            const allRecords = [...productsToDelete, ...servicesToDelete]
        }
    }catch(err){
        console.log(err)
    }
}
export default deleteEntitys