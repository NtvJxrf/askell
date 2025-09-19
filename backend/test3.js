import Client from './src/utils/got.js';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
dotenv.config();

// Функция для сбора всех данных

const res = await fetchAllRows('https://api.moysklad.ru/api/remap/1.2/entity/product?filter=https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/93ffede8-74f0-11f0-0a80-00c400158523<0')
const result = []
for(const product of res){
    const name = product.name
    const attrs = (product.attributes || []).reduce((a, x) => {
        a[x.name] = x.meta;
        return a;
    }, {});
    const match = name.match(/(\d+(?:[.,]\d+)?)\s*[xх]\s*(\d+(?:[.,]\d+)?)/i);

    if (match) {
        const h = parseFloat(match[1].replace(',', '.'));
        const w = parseFloat(match[2].replace(',', '.'));
        result.push({
            meta: product.meta,
            attributes: [{
                meta: attrs['Длина в мм'],
                value: h
            },{
                meta: attrs['Ширина в мм'],
                value: w
            }]
        })
    }
}
const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', result)

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