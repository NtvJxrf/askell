import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import xlsx from 'xlsx';
// await axios.post('http://localhost:7878/api/sklad/createPzHook?id=38ff2ee9-7465-11f0-0a80-172f0124afa4')
import { writeFile, readFile } from 'fs/promises';
async function main() {
  // Читаем заказы
  const fileContent = await readFile('orders.json', 'utf-8');
  const orders = JSON.parse(fileContent);

  // Счётчики
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

  // Машины
  const machinesStraight = [
    { name: 'Станок на прямолинейке', norm: 48, efficiency: 1 }
  ];
  const machinesCurved = [
    { name: 'Интермак', norm: 15, efficiency: 1 },
    { name: 'Альпа большая', norm: 10, efficiency: 1 },
  ];
  // Расчёт
    const workbook = xlsx.readFile('schedule.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    let rows = xlsx.utils.sheet_to_json(sheet);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    rows = rows
      .map(row => ({
        ...row,
        parsedDate: excelDateToJSDate(row['Дата']),
      }))
      .filter(row => {
        const rowDate = new Date(
          row.parsedDate.getFullYear(),
          row.parsedDate.getMonth(),
          row.parsedDate.getDate()
        );

        if (rowDate.getTime() === today.getTime()) {
          // Если сегодня — проверяем время
          return now.getHours() < 15;
        }
        // Все даты в будущем включаем
        return rowDate > today;
      })
      .sort((a, b) => a.parsedDate - b.parsedDate);
  console.log(
    'Криволинейка:',
    CalcLoad(rows, machinesCurved, total['Криволинейка'].P, { v1: totalCutsv1, v2: totalCutsv2, v3: totalCutsv3 }, 'Криволинейка'),
  );
  console.log(
    'Прямолинейка:',
    CalcLoad(rows, machinesStraight, total['Прямолинейка'].P, { v1: totalCutsv1, v2: totalCutsv2, v3: totalCutsv3 }, 'Прямолинейка'),
  );
}

function excelDateToJSDate(serial) {
  const utcDays = Math.floor(serial - 25569); // 25569 = 1970-01-01
  return new Date(utcDays * 86400 * 1000);
}


function CalcLoad(rows, machines, meters, cuts, name) {
  let daysNeeded = 0
  let totalP = meters + (name == 'Криволинейка' ? cuts.v1 * 1.75 + cuts.v2 * 3.50 : 0)
  console.log(totalP)
  for(const day of rows){
    if(totalP > 0){
      daysNeeded++
      for(const machine of machines){
        totalP -= day[machine.name] * machine.norm
      }
    }
  }
  return daysNeeded
}

main().catch(console.error);
