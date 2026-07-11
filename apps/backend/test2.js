import { ServiceBroker } from 'moleculer';
import '@askell/shared/env';
import got from 'got';
import { valkey, simulation } from '@askell/shared';
const BASE = process.env.NEXT_PUBLIC_ENV === 'development' ? 'http://localhost:6789' : process.env.API_URL
import { randomUUID } from 'crypto';
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
const test = await api.post('https://calc.askell.ru/api/backend/sklad/orderChanged?devToken=31cfad3976d798ce5dfd4c2cc0fa1a35c15d0ba72d6c4be25d1441e20aae5849f223de6b6ca4f44eb50b91b778866530ebafb84b3309f93dc220b5c00524c887', {
  json: {
    "auditContext": {
      "meta": {
        "type": "audit",
        "href": "https://api.moysklad.ru/api/remap/1.2/audit/75fe3b73-db16-11eb-c0a8-800d00000004"
      },
      "moment": "2021-07-21 15:51:16",
      "uid": "test@test"
    },
    "events": [
      {
        "meta": {
          "type": "customerorder",
          "href": "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/e65e442d-d19c-11f0-0a80-0390000360cd"
        },
        "updatedFields": ["state"],
        "action": "UPDATE",
        "accountId": "9171a53c-b719-11eb-c0a8-800d00000001"
      }
    ]
  }
})
console.log(test.body)
// const res = await broker.call("data-refresher.updateHeaps");
// const scheduleUpdate = await broker.call("data-refresher.updateSchedule");
// const heaps = await broker.call("data-refresher.getHeaps");
// const {schedule, index} = await broker.call("data-refresher.getSchedule");
// const pricesAndCoefs = JSON.parse(await valkey.get('sklad:data:pricesAndCoefs'));
// const stages = JSON.parse(await valkey.get('sklad:data:processingStages'));
// const stagesAndNorms = JSON.parse(await valkey.get('sklad:data:stagesAndNorms'));
// console.time('sim')
// const simres = simulation({
//   heaps,
//   schedule: schedule,
//   startIndex: index,
//   pricesAndCoefs,
//   stages,
//   logging: true,
//   stagesAndNorms,
// })
// await valkey.set('simulationResult', JSON.stringify(simres))
// const res = await broker.call('$node.actions');
// const res = JSON.parse(await valkey.get('settings'));
// const res = await broker.call("reports.create", { filters: { startDate: '2026-06-20', endDate: '2026-06-20' }, type: 'report1' });
// const res = await broker.call("sklad.orderChanged", {
//     "auditContext": {
//       "meta": {
//         "type": "audit",
//         "href": "https://api.moysklad.ru/api/remap/1.2/audit/75fe3b73-db16-11eb-c0a8-800d00000004"
//       },
//       "moment": "2021-07-21 15:51:16",
//       "uid": "test@test"
//     },
//     "events": [
//       {
//         "meta": {
//           "type": "customerorder",
//           "href": "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/e65e442d-d19c-11f0-0a80-0390000360cd"
//         },
//         "updatedFields": ["state"],
//         "action": "UPDATE",
//         "accountId": "9171a53c-b719-11eb-c0a8-800d00000001"
//       }
//     ]
//   });
// const res = await broker.call("sklad.createPZ", { id: 'e65e442d-d19c-11f0-0a80-0390000360cd', initiator: '1c@askell' });
// console.log(res)
// console.timeEnd('sim')
await broker.stop();