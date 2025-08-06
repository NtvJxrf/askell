import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();

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
    { name: '1 станок прямолинейка', shiftHours: 8, norm: 48, efficiency: 1, schedule: { on: 5, off: 2 } }
  ];
  const machinesCurved = [
    { name: '1 станок криволинейка', shiftHours: 12, norm: 14, efficiency: 1, schedule: { on: 3, off: 1 } },
    { name: '2 станок криволинейка', shiftHours: 12, norm: 14, efficiency: 1, schedule: { on: 2, off: 2 } },
  ];
5_361-384-384-384-384-384-0-0-384-384-384-384-384-0-0-384-384-384-384

2_983-336-336-168-0-336-336-168-0-336-336-168-0-336-168
2_983-168-168-336-168-168-168-336-168-168-336-168-168-336-168

14_064-1_440-1_440-720-0-1_440-1_440-720-0-1_440-1_440-720-1_440-1_440-720
  // Расчёт
  console.log(
    'Криволинейка:',
    CalcLoad(machinesCurved, total['Криволинейка'].P, { v1: totalCutsv1, v2: totalCutsv2, v3: totalCutsv3 }, 'Криволинейка'),
  );
  console.log(
    'Прямолинейка:',
    CalcLoad(machinesStraight, total['Прямолинейка'].P, { v1: totalCutsv1, v2: totalCutsv2, v3: totalCutsv3 }, 'Прямолинейка'),
  );
}

function CalcLoad(machines, meters, cuts, name) {
  // 1. Считаем минуты на вырезы
  let cutMin = 0
  if(name == 'Криволинейка'){
    cutMin = (cuts.v1 || 0) * (60/8)
               + (cuts.v2 || 0) * (60/4)
               + (cuts.v3 || 0) * (60/2);
  }

  // 2. Считаем среднее время на метр
  let wNorm = 0, wWeight = 0;
  machines.forEach(m => {
    const cap = m.shiftHours * 60 * m.efficiency;
    wNorm += m.norm * cap;
    wWeight += cap;
  });
  const avgNorm = wNorm / wWeight;       // м/ч
  const minPerMeter = 60 / avgNorm;      // мин/м
  const meterMin = meters * minPerMeter;

  const totalMin = meterMin + cutMin;

  // 3. Симуляция по календарным дням, считаем только on-дни
  let remainingMin = totalMin;
let workDaysCount = 0;
let calendarDaysCount = 0;

for (let day = 1; day <= 365; day++) {
  calendarDaysCount++;
  let dayMin = 0;
  let anyWork = false;

  machines.forEach(m => {
    const cycle = m.schedule.on + m.schedule.off;
    const inCycle = (day - 1) % cycle;
    if (inCycle < m.schedule.on) {
      dayMin += m.shiftHours * 60 * m.efficiency;
      anyWork = true;
    }
  });

  if (!anyWork) continue;

  const usedMin = Math.min(remainingMin, dayMin);
  remainingMin -= usedMin;
  workDaysCount++;

  if (remainingMin <= 0) {
    break;
  }
}

if (remainingMin > 0) {
  throw new Error('Недостаточно смен в течение года для выполнения заказа');
}

  return {
    workDays: workDaysCount,
    calendarDays: calendarDaysCount
  };
}

main().catch(console.error);
