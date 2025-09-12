import XLSX from "xlsx";
import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { google } from "googleapis";

const tasks = await fetchAllRows('https://api.moysklad.ru/api/remap/1.2/entity/productiontask?filter=productionStart!=null;moment>2025-09-8')
const productPromises = []
const productionStagesPromises = []
let i = 0
for(const task of tasks){
    productPromises.push(fetchAllRows(`${task.meta.href}/products?expand=assortment`))
    productionStagesPromises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/productionstage/?filter=productionTask=${task.meta.href}&expand=stage`))
}
const products = await Promise.allSettled(productPromises)
const productionStages = await Promise.allSettled(productionStagesPromises)
const total = {
    'Криволинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
    'Прямолинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
    'Триплекс (Без учета резки стекла)': { count: 0, positionsCount: 0, S: 0, P: 0 },
    cutsv1: 0,
    cutsv2: 0,
    cutsv3: 0,
}
const result = {}
for(const promise of products){
    for(const product of promise.value){
        const attrs = (product.assortment?.attributes || []).reduce((a, x) => {
            a[x.name] = x.value;
            return a;
        }, {});
        const stanok = attrs['Тип станка'];
        if (!stanok) continue;

        const h = Number(attrs['Длина в мм']) || 0;
        const w = Number(attrs['Ширина в мм']) || 0;
        const cutsv1 = Number(attrs['Кол-во вырезов 1 категорий']) || 0;
        const cutsv2 = Number(attrs['Кол-во вырезов 2 категорий']) || 0;
        const cutsv3 = Number(attrs['Кол-во вырезов 3 категорий']) || 0;
        const P = 2 * (h + w) / 1000;          // пог.м
        const S = h * w / 1_000_000;           // кв.м

        if(attrs['Тип изделия'] == 'Стекло'){
            total[stanok].P += P * product.planQuantity
            total[stanok].S += S * product.planQuantity
            total[stanok].count += product.planQuantity
            total[stanok].positionsCount += 1;

            const key = product.productionRow.meta.href;
            result[key] = result[key] || { P: 0, S: 0, count: 0, cutsv1: 0, cutsv2: 0, cutsv3: 0 };
            result[key].P += P * product.planQuantity
            result[key].S += S * product.planQuantity
            result[key].count += product.planQuantity
            result[key].cutsv1 += cutsv1
            result[key].cutsv2 += cutsv2
            result[key].cutsv3 += cutsv3
        }
        if(attrs['Тип изделия'] == 'Триплекс'){
            total['Триплекс (Без учета резки стекла)'].P += P * product.planQuantity;
            total['Триплекс (Без учета резки стекла)'].S += S * product.planQuantity;
            total['Триплекс (Без учета резки стекла)'].count += product.planQuantity
            total['Триплекс (Без учета резки стекла)'].positionsCount += 1

            const key = product.productionRow.meta.href;
            result[key] = result[key] || { P: 0, S: 0, count: 0 };
            result[key].P += P * product.planQuantity
            result[key].S += S * product.planQuantity
            result[key].count += product.planQuantity    
        }
    }
}
console.log(total)
for(const promise of productionStages){
    for(const stage of promise.value){
        const name = stage.stage.name
        if(name != 'Криволинейная обработка' && name != 'Прямолинейная обработка' && name != 'Триплексование') continue
        const key = stage.productionRow.meta.href;
        if (!result[key]) {
            console.warn('Нет данных для ключа', key, 'этап', name);
            continue;
        }
        if(name == 'Криволинейная обработка'){
            console.log('S', result[key].S / result[key].count, stage.completedQuantity, name)
            console.log(total['Криволинейка'].S)
            total['Криволинейка'].P -= (result[key].P / result[key].count) * stage.completedQuantity
            total['Криволинейка'].S -= (result[key].S / result[key].count) * stage.completedQuantity
            console.log(total['Криволинейка'].S)
        }else if(name == 'Прямолинейная обработка'){
            total['Прямолинейка'].P -= (result[key].P / result[key].count) * stage.completedQuantity
            total['Прямолинейка'].S -= (result[key].S / result[key].count) * stage.completedQuantity
        }else{
            total['Триплекс (Без учета резки стекла)'].P -= (result[key].P / result[key].count) * stage.completedQuantity
            total['Триплекс (Без учета резки стекла)'].S -= (result[key].S / result[key].count) * stage.completedQuantity
        }
    }
}
console.log(total)
async function fetchAllRows(urlBase) {
  const limit = 100;
  const firstUrl = `${urlBase}&limit=${limit}&offset=0`;
  const firstResponse = await Client.sklad(firstUrl);

  if (!firstResponse.rows || firstResponse.rows.length === 0) {
    return [];
  }

  const allRows = [...firstResponse.rows];
  const totalSize = firstResponse.meta?.size || allRows.length;

  const requests = [];
  for (let offset = limit; offset < totalSize; offset += limit) {
    const url = `${urlBase}&limit=${limit}&offset=${offset}`;
    requests.push(Client.sklad(url));
  }

  const responses = await Promise.all(requests);
  for (const res of responses) {
    if (res.rows) {
      allRows.push(...res.rows);
    }
  }

  return allRows;
}
