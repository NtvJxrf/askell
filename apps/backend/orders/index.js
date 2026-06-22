import { ServiceBroker } from "moleculer";
import { initEnv } from "@askell/shared";
import { ROLES } from "@askell/shared/roles";
const broker = new ServiceBroker({
  nodeID: "orders",
  transporter: "nats://localhost:4222",
  logger: true
});

const priceItems = [
    { key: 'gostPrice', label: 'Выше госта' },
    { key: 'retailPrice', label: 'Розница' },
    { key: 'bulkPrice', label: 'Опт' },
    { key: 'dealerPrice', label: 'Дилер' },
    { key: 'vipPrice', label: 'ВИП' },
];
const priceMap = priceItems.reduce((acc, { key, label }) => {
    acc[label] = key;
    return acc;
}, {});
const reverseMap = priceItems.reduce((acc, { key, label }) => {
    acc[key] = label;
    return acc;
}, {});

broker.createService({
    name: "orders",
    actions: {
        order: {
            rest: "GET /order",
            roles: [ROLES.MANAGER],
            async handler(ctx) {
                const { name } = ctx.params;
                const orders = await broker.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${name}&expand=positions.assortment,agent,organization&limit=100`})
                const order = [...(orders.rows || [])].sort((left, right) => {
                    const leftTime = new Date(left?.moment || 0).getTime()
                    const rightTime = new Date(right?.moment || 0).getTime()
                    return rightTime - leftTime
                })[0]
                const positions = order.positions?.rows.map(p => {
                    const attrs = (p?.assortment?.attributes || []).reduce((a, x) => {
                        a[x.name] = x.value;
                        return a;
                    }, {});
                    const res = {
                        key: p.id,
                        name: p.assortment.name,
                        prices: p.assortment.salePrices.reduce((acc, curr) => {
                            acc[priceMap[curr.priceType.name]] = curr.value / 100
                            return acc
                        }, {}),
                        added: true,
                        quantity: p.quantity,
                    }
                    if(attrs['Детали']){
                        const details = JSON.parse(attrs['Детали'])
                        res.details = details.result
                        res.initialData = details.initialData
                    }
                    return res
                }) 
                const response = {
                    order: {
                        meta: order.meta,
                        id: order.id,
                        agent: order.agent.name,
                        organization: order.organization.name,
                        name: order.name,
                        moment: order.moment,
                    },
                    positions
                }
                return response
            }
        }
    }
});

broker.start();