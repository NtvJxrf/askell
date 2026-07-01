import { ServiceBroker } from "moleculer";
import { initEnv } from "@askell/shared";
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
            permissions: ['Отчеты'],
            async handler(ctx) {
                
            }
        }
    }
});

broker.start();