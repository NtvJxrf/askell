import { ServiceBroker } from "moleculer";
import { initEnv } from "@askell/shared";
import logisticRequest from "./utils/logistic.js";
import goodInfo from "./utils/goodinfo.js";
import reclamationRequest from "./utils/reclamation.js";
export const broker = new ServiceBroker({
  nodeID: "extension",
  transporter: "nats://localhost:4222",
  logger: true
});

broker.createService({
    name: "extension",
    actions: {
        logisticRequest: {
            rest: "POST /logisticRequest",
            permissions: ['Расширение'],
            async handler(ctx) {
                const result = await logisticRequest(ctx.params);
                return result;
            }
        },
        goodInfo: {
            rest: "POST /goodInfo",
            permissions: ['Расширение'],
            async handler(ctx) {
                const result = await goodInfo(ctx.params);
                return result;
            }
        },
        reclamationRequest: {
            rest: "POST /reclamationRequest",
            permissions: ['Расширение'],
            async handler(ctx) {
                const result = await reclamationRequest(ctx.params);
                return result;
            }
        }
    }
});

broker.start();