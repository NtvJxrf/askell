import { ServiceBroker } from "moleculer";
import { initEnv } from "@askell/shared";
import { ROLES } from "@askell/shared/roles";
const broker = new ServiceBroker({
  nodeID: "productionCompletion",
  transporter: "nats://localhost:4222",
  logger: true
});

broker.createService({
    name: "productionCompletion",
    actions: {
        complete: {
            rest: "POST /complete",
            roles: [ROLES.PRODUCTION],
            async handler(ctx) {
                
            }
        }
    }
});

broker.start();