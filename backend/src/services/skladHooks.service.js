import Client from "../utils/got.js"
import SkladService from "./sklad.service.js"
import axios from 'axios'
export default class SkladHooks{
    static async pzChange(data){
        let document = null
        let order = null
        const event = data.events[0]
        if(event.updatedFields.includes('Отложенная дата производства')){
            document ??= await Client.sklad(event.meta.href)
            order ??= await Client.sklad(document.customerOrders[0].meta.href + '?expand=owner')
            const date = document.attributes.find(el => el.name == 'Отложенная дата производства').value
            const res = await Client.sklad(order.meta.href, 'put', {
                state: {meta: {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/2c012da7-84cf-11f0-0a80-15b300223cc3",
                    "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata",
                    "type" : "state",
                    "mediaType" : "application/json"
                }},
                attributes: [{
                    meta: {
                        "href" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/f9622e53-8a1f-11f0-0a80-01080003c4a4",
                        "type" : "attributemetadata",
                        "mediaType" : "application/json"
                    },
                    value: date
                }]
            })
            const res2 = await Client.sklad(`${order.meta.href.split('?')[0]}/notes`, 'post', {
                description: `{{employee;${order.owner.id}}}Сроки изготовления производственного задания № ${document.name} перенесены на ${date}`
            })
        }
    }
    static async orderCompleted(id){
        const order = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${id}?expand=agent`)
        if(!order.agent.email){
            const res = await Client.sklad(`${order.meta.href.split('?')[0]}/notes`, 'post', {
                description: `{{employee;${order.owner.id}}} Уведомление о готовности заказа не отправлено, тк у контрагента не указана почта`
            })
        }else{
            await axios.post(process.env.UNISENDER_URL, {
                email: order.agent.email,
                orderName: order.name
            })
        }
    }
}

// {
//   auditContext: {
//     meta: {
//       type: 'audit',
//       href: 'https://api.moysklad.ru/api/remap/1.2/audit/e9c64ea0-84c7-11f0-0a80-0028002075cd'
//     },
//     uid: '1c@askell',
//     moment: '2025-08-29 14:04:20'
//   },
//   events: [
//     {
//       meta: {
//         type: 'productiontask',
//         href: 'https://api.moysklad.ru/api/remap/1.2/entity/productiontask/44b00e08-8344-11f0-0a80-0bb20024a59d'
//       },
//       updatedFields: [ 'Отложенная дата производства' ],
//       action: 'UPDATE',
//       accountId: '055e482b-6e69-11e4-7a07-673d00000b3a'
//     }
//   ]
// }