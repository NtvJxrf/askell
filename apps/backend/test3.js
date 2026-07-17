import { ServiceBroker } from 'moleculer';
import '@askell/shared/env';
import got from 'got';
import { valkey, simulation } from '@askell/shared';
const BASE = process.env.API_URL || 'http://localhost:6789';
import { randomUUID } from 'crypto';
import https from 'https';
import ExcelJS from 'exceljs'
const api = got.extend({
  prefixUrl: BASE,
  throwHttpErrors: true, // we assert on statusCode ourselves
  responseType: 'json',
  timeout: { request: 30_000 },
});

const broker = new ServiceBroker({ nodeID: 'test', transporter: 'nats://localhost:4222', logger: false });
await broker.start();
await broker.waitForServices(['users', 'proxy']);


class KeepAliveAgent extends https.Agent {
    createConnection(options, cb) {
        const socket = super.createConnection(options, cb);
        socket.setKeepAlive(true, 15_000);
        return socket;
    }
}

const gotClient = got.extend({
    agent: { https: new KeepAliveAgent() },
    retry: {
        limit: 3,
        statusCodes: [408, 500, 502, 503, 504],
        errorCodes: ['ETIMEDOUT', 'ECONNREFUSED'],
    },
    timeout: {
        request: 600_000,
    },
    throwHttpErrors: false,
});

const orders = await broker.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=`
    +`state.name=Поставлено в производство`
    +`;state.name=Поставлено в производство ВИЗ`
    +`;state.name=В работе`
    +`&expand=agent`
})
const result = []
for(const order of orders){
    if(!order.productionTasks)
        result.push({
            name: order.name,
            sum: order.sum / 100,
            deliveryPlannedMoment: order.deliveryPlannedMoment,
            payedSum: order.payedSum / 100,
            agent: order.agent.name,
        })
}
console.log(result)