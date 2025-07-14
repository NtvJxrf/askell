import Client from "../backend/src/utils/got.js";
import dotenv from 'dotenv';
dotenv.config();

import * as XLSX from 'xlsx';

export default async function createReport(filters) {
  const string='флипчарт'
  const urlBase = `https://api.moysklad.ru/api/remap/1.2/entity/processing?filter=moment>2025-07-01 00:00:00&moment<2025-07-31 00:00:00&expand=products.assortment`

  const rows = await fetchAllRows(urlBase);
  const reportData = extractBasicInfo(rows, string);
  exportToExcel(reportData);
}
createReport()
function extractBasicInfo(rows, string) {
  const data = [];

  for (const row of rows) {
    const productName = row.products.rows[0].assortment.name
    if(!productName.toLowerCase().includes(string.toLowerCase())) continue
    const created = row.created;
    const documentName = row.name;
    const link = row.meta?.uuidHref || '';
    data.push([documentName, productName, created, link]);
  }

  return data;
}

function exportToExcel(data, filename = 'отчет.xlsx') {
  const worksheetData = [
    ['Номер документа', 'Наименование товара', 'Дата создания', 'Ссылка'],
    ...data
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!autofilter'] = { ref: `A1:E1` };
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 100 },
    { wch: 20 },
    { wch: 17.5 }
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');

  XLSX.writeFile(workbook, filename);
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
