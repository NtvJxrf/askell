import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import * as XLSX from 'xlsx';
import fs from 'fs';
import axios from 'axios'
import { writeFile, readFile } from 'fs/promises';

await axios.post('http://localhost:7878/api/sklad/createPzHook?id=56508553-4474-11f0-0a80-1b74001fc4eb')
// const fileContent = await readFile('orders.json', 'utf-8');
// const orders = JSON.parse(fileContent);
// let totalCutsv1 = 0, totalCutsv2 = 0, totalCutsv3 = 0;
// const total = {
//     'Криволинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
//     'Прямолинейка': { count: 0, positionsCount: 0, S: 0, P: 0 }
// };

// // Сбор статистики по заказам
// for (const order of orders) {
//     for (const pos of order.positions.rows) {
//         const attrs = (pos.assortment?.attributes || []).reduce((a, x) => {
//             a[x.name] = x.value;
//             return a;
//         }, {});
//         const stanok = attrs['тип станка обрабатывающий'];
//         if (!stanok) continue;

//         const h = Number(attrs['Длина в мм']) || 0;
//         const w = Number(attrs['Ширина в мм']) || 0;
//         const pfs = Number(attrs['Кол- во полуфабрикатов']) || 1;
//         totalCutsv1 += Number(attrs['Кол во вырезов 1 категорий/ шт']) || 0;
//         totalCutsv2 += Number(attrs['Кол во вырезов 2 категорий/ шт']) || 0;
//         totalCutsv3 += Number(attrs['Кол во вырезов 3 категорий/ шт']) || 0;

//         const P = 2 * (h + w) / 1000;          // пог.м
//         const S = h * w / 1_000_000;           // кв.м
//         const cnt = pfs * pos.quantity;

//         total[stanok].P += P * cnt;
//         total[stanok].S += S * cnt;
//         total[stanok].count += cnt;
//         total[stanok].positionsCount += 1;
//     }
// }

// console.log('Итого по заказам:', total);
// console.log('Вырезы 1 кат:', totalCutsv1);
// console.log('Вырезы 2 кат:', totalCutsv2);
// console.log('Вырезы 3 кат:', totalCutsv3);
// const machinesStraight = [
//     { name: 'Станок на прямолинейке', norm: 48, efficiency: 1 }
// ];
// const machinesCurved = [
//     { name: 'Интермак', norm: 14, efficiency: 1 },
//     { name: 'Альпа большая', norm: 14, efficiency: 1 },
//     { name: 'Альпа малая', norm: 14, efficiency: 1 },
// ]

// const filePath = './schedule.xlsx';

// const fileBuffer = fs.readFileSync(filePath);

// // Парсинг xlsx-файла
// const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
// // Получаем имя первого листа
// const sheetName = workbook.SheetNames[0];

// // Получаем данные с листа
// const worksheet = workbook.Sheets[sheetName];
// const now = new Date();
// const array = XLSX.utils.sheet_to_json(worksheet);
// const filtered = array.filter(row => {
//   if (!(row.Дата instanceof Date)) return false;
//   return row.Дата > now;
// });

// let curved = total.Криволинейка.P
// let straight = total.Прямолинейка.P
// let curvedDays = 0
// let straightDays = 0
// filtered.forEach(el => {
//     machinesStraight.forEach(machine => {
//         straight -= el[machine.name] * machine.norm * machine.efficiency
//     })
//     straight > 0 && straightDays++
//     machinesCurved.forEach(machine => {
//         curved -= el[machine.name] * machine.norm * machine.efficiency
//     })
//     curved > 0 && curvedDays++
// })
// console.log('Криволинейка', curvedDays)
// console.log('Прямолинейка', straightDays)