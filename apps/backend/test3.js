import { ServiceBroker } from 'moleculer';
import '@askell/shared/env';
import got from 'got';
import { valkey, simulation } from '@askell/shared';
const BASE = process.env.API_URL || 'http://localhost:6789';
import { randomUUID } from 'crypto';
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

const stages = await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/entity/processingstage'})

for(const stage of stages.rows){
    await broker.call('proxy.sklad', { 
        url: `https://api.moysklad.ru/api/remap/1.2/entity/customentity/a61baf1d-790e-11f1-0a80-152e00296359`,
        type: 'post',
        data: {
            name: stage.name,
        }     
    })
}