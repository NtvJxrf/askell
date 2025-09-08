import XLSX from "xlsx";
import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { writeFile, readFile } from 'fs/promises';
const res = await axios.post('http://localhost:7878/api/sklad/orderCompleted?id=56508553-4474-11f0-0a80-1b74001fc4eb');
console.log(res)
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
