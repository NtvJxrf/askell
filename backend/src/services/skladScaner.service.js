import Client from '../utils/got.js'
export const scanNonPayedOrders = async () => {
    const orders = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=state.name=Готово, не оплачено')
    for(const order of orders.rows){
        if(order.payedSum >= order.sum){
            await Client.sklad(order.meta.href, 'put', {
                state: {
                    meta: {
                        "href" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/9118ca69-9302-11ed-0a80-08e10003a2df",
                        "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata",
                        "type" : "state",
                        "mediaType" : "application/json"
                    }
                }
            })
        }
    }
}
scanNonPayedOrders()
setInterval(async () => {
    try {
        await scanNonPayedOrders()
    } catch (err) {
        console.error('scanNonPayedOrders error:', err)
        logger.error('scanNonPayedOrders error:', err)
    }
}, 300_000)//Каждые 5 минут