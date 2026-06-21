import { ServiceBroker } from "moleculer";
import { initEnv } from "@askell/shared";
import { ROLES } from "@askell/shared/roles";
const broker = new ServiceBroker({
  nodeID: "orders",
  transporter: "nats://localhost:4222",
  logger: true
});

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
                for(const position of order?.positions?.rows){
                    const attrs = (position?.assortment?.attributes || []).reduce((a, x) => {
                        a[x.name] = x.value;
                        return a;
                    }, {});
                    if(attrs['Детали']){
                        const details = JSON.parse(attrs['Детали'])
                        position.result = details.result
                        position.initialData = details.initialData
                    }
                }
                const response = {
                    meta: order.meta,
                    id: order.id,
                    positions: order.positions.rows,
                    agent: order.agent.name,
                    organization: order.organization.name,
                    name: order.name,
                    moment: order.moment,
                }
                return response
            }
        }
    }
});

broker.start();