import Client from "./src/utils/got.js";
import dotenv from 'dotenv';
dotenv.config();

import * as XLSX from 'xlsx';

const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingorder?filter=moment%3E2025-05-01%2001:00:00;moment%3C2025-05-31%2023:59:59&expand=positions.assortment&limit=100')
const rows = response.rows
const aggregated = {};

for (const row of rows) {
  for (const pos of row.positions.rows) {
    const name = pos.assortment.name;
    const buyPrice = pos.assortment.buyPrice.value / 100
    if(name.toLowerCase().includes('акуст'))
        console.dir(pos, { depth: null, colors: true });

    if (!aggregated[name]) {
      aggregated[name] = {
        name,
        buyPrice,
        quantity: 0,
        totalCost: 0
      };
    }

    aggregated[name].quantity += pos.quantity;
    aggregated[name].totalCost += pos.quantity * buyPrice;
  }
}

// Готовим таблицу
const table = Object.values(aggregated);

// Создаём Excel
const worksheet = XLSX.utils.json_to_sheet(table);
worksheet['!cols'] = [
      { wch: 90 },
      { wch: 10 }, 
      { wch: 10 },
    ];
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');

XLSX.writeFile(workbook, 'summary.xlsx');
