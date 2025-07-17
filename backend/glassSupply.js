import Client from "./src/utils/got.js";
import dotenv from 'dotenv';
dotenv.config();

import * as XLSX from 'xlsx';

export default async function createReport() {
    const urlBase = `https://api.moysklad.ru/api/remap/1.2/entity/supply?filter=moment>2024-01-01;moment<2024-07-17&expand=positions.assortment`

    const rows = await fetchAllRows(urlBase);
    const [data, secondData] = extractBasicInfo(rows);
    exportToExcel(data, secondData);
}
createReport()
function extractBasicInfo(rows) {
  const grouped = {};
  const list2 = []
  for (const row of rows) {
    for (const pos of row.positions.rows) {
      const name = pos.assortment.name;
      if (!name.toLowerCase().includes('стекло') || name.toLowerCase().includes('доск') || name.toLowerCase().includes('закал')) continue;

      const quantity = pos.quantity || 0;
      const price = (pos.price || 0) / 100; // в копейках
      const moment = row.created
      list2.push([row.name, name, quantity, price, moment])
      if (!grouped[name]) {
        grouped[name] = {
          totalQuantity: 0,
          totalPrice: 0,
          count: 0,
        };
      }

      grouped[name].totalQuantity += quantity;
      grouped[name].totalPrice += price;
      grouped[name].count += 1;
    }
  }

  // Преобразуем в массив с заголовками
  const finalData = [];
  for (const name in grouped) {
    const g = grouped[name];
    const avgPrice = g.count > 0 ? g.totalPrice / g.count : 0;

    finalData.push([
      name,
      g.totalQuantity,
      avgPrice.toFixed(2),
    ]);
  }

  return [finalData, list2];
}



function exportToExcel(data, list2, filename = 'Приемки за 25 год.xlsx') {
  const worksheetData = [
    ['Наименование товара', 'Общий объем', 'Средняя цена'],
    ...data
  ];
  const secondData = [
    ['Номер приемки', 'Наименование товара', 'Количество', 'Цена', 'Дата создания'],
    ...list2
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!autofilter'] = { ref: `A1:C1` };
  worksheet['!cols'] = [
    { wch: 100 },
    { wch: 20 },
    { wch: 20 },
  ];
  const workbook = XLSX.utils.book_new();
  const secondSheet = XLSX.utils.aoa_to_sheet(secondData);
  secondSheet['!autofilter'] = { ref: `A1:C1` };
  secondSheet['!cols'] = [
    { wch: 15 },
    { wch: 80 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Сгруппировано');
  XLSX.utils.book_append_sheet(workbook, secondSheet, 'Все подряд');

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
