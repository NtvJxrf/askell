import XLSX from "xlsx";
import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const res = await fetchAllRows('https://api.moysklad.ru/api/remap/1.2/entity/invoiceout?filter=moment>2023-01-01;moment<2025-01-01&expand=payments');
const newData = []
let count = 0
for(const invoiceout of res){
  if(!invoiceout.payments || invoiceout.payments.length === 0) continue;
  const attributes = invoiceout?.attributes?.reduce((acc, curr) => {
    acc[curr.name] = curr
    return acc
  }, {})
  if(attributes?.['Дата привязки платежа']) continue
  const targetDate = new Date(invoiceout.created.replace(" ", "T"));
  const closestPayment = invoiceout.payments.reduce((closest, current) => {
    const currentDate = new Date(current.incomingDate.replace(" ", "T"));
    const closestDate = new Date(closest.incomingDate.replace(" ", "T"));

    const diffCurrent = Math.abs(currentDate - targetDate);
    const diffClosest = Math.abs(closestDate - targetDate);

    return diffCurrent < diffClosest ? current : closest;
  });
  console.log(invoiceout.name)
  newData.push({meta: invoiceout.meta, name: `a${count}`, attributes: [{meta: {
    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/invoiceout/metadata/attributes/a38c0fc9-24c2-11f0-0a80-194c00046502",
    "type" : "attributemetadata",
    "mediaType" : "application/json"
  }, value: closestPayment.incomingDate}]})
  count++
}
console.log('СКОК СЧЕТВО:', newData.length)
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const chunks = chunkArray(newData, 900);

for (const chunk of chunks) {
  await Client.sklad(
    'https://api.moysklad.ru/api/remap/1.2/entity/invoiceout',
    'post',
    chunk
  );
}
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
