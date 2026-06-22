import { ServiceBroker } from "moleculer";
import { WebSocket, WebSocketServer } from "ws";

const broker = new ServiceBroker({
    nodeID: "websocket",
    transporter: "nats://localhost:4222",
    logger: true
});

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