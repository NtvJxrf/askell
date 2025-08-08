import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import * as XLSX from 'xlsx';
import fs from 'fs';
import axios from 'axios'
import { writeFile, readFile } from 'fs/promises';

// const orders = await fetchAllRows(
//         'https://api.moysklad.ru/api/remap/1.2/entity/customerorder?' +
//         'filter=state.name=Подготовить (переделать) чертежи;' +
//         'state.name=В работе;' +
//         'state.name=Чертежи подготовлены, прикреплены;' +
//         'state.name=Поставлено в производство&expand=positions.assortment'
//     )
// await writeFile('orders.json', JSON.stringify(orders, null, 2), 'utf8');
const fileContent = await readFile('orders.json', 'utf-8');
const orders = JSON.parse(fileContent);
let totalCutsv1 = 0, totalCutsv2 = 0, totalCutsv3 = 0;
const total = {
    'Криволинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
    'Прямолинейка': { count: 0, positionsCount: 0, S: 0, P: 0 }
};

// Сбор статистики по заказам
for (const order of orders) {
    for (const pos of order.positions.rows) {
        const attrs = (pos.assortment?.attributes || []).reduce((a, x) => {
            a[x.name] = x.value;
            return a;
        }, {});
        const stanok = attrs['тип станка обрабатывающий'];
        if (!stanok) continue;

        const h = Number(attrs['Длина в мм']) || 0;
        const w = Number(attrs['Ширина в мм']) || 0;
        const pfs = Number(attrs['Кол- во полуфабрикатов']) || 1;
        totalCutsv1 += Number(attrs['Кол во вырезов 1 категорий/ шт']) || 0;
        totalCutsv2 += Number(attrs['Кол во вырезов 2 категорий/ шт']) || 0;
        totalCutsv3 += Number(attrs['Кол во вырезов 3 категорий/ шт']) || 0;

        const P = 2 * (h + w) / 1000;          // пог.м
        const S = h * w / 1_000_000;           // кв.м
        const cnt = pfs * pos.quantity;

        total[stanok].P += P * cnt;
        total[stanok].S += S * cnt;
        total[stanok].count += cnt;
        total[stanok].positionsCount += 1;
    }
}

console.log('Итого по заказам:', total);
console.log('Вырезы 1 кат:', totalCutsv1);
console.log('Вырезы 2 кат:', totalCutsv2);
console.log('Вырезы 3 кат:', totalCutsv3);
const machinesStraight = [
    { name: 'Станок на прямолинейке', norm: 48, efficiency: 1 }
];
const machinesCurved = [
    { name: 'Интермак', norm: 18, efficiency: 1 },
    { name: 'Альпа большая', norm: 10, efficiency: 1 },
    { name: 'Альпа малая', norm: 12, efficiency: 1 },
]

const fileBuffer = fs.readFileSync('./schedule.xlsx');
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const array = XLSX.utils.sheet_to_json(worksheet);

const now = new Date();

let threshold = new Date(now);
if (now.getHours() >= 15) {
  // Сейчас 15:00 или позже — threshold = начало следующего дня
  threshold.setDate(threshold.getDate() + 1);
}
threshold.setHours(0, 0, 0, 0);

const filtered = array.filter(row => {
  if (!row['Дата'] || typeof row['Дата'] !== 'number') return false;

  // Конвертация excel-числа в JS Date
  const jsDate = new Date((row['Дата'] - 25569) * 86400 * 1000);

  return jsDate >= threshold;
})
// Счётчики
let curved = total.Криволинейка.P + totalCutsv1 * 1.75 + totalCutsv2 * 3.5 + totalCutsv3 * 5.25 + total.Криволинейка.positionsCount * 2.33
console.log(curved)
let straight = total.Прямолинейка.P 
console.log(straight)
let curvedDays = 0;
let straightDays = 0;

// Обход
for (const el of filtered) {

    if (straight > 0) straightDays++;
    machinesStraight.forEach(machine => {
        straight -= el[machine.name] * machine.norm * machine.efficiency
    });

    if (curved > 0) curvedDays++;
    machinesCurved.forEach(machine => {
        curved -= el[machine.name] * machine.norm * machine.efficiency
    });

    if (curved <= 0 && straight <= 0) break;
}

// Итоги
console.log('Криволинейка', curvedDays);
console.log('Прямолинейка', straightDays);


// async function fetchAllRows(urlBase) {
//   const limit = 100;
//   const firstUrl = `${urlBase}&limit=${limit}&offset=0`;
//   const firstResponse = await Client.sklad(firstUrl);

//   if (!firstResponse.rows || firstResponse.rows.length === 0) {
//     return [];
//   }

//   const allRows = [...firstResponse.rows];
//   const totalSize = firstResponse.meta?.size || allRows.length;

//   const requests = [];
//   for (let offset = limit; offset < totalSize; offset += limit) {
//     const url = `${urlBase}&limit=${limit}&offset=${offset}`;
//     requests.push(Client.sklad(url));
//   }

//   const responses = await Promise.all(requests);
//   for (const res of responses) {
//     if (res.rows) {
//       allRows.push(...res.rows);
//     }
//   }

//   return allRows;
// }