import { ServiceBroker } from 'moleculer';
import '@askell/shared/env';
import got from 'got';
import { valkey, simulation } from '@askell/shared';
const BASE = process.env.API_URL || 'http://localhost:6789';

const api = got.extend({
  prefixUrl: BASE,
  throwHttpErrors: true, // we assert on statusCode ourselves
  responseType: 'json',
  timeout: { request: 30_000 },
});

const broker = new ServiceBroker({ nodeID: 'test', transporter: 'nats://localhost:4222', logger: false });
await broker.start();
await broker.waitForServices(['users', 'proxy']);
// const res = await broker.call('data-refresher.updateHeaps'); 
// const list = await broker.call('users.list');                 // роли не проверяются
// const me   = await broker.call('users.me', {}, { meta: { user: { id: list[0].id, roles: list[0].roles } } });
// const actions = await broker.call("$node.services");
// console.log(actions);
// const test = await api.get('api/$node/actions', {
    // json: {
    //     url: 'https://api.moysklad.ru/api/remap/1.2/entity/processingstage/58eb1689-60f3-11ed-0a80-022c0011500f',
    // }
// })
// console.log(test.body)
// const res = await broker.call("data-refresher.updateHeaps");
const heaps = await broker.call("data-refresher.getHeaps");
const {schedule, index} = await broker.call("data-refresher.getSchedule");
const pricesAndCoefs = JSON.parse(await valkey.get('sklad:data:pricesAndCoefs'));
const stages = JSON.parse(await valkey.get('sklad:data:processingStages'));
const res = await simulation({
  heaps,
  schedule: schedule,
  startIndex: index,
  pricesAndCoefs,
  stages
})
await valkey.set('simulationResult', JSON.stringify(res))
// const res = JSON.parse(await valkey.get('settings'));
// console.log(res)
await broker.stop();