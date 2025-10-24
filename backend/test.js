import SkladService from './src/services/sklad.service.js'
import Client from './src/utils/got.js';
import { broadcast } from './src/utils/WebSocket.js';
import { google } from "googleapis";
import dotenv from 'dotenv';
import Details from './src/databases/models/sklad/details.model.js';

const details = await Details.findAll()
details.map(el => {
    console.log(el.id)
})
const res = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', details.map(el => {
    return {
        meta: {
            "href": `https://api.moysklad.ru/api/remap/1.2/entity/product/${el.productId}`,
            "metadataHref": "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
            "type": "product",
            "mediaType": "application/json"
        },
        attributes: [{
            "meta" : {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/97c9d19a-ae6f-11f0-0a80-082b000da4e9",
                "type" : "attributemetadata",
                "mediaType" : "application/json"
            },
            value: JSON.stringify({
                initialData: el.initialData,
                result: el.result
            })
        }]
    }
}))
console.log(res)