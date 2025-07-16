import Client from "./src/utils/got.js";
import dotenv from 'dotenv';
dotenv.config();

import * as XLSX from 'xlsx';

export default async function createReport() {
    const urlBase = `https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=moment%3E2025-01-01%2000:00:00&expand=positions.assortment`

    const rows = await fetchAllRows(urlBase);
    const reportData = extractBasicInfo(rows);
    exportToExcel(reportData);
}
createReport()
function extractBasicInfo(rows) {
  const grouped = {};

  for (const row of rows) {
    for (const pos of row.positions.rows) {
      if (!pos.assortment.name.toLowerCase().includes('триплекс')) continue;

      const heightAttr = pos.assortment.attributes.find(el => el.name === 'Длина в мм');
      const widthAttr = pos.assortment.attributes.find(el => el.name === 'Ширина в мм');

      if (!heightAttr || !widthAttr) continue;
      const height = heightAttr.value;
      const width = widthAttr.value;
      const larger = Math.max(height, width)
      const lesser = Math.min(height, width)
      if(larger < 1000 || lesser < 1000) continue
      const size = `${height}*${width}`;

      if (!grouped[size]) grouped[size] = [];

      grouped[size].push([
        row.name,            // Номер заказа покупателя
        pos.assortment.name,            // Наименование товара
        row.created,         // Дата создания
        pos.assortment.volume,          // Объем
      ]);
    }
  }

  // Преобразуем в массив с заголовками
  const finalData = [];
  for (const size in grouped) {
    finalData.push([`Размер: ${size}`]); // Заголовок группы
    finalData.push(...grouped[size]);
    finalData.push([]); // Пустая строка между группами
  }

  return finalData;
}


function exportToExcel(data, filename = 'отчет.xlsx') {
  const worksheetData = [
    ['Номер заказа покупателя', 'Наименование товара', 'Дата создания', 'Объем', 'Размер'],
    ...data
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!autofilter'] = { ref: `A1:D1` };
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 100 },
    { wch: 20 },
    { wch: 17.5 }
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');

  XLSX.writeFile(workbook, 'отчет-триплекс.xlsx');
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
