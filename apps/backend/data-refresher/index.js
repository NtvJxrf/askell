import { ServiceBroker } from "moleculer";
import { ROLES } from "@askell/shared/roles";
import { getProcessingStages, getPackagingMaterials, getStores, getUnders, getColors, getPicesAndCoefs,
  getCurrency, getPriceTypes, getAttributes, getEmployees, getStates, getProcessingPlansSmd, getMaterials } from "./utils/skladEntitys.js";
import { updateHeaps } from "./utils/productionload.js";
import { updateSchedule } from "./utils/schedule.js";
import { valkey, settingsSchema } from "@askell/shared";
export const broker = new ServiceBroker({
  nodeID: "data-refresher",
  transporter: "nats://localhost:4222",
  logger: true
});

const map = {
  getProcessingStages,
  getPackagingMaterials,
  getStores,
  getUnders,
  getColors,
  getPicesAndCoefs,
  getCurrency,
  getPriceTypes,
  getAttributes,
  getEmployees,
  getStates,
  getProcessingPlansSmd,
  getMaterials
}
let selfcost = {
  updates: {}
};
broker.createService({
  name: "data-refresher",

  actions: {
    // Restricted to the `manager` role (admin always passes) via the `roles`
    // metadata, enforced by the gateway's `authorize`.
    updateEntity: {
      rest: "POST /updateEntity",
      roles: [ROLES.MANAGER],
      async handler(ctx) {
        await map[ctx.params.entity]();
        await updateSelfcost();
        await broker.call("websocket.broadcast", { type: 'selfcost', selfcost });
        return true
      }
    },
    updateAllEntities: {
      rest: "POST /updateAllEntities",
      roles: [ROLES.MANAGER],
      async handler() {
        const promises = [];
        for(const entity in map) {
          promises.push(map[entity]());
        }
        await Promise.all(promises);
        await updateSelfcost();
        await broker.call("websocket.broadcast", { type: 'selfcost', selfcost });
        return true
      }
    },
    setSettings: {
      rest: "POST /setSettings",
      roles: [ROLES.ADMIN],
      async handler(ctx) {
        const settings = JSON.parse(await valkey.get('settings'));
        const { key, value, editor } = ctx.params;
        const valid = settingsSchema[key].schema.safeParse(value)
        if(!valid.success) {
          throw new Error("Некорректное значение");
        }
        await valkey.set('settings', JSON.stringify({ ...settings, [key]: { value, editor } }));
        const settingsUpdated = await broker.call("data-refresher.getSettings");
        broker.call("websocket.broadcast", { type: 'settings', settings: settingsUpdated });
        return true
      }
    },
    selfcost: {
      rest: "GET /selfcost",
      async handler() {
        if(!selfcost.materials)
          await this.actions.updateAllEntities();
        return selfcost;
      }
    },
    updateHeaps: {
      rest: "GET /updateHeaps",
      async handler() {
        await updateHeaps();
        return true
      }
    },
    updateSchedule: {
      rest: "GET /updateSchedule",
      async handler() {
        await updateSchedule();
        return true;
      }
    },
    getSchedule: {
      rest: "GET /getSchedule",
      async handler() {
        return JSON.parse(await valkey.get('schedule'))
      }
    },
    getHeaps: {
      rest: "GET /getHeaps",
      async handler() {
        return JSON.parse(await valkey.get('heaps')) || null;
      }
    },
    getSimulationResult: {
      rest: "GET /getSimulationResult",
      async handler() {
        return JSON.parse(await valkey.get('simulationResult')) || null;
      }
    },
    getSettings: {
      rest: "GET /getSettings",
      async handler() {
        const schema = settingsSchema;
        const settings = JSON.parse(await valkey.get('settings'))
        const mixSettings = {}
        for(const [key, value] of Object.entries(settingsSchema)) {
          mixSettings[key] = {
            ...value,
            editor: settings?.[key]?.editor ?? null,
            value: settings?.[key]?.value ?? null,
          }
        }
        return mixSettings;
      }
    }
  }     
});

broker.start();

const updateSelfcost = async () => {
  const DATA_KEYS = ['colors', 'unders', 'materials', 'packaging', 'pricesAndCoefs']
  const updateKeys = await valkey.keys('sklad:updates:*')

  const [dataValues, updateValues] = await Promise.all([
    DATA_KEYS.length ? valkey.mget(DATA_KEYS.map(k => `sklad:data:${k}`)) : [],
    updateKeys.length ? valkey.mget(updateKeys) : []
  ])

  for (let i = 0; i < DATA_KEYS.length; i++) {
    const key = DATA_KEYS[i]
    try {
      const parsed = dataValues[i] ? JSON.parse(dataValues[i]) : {}
      const filtered = Object.fromEntries(
        Object.entries(parsed).map(([itemName, itemValue]) => {
          const { meta, ...rest } = itemValue
          return [itemName, rest]
        })
      )
      selfcost[key] = filtered
    } catch(error) {
      console.error(`Error parsing sklad:data:${key}:`, error)
      selfcost[key] = {}
    }
  }
  for (let i = 0; i < updateKeys.length; i++) {
    const fullKey = updateKeys[i]
    const shortKey = fullKey.replace('sklad:updates:', '')
    const update = updateValues[i] ? JSON.parse(updateValues[i]) : null
    if (update) {
      selfcost.updates[shortKey] = update
    }
  }
}
// broker.createService({
//   name: "data-refresher",

//   actions: {
//     // Просто функция — доступна только внутри через broker.call()
//     // Снаружи через HTTP недоступна
//     internalAction(ctx) {
//       return "только для других сервисов";
//     },

//     // Объект с handler — то же самое, но можно добавить rest, params, middleware и т.д.
//     updateEntity: {
//       rest: "POST /updateEntity",   // HTTP маршрут: POST /api/data-refresher/updateEntity
      
//       // Валидация входных параметров (опционально)
//       params: {
//         entity: "string"
//       },

//       async handler(ctx) {
//         await map[ctx.params.entity]();
//         return true;
//       }
//     },

//     // GET запрос
//     getStatus: {
//       rest: "GET /status",          // GET /api/data-refresher/status
//       handler(ctx) {
//         return { ok: true };
//       }
//     },

//     // С параметром в URL
//     getById: {
//       rest: "GET /item/:id",        // GET /api/data-refresher/item/123
//       handler(ctx) {
//         return { id: ctx.params.id };
//       }
//     }
//   }
// });