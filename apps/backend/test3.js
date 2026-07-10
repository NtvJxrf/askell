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

const args = {
    headers: {
        Authorization: `Bearer b09deb0d3c1804c08710f3d3706d88023291ff8d`,
    }
}
const response = await gotClient.get(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/5289be44-6a0b-11f1-0a80-0e680003526c?expand=state`, {
    ...args 
})
const data = JSON.parse(response.body)
console.log(data.state.name)
const promises = []
for(let i = 0 ; i < 35; i++){
    promises.push(gotClient.get(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/5289be44-6a0b-11f1-0a80-0e680003526c?expand=state`, {
        ...args 
    }).then(res => JSON.parse(res.body))
        .catch(err => {
            console.error(err)
            return { state: { name: 'error' } }
        })
    )
}
const result = await Promise.all(promises)
console.log(result)
console.log(result.length)