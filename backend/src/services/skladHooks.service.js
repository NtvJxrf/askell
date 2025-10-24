import Client from "../utils/got.js"
import { getQueueChannel } from '../utils/rabbitmq.js'
import { dictionary } from "./sklad.service.js"
export default class SkladHooks{
    static async pzChange(data){
        let document = null
        let order = null
        const event = data.events[0]
        if(event?.updatedFields?.includes('Отложенная дата производства')){
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
    static async orderChanged(data){
        let order = null
        const event = data.events[0]
        if(event?.updatedFields?.includes('state')){
            order ??= await Client.sklad(`${event.meta.href}?expand=agent,state`)
            const attrs = (order.attributes || []).reduce((a, x) => {
                a[x.name] = x.value;
                return a;
            }, {});
            switch(order.state.name){
                case 'Готово':
                    if(order.payedSum < order.sum && !attrs['Рекламация']){
                        await Client.sklad(order.meta.href, 'put', {
                            state: {
                                meta: {
                                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/377adb2e-a35d-11f0-0a80-059100098627",
                                    "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata",
                                    "type" : "state",
                                    "mediaType" : "application/json"
                                }
                            }
                        })
                        return
                    }
                    if(order.owner.meta.href == `https://api.moysklad.ru/api/remap/1.2/entity/employee/03579653-eedf-11e8-9107-50480000f34d`) return
                    if(!order.agent.email){
                    const task = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/task', 'post', {
                        assignee: { meta: order.owner.meta },
                        operation: { meta: order.meta },
                        description: `Уведомление о готовом заказе не отправлено, тк не указан email`
                    })
                    }else{
                        await Client.request(process.env.UNISENDER_URL, 'post', {
                            json: { 
                                email: order.agent.email,
                                orderName: order.name
                            }
                        })
                    }
                break
                case 'Поставлено в производство':
                    sendToQueue({id: order.id, initiator: data.auditContext.uid})
                    const task = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/task', 'post', {
                        assignee: {
                            meta: dictionary.employees['8424e55c-b720-11ed-0a80-05db0004212f'].meta //Самойлова
                        },
                        operation: {
                            meta: order.meta
                        },
                        description: `Выполнить заказ покупателя ${order.name}\nКомментарий: ${order?.description || ''}\nПланируемая дата отгрузки: ${order.deliveryPlannedMoment}`
                    })
                break
                case 'Поставлено в производство ВИЗ':
                    sendToQueue({id: order.id, initiator: data.auditContext.uid})
                break
                case 'Тест':
                    sendToQueue({id: order.id, initiator: data.auditContext.uid})
                break
            }
        }
    }
}
const sendToQueue = (payload) => {
    const channel = getQueueChannel();
    const success = channel.sendToQueue('pzwebhook', Buffer.from(JSON.stringify(payload)), { persistent: true });
    if (!success) throw new Error('Failed to enqueue task');
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