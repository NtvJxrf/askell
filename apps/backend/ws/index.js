import { WebSocket, WebSocketServer } from "ws";
import { createBroker } from "../lib/broker.js";

const broker = createBroker("websocket");

broker.createService({
    name: "websocket",

    async started() {
        this.wss = new WebSocketServer({ port: 8080 });
    },

    async stopped() {
        this.wss?.close();
    },

    actions: {
        broadcast: {
            async handler(ctx) {
                const message = JSON.stringify(ctx.params);
                for (const socket of this.wss.clients) {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(message);
                    }
                }
            }
        }
    },
});

broker.start();