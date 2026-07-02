import { broker } from '../index.js'

const QUARANTINE_STATE = {
    href: "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/6a37967b-5899-11f0-0a80-1bc9000373a3",
    metadataHref: "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata",
    type: "state",
    mediaType: "application/json"
}

// Validates that an order is ready for production. On failure it creates a task
// for the owner, moves the order to quarantine and returns `true` (skip creation).
const checkOrderDetails = async (order, initiator) => {
    const reportIssue = async (message) => {
        await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/task', type: 'post', data: {
            assignee: { meta: order?.owner?.meta },
            operation: { meta: order.meta },
            description: message
        } })
        await broker.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${order.id}`, type: 'put', data: {
            state: { meta: QUARANTINE_STATE }
        } })
    }

    if (order.agent.name === 'ООО "ИНТЕРНЕТ РЕШЕНИЯ".') return false

    if (!order.deliveryPlannedMoment) {
        await reportIssue('Не указана планируемая дата отгрузки, создание пз не было выполнено')
        return true
    }

    if (initiator === 'zakaz@askell' || initiator === '1c@askell') return false

    const attrs = (order.attributes || []).reduce((acc, x) => {
        acc[x.name] = x.value
        return acc
    }, {})

    if (order.sum > order.payedSum && !attrs['Рекламация']) {
        await reportIssue('Заказ оплачен не полностью, создание пз не было выполнено')
        return true
    }

    if (attrs['Вид доставки']?.name !== 'Самовывоз') {
        const required = ['Город получателя', 'Вид доставки', 'Телефон получателя', 'Адрес получателя', 'Выбор транспортной компании']
        const missing = required.filter(key => !(order.attributes || []).some(a => a.name === key))
        if (missing.length > 0) {
            await reportIssue(`Заполнены не все обязательные поля, создание пз не было выполнено\nНе заполнено: ${missing.join(',')}`)
            return true
        }
    }

    return false
}
export default checkOrderDetails
