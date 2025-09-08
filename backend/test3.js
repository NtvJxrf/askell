import XLSX from "xlsx";
import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { writeFile, readFile } from 'fs/promises';
const res = await fetchAllRows('https://api.moysklad.ru/api/remap/1.2/entity/productiontask?filter=moment>2025-01-01');
const newData = []
const skippedPz = []
for(const pz of res){
  const attributes = pz?.attributes?.reduce((acc, curr) => {
    acc[curr.name] = curr
    return acc
  }, {})
  if(!pz?.customerOrders?.length){
    const orderName = attributes?.['№ заказа покупателя']
    console.log(orderName)
    skippedPz.push(`У производственного задания ${pz.name} нет связанного заказа покупателя${orderName ? `. Зато заполнено поле № заказа покупателя: ${orderName.value}, какая удача!` : ''}`)
    continue
  }
  if(!pz?.productionEnd) continue
  newData.push({meta: pz.customerOrders[0].meta, attributes: [{meta: {
      "href" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/3c649a9d-0f3d-11ee-0a80-0d9c0007730f",
      "type" : "attributemetadata",
      "mediaType" : "application/json"
  }, value: pz.productionEnd}]})
}
console.log('СКОК СЧЕТВО:', newData.length)
await writeFile('pz.json', JSON.stringify(skippedPz, null, 2), 'utf8');
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const chunks = chunkArray(newData, 900);
const promises = []
for (const chunk of chunks) {
  promises.push(Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/customerorder', 'post', chunk ))
}
const result = await Promise.allSettled(promises)
console.log(result)
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
