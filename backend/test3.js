import XLSX from "xlsx";
import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const res = await fetchAllRows('https://api.moysklad.ru/api/remap/1.2/entity/processingplan');

// функция для нарезки массива по чанкам
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
const chunks = chunkArray(res.map(el => ({ meta: el.meta })), 1000)
const concurrency = 5;
for (let i = 0; i < chunks.length; i += concurrency) {
  const batch = chunks.slice(i, i + concurrency);
  console.log('Вкинул пятерик на удаление')
  console.log(`Удаляю чанки ${i}–${i + batch.length - 1}`);
  
  const promises = batch.map(chunk =>
    Client.sklad(
      'https://api.moysklad.ru/api/remap/1.2/entity/processingplan/delete',
      'post',
      chunk
    )
  );

  const result = await Promise.allSettled(promises);
  console.log(result);
}


// твоя функция fetchAllRows остаётся без изменений
async function fetchAllRows(urlBase) {
  const limit = 1000;
  const firstUrl = `${urlBase}?offset=0`;
  const firstResponse = await Client.sklad(firstUrl);

  if (!firstResponse.rows || firstResponse.rows.length === 0) {
    return [];
  }

  const allRows = [...firstResponse.rows];
  const totalSize = firstResponse.meta?.size || allRows.length;

  const requests = [];
  for (let offset = limit; offset < totalSize; offset += limit) {
    const url = `${urlBase}?offset=${offset}`;
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
