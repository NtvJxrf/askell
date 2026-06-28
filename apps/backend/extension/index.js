import { ServiceBroker } from "moleculer";
import { initEnv } from "@askell/shared";
import { ROLES } from "@askell/shared/roles";
const broker = new ServiceBroker({
  nodeID: "extension",
  transporter: "nats://localhost:4222",
  logger: true
});

broker.createService({
    name: "extension",
    actions: {
        report1: {
            rest: "GET /",
            roles: [ROLES.REPORTS],
            async handler(ctx) {
                
            }
        }
    }
});

broker.start();