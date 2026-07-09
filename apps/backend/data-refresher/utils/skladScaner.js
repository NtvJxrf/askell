import { valkey } from "@askell/shared"
import { broker } from "../index.js"
export const scanNonPayedOrders = async () => {
    const orders = await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=state.name=Готово, не оплачено' })
    const states = JSON.parse(await valkey.get('sklad:data:states')).customerorder
    for(const order of orders.rows){
        if(order.payedSum >= order.sum){
            await broker.call('proxy.sklad', { 
                url: order.meta.href,
                type: 'put',
                data: { 
                    state: { 
                        meta: states['Готово'].meta
                    } 
                } 
            })
        }
    }
}
export async function createCartonLoss (){
    const today = new Date()
    const date = today.toISOString().slice(0, 10) // YYYY-MM-DD
    const response = await broker.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/demand?filter=moment>${date} 00:00:00;moment<${date} 23:59:59&expand=positions.assortment,store` })
    const result = {
        'ВИЗ СГИ': {
            material: { 
                meta: {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/ebd475e0-cfa7-11ed-0a80-06340009e199",
                    "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
                    "type" : "product",
                    "mediaType" : "application/json",
                    "uuidHref" : "https://online.moysklad.ru/app/#good/edit?id=ebd46a1f-cfa7-11ed-0a80-06340009e197"
                }
            },
            store: 'ВИЗ ПФ'
        },
        'Селькоровская СГИ': {
            material: { 
                meta: {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/999bfc2a-b83a-11ed-0a80-01380014f345",
                    "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
                    "type" : "product",
                    "mediaType" : "application/json",
                    "uuidHref" : "https://online.moysklad.ru/app/#good/edit?id=999bf32d-b83a-11ed-0a80-01380014f343"
                    }
            },
            store: 'Селькоровская материалы/прочее'
        },
        'Полеводство СГИ': {
            material: { 
                meta: {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/999bfc2a-b83a-11ed-0a80-01380014f345",
                    "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
                    "type" : "product",
                    "mediaType" : "application/json",
                    "uuidHref" : "https://online.moysklad.ru/app/#good/edit?id=999bf32d-b83a-11ed-0a80-01380014f343"
                    }
            },
            store: 'Полеводство материалы/прочее'
        }
    }
    for(const row of response){
        for(const position of row.positions.rows){
            if(position.assortment.name.includes('Упаковка в картон') && position.price > 0){
                if(!result[row.store.name]) continue
                result[row.store.name][row.name] = (result[row.store.name][row.name] ?? 0) + (position.price > 200 ? position.quantity * 2 : position.quantity);
            }
        }
    }
    const stores = JSON.parse(await valkey.get('sklad:data:stores'))
    for(const store in result){
        let description = `Списание за период: ${date}\n`
        for(const row in result[store]){
            if (!Number.isFinite(result[store][row])) continue
            description += `Для отгрузки № ${row} списано ${result[store][row]}\n`
        }
        const posData = Object.values(result[store]).reduce((acc, curr) => {
            if (!Number.isFinite(curr)) return acc;
            acc.quantity += curr
            return acc
        }, {
            assortment: result[store].material,
            quantity: 0
        })
        if(posData.quantity <= 0) continue
        await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/loss', type: 'post', data: {
            organization: {
                "meta" : {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/organization/ecb1e71e-cfd4-11e5-7a69-97110006a2a3",
                    "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/organization/metadata",
                    "type" : "organization",
                    "mediaType" : "application/json",
                    "uuidHref" : "https://online.moysklad.ru/app/#mycompany/edit?id=ecb1e71e-cfd4-11e5-7a69-97110006a2a3"
                }
            },
            store: { meta: stores[result[store].store].meta },
            positions: [posData],
            description
        }})
    }
    return true
}