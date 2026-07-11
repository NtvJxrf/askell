import { createBroker } from "../lib/broker.js";
import logisticRequest from "./utils/logistic.js";
import goodInfo from "./utils/goodinfo.js";
import reclamationRequest from "./utils/reclamation.js";
import productionlabels from "./utils/productionlabels.js";
import customerlabels from "./utils/customerlabels.js";
export const broker = createBroker("extension");

broker.createService({
    name: "extension",
    actions: {
        logisticRequest: {
            rest: "POST /logisticRequest",
            permissions: [],
            async handler(ctx) {
                const result = await logisticRequest(ctx.params, ctx);
                return result;
            }
        },
        goodInfo: {
            rest: "POST /goodInfo",
            permissions: [],
            async handler(ctx) {
                const result = await goodInfo(ctx.params, ctx);
                return result;
            }
        },
        reclamationRequest: {
            rest: "POST /reclamationRequest",
            permissions: [],
            async handler(ctx) {
                const result = await reclamationRequest(ctx.params, ctx);
                return result;
            }
        },
        productionlabels: {
            rest: "POST /productionlabels",
            permissions: [],
            async handler(ctx) {
                const result = await productionlabels(ctx.params, ctx);
                return result;
            }
        },
        customerlabels: {
            rest: "POST /customerlabels",
            permissions: [],
            async handler(ctx) {
                const result = await customerlabels(ctx.params, ctx);
                return result;
            }
        }
    }
});

broker.start();
