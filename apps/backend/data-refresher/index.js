import { Errors } from "moleculer";
import { createBroker } from "../lib/broker.js";
import { getProcessingStages, getPackagingMaterials, getStores, getUnders, getColors, getPricesAndCoefs,
  getCurrency, getPriceTypes, getAttributes, getEmployees, getStates, getProcessingPlansSmd, getMaterials, getStock, getStagesAndNorms } from "./utils/skladEntitys.js";
import { updateHeaps } from "./utils/productionload.js";
import { updateSchedule } from "./utils/schedule.js";
import { valkey, settingsSchema } from "@askell/shared";
import { scanNonPayedOrders, createCartonLoss } from './utils/skladScaner.js';
import simulation from "@askell/shared/calc/simulation"
import cron from 'node-cron'
const { MoleculerClientError } = Errors;
export const broker = createBroker("data-refresher");

const map = {
  getProcessingStages,
  getPackagingMaterials,
  getStores,
  getUnders,
  getColors,
  getPricesAndCoefs,
  getCurrency,
  getPriceTypes,
  getAttributes,
  getEmployees,
  getStates,
  getProcessingPlansSmd,
  getMaterials,
  getStock,
  getStagesAndNorms,
}
let selfcost = {
  updates: {}
};
let lastUpdateHeaps = 0
broker.createService({
  name: "data-refresher",

  actions: {
    // Restricted to the `настройки` permission (admin always passes) via the
    // `permissions` metadata, enforced by the gateway's `authorize`.
    updateEntity: {
      rest: "POST /updateEntity",
      permissions: ['Настройки'],
      async handler(ctx) {
        await map[ctx.params.entity]();
        await updateSelfcost();
        await ctx.call("websocket.broadcast", { type: 'selfcost', selfcost });
        return true
      }
    },
    updateAllEntities: {
      rest: "POST /updateAllEntities",
      permissions: ['Настройки'],
      async handler(ctx) {
        const promises = [];
        for(const entity in map) {
          promises.push(map[entity]());
        }
        await Promise.all(promises);
        await updateSelfcost();
        await ctx.call("websocket.broadcast", { type: 'selfcost', selfcost });
        return true
      }
    },
    setSettings: {
      rest: "POST /setSettings",
      permissions: ['Админ'],
      async handler(ctx) {
        const settings = JSON.parse(await valkey.get('settings'));
        const { key, value, editor } = ctx.params;
        if (!settingsSchema[key]) {
          throw new MoleculerClientError(`Неизвестная настройка: ${key}`, 422, 'UNKNOWN_SETTING', { key });
        }
        const valid = settingsSchema[key].schema.safeParse(value)
        if(!valid.success) {
          throw new MoleculerClientError("Некорректное значение", 422, 'INVALID_SETTING_VALUE', { key });
        }
        await valkey.set('settings', JSON.stringify({ ...settings, [key]: { value, editor } }));
        const settingsUpdated = await ctx.call("data-refresher.getSettings");
        await ctx.emit('dataUpdated', 'settings')
        ctx.call("websocket.broadcast", { type: 'settings', settings: settingsUpdated });
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
      permissions: ['Админ'],
      async handler(ctx) {
        if (lastUpdateHeaps !== 0 && Date.now() - lastUpdateHeaps < 300_000) throw new MoleculerClientError('Обновление куч доступно не чаще раза в 5 минут', 429, 'TOO_MANY_UPDATES')
        lastUpdateHeaps = Date.now()
        await updateHeaps();
        ctx.call("websocket.broadcast", { type: 'heaps', heaps: JSON.parse(await valkey.get('heaps')) || null });
        return true
      }
    },
    updateSchedule: {
      rest: "GET /updateSchedule",
      permissions: ['Админ'],
      async handler(ctx) {
        await updateSchedule();
        ctx.call("websocket.broadcast", { type: 'schedule', schedule: JSON.parse(await valkey.get('schedule')) || null });
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
        const heaps = JSON.parse(await valkey.get('heaps')) || null;
        if(!heaps) {
          throw new MoleculerClientError('Кучи не найдены. Сначала выполните обновление куч.', 404, 'HEAPS_NOT_FOUND');
        }
        return heaps;
      }
    },
    getSimulationResult: {
      rest: "GET /getSimulationResult",
      async handler() {
        const simulationResult = JSON.parse(await valkey.get('simulationResult')) || {};
        return simulationResult;
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
    },
    updateProductinLoad: {
      rest: "GET /updateProductinLoad",
      permissions: ['Админ'],
      async handler(ctx) {
        await updateSchedule();
        await updateHeaps();
        const heaps = await ctx.call("data-refresher.getHeaps");
        const {schedule, index} = await ctx.call("data-refresher.getSchedule");
        const pricesAndCoefs = JSON.parse(await valkey.get('sklad:data:pricesAndCoefs'));
        const stages = JSON.parse(await valkey.get('sklad:data:processingStages'));
        const stagesAndNorms = JSON.parse(await valkey.get('sklad:data:stagesAndNorms'));
        const simres = await simulation({
          heaps,
          schedule: schedule,
          startIndex: index,
          pricesAndCoefs,
          stages,
          stagesAndNorms,
          logging: true,
        })
        await valkey.set('simulationResult', JSON.stringify(simres))
        await valkey.set('sklad:updates:productionLoad', Date.now());
        ctx.call("websocket.broadcast", { type: 'heaps', heaps: JSON.parse(await valkey.get('heaps')) || null });
        ctx.call("websocket.broadcast", { type: 'schedule', schedule: JSON.parse(await valkey.get('schedule')) || null });
        return true
      }
    }
  }     
});

const updateSelfcost = async () => {
  const DATA_KEYS = ['colors', 'unders', 'materials', 'packaging', 'pricesAndCoefs', 'processingStages', 'stagesAndNorms', 'stock']
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
      broker.logger.error({ err: error, key }, `Ошибка парсинга sklad:data:${key}`)
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
if (process.env.NODE_ENV !== 'development') {
  setInterval(async () => {
    try {
      await broker.call("data-refresher.updateAllEntities");
    } catch (err) {
      broker.logger.error({ err }, 'updateAllEntities error')
    }
  }, 600_000)//Каждые 10 минут
  setInterval(async () => {
    try {
      await scanNonPayedOrders()
    } catch (err) {
      broker.logger.error({ err }, 'scanNonPayedOrders error')
    }
  }, 300_000)//Каждые 5 минут
  setInterval(async () => {
    try {
      await broker.call("data-refresher.updateProductinLoad");
    } catch (err) {
      broker.logger.error({ err }, 'updateProductinLoad error')
    }
  }, 1_020_000)//Каждые 17 минут
  cron.schedule("0 23 * * *", async () => { // Каждый день в 23 часа ночи
    try {
      await createCartonLoss()
    } catch (err) {
      broker.logger.error({ err }, 'createCartonLoss error')
    }
  });
}
await broker.start();
try {
  await broker.waitForServices("proxy", 60_000);
  await broker.call("data-refresher.updateAllEntities");
} catch (err) {
  // Не роняем процесс на старте: данные подтянутся ближайшим интервалом.
  broker.logger.error({ err }, 'Начальное обновление справочников не удалось')
}