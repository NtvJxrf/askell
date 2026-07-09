import { createBroker } from "../lib/broker.js";
import logisticRequest from "./utils/logistic.js";
import goodInfo from "./utils/goodinfo.js";
import reclamationRequest from "./utils/reclamation.js";
export const broker = createBroker("extension");

broker.createService({
    name: "extension",
    actions: {
        logisticRequest: {
            rest: "POST /logisticRequest",
            permissions: ['Расширение'],
            async handler(ctx) {
                const result = await logisticRequest(ctx.params, ctx);
                return result;
            }
        },
        goodInfo: {
            rest: "POST /goodInfo",
            permissions: ['Расширение'],
            async handler(ctx) {
                const result = await goodInfo(ctx.params, ctx);
                return result;
            }
        },
        reclamationRequest: {
            rest: "POST /reclamationRequest",
            permissions: ['Расширение'],
            async handler(ctx) {
                const result = await reclamationRequest(ctx.params, ctx);
                return result;
            }
        }
    }
});

broker.start();