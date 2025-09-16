import XLSX from "xlsx";
import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { google } from "googleapis";

const tasks = await fetchAllRows('https://api.moysklad.ru/api/remap/1.2/entity/productiontask?' +
    'filter=state.name=Новое задание;' + 
    'state.name=Поставлено в производство;' +
    'state.name=Ждёт раскрой;' +
    'state.name=Раскроен' +
    'state.name=Закалка;' +
    'https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/attributes/8438849b-5b27-11f0-0a80-01dc002fd402=false;'
)
const orders = await fetchAllRows(
    'https://api.moysklad.ru/api/remap/1.2/entity/customerorder?' +
    'filter=state.name=Подготовить (переделать) чертежи;' +
    'state.name=Чертежи подготовлены, прикреплены;' +
    'state.name=Проверить чертежи;' +
    'state.name=Проверено технологом' +
    '&expand=positions.assortment'
)
const productPromises = []
const productionStagesPromises = []
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
for(const promise of products)
    for(const product of promise.value)
        countLoadTasks(product, total, result)
for (const order of orders)
    for (const pos of order.positions.rows) 
        countLoadOrders(pos, total)
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
            total['Криволинейка'].P -= (result[key].P / result[key].count) * stage.completedQuantity
            total['Криволинейка'].S -= (result[key].S / result[key].count) * stage.completedQuantity
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
function countLoadTasks(product, total, result){
    const attrs = (product.assortment?.attributes || []).reduce((a, x) => {
        a[x.name] = x.value;
        return a;
    }, {});
    const stanok = attrs['Тип станка'];
    if (!stanok){
        return
    }

    const h = Number(attrs['Длина в мм']) || 0;
    const w = Number(attrs['Ширина в мм']) || 0;
    const cutsv1 = Number(attrs['Кол-во вырезов 1 категорий']) || 0;
    const cutsv2 = Number(attrs['Кол-во вырезов 2 категорий']) || 0;
    const cutsv3 = Number(attrs['Кол-во вырезов 3 категорий']) || 0;
    const P = 2 * (h + w) / 1000;          // пог.м
    const S = h * w / 1_000_000;           // кв.м
    const Q = product.planQuantity
    if(attrs['Тип изделия'] == 'Стекло'){
        total[stanok].P += P * Q + cutsv1 * 1.86 * Q + cutsv2 * 3.5 * Q + cutsv3 * 7 * Q
        total[stanok].S += S * Q
        total[stanok].count += Q
        total[stanok].positionsCount += 1;

        const key = product.productionRow.meta.href
        result[key] = result[key] || { P: 0, S: 0, count: 0, cutsv1: 0, cutsv2: 0, cutsv3: 0 };
        result[key].P += P * Q
        result[key].S += S * Q
        result[key].count += Q
        result[key].cutsv1 += cutsv1 * Q
        result[key].cutsv2 += cutsv2 * Q
        result[key].cutsv3 += cutsv3 * Q
    }
    if(attrs['Тип изделия'] == 'Триплекс'){
        total['Триплекс (Без учета резки стекла)'].P += P * Q
        total['Триплекс (Без учета резки стекла)'].S += S * Q
        total['Триплекс (Без учета резки стекла)'].count += Q
        total['Триплекс (Без учета резки стекла)'].positionsCount += 1

        const key = product.productionRow.meta.href;
        result[key] = result[key] || { P: 0, S: 0, count: 0 };
        result[key].P += P * Q
        result[key].S += S * Q
        result[key].count += Q  
    }
}
function countLoadOrders(product, total){
    const attrs = (product.assortment?.attributes || []).reduce((a, x) => {
        a[x.name] = x.value;
        return a;
    }, {});
    const stanok = attrs['Тип станка'];
    if (!stanok) return
    const h = Number(attrs['Длина в мм']) || 0;
    const w = Number(attrs['Ширина в мм']) || 0;
    const pfs = Number(attrs['Кол-во полуфабрикатов']) || 1;
    const cutsv1 = Number(attrs['Кол-во вырезов 1 категорий']) || 0;
    const cutsv2 = Number(attrs['Кол-во вырезов 2 категорий']) || 0;
    const cutsv3 = Number(attrs['Кол-во вырезов 3 категорий']) || 0;

    const P = 2 * (h + w) / 1000;          // пог.м
    const S = h * w / 1_000_000;           // кв.м
    const cnt = pfs * product.quantity;
    if(product.assortment.name.toLowerCase().includes('триплекс')){
        total['Триплекс (Без учета резки стекла)'].P += P * product.quantity
        total['Триплекс (Без учета резки стекла)'].S += S * product.quantity;
        total['Триплекс (Без учета резки стекла)'].count += product.quantity
        total['Триплекс (Без учета резки стекла)'].positionsCount += 1
    }
    console.log(`Товар ${product.assortment.name} добавил для ${stanok} ${P * cnt + cutsv1 * 1.86 * cnt + cutsv2 * 3.5 * cnt+ cutsv3 * 7 * cnt} м.п`)
    total[stanok].P += P * cnt + cutsv1 * 1.86 * cnt + cutsv2 * 3.5 * cnt+ cutsv3 * 7 * cnt
    total[stanok].S += S * cnt;
    total[stanok].count += cnt;
    total[stanok].positionsCount += 1;
}