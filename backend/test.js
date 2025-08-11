import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
await axios.post('http://localhost:7878/api/sklad/createPzHook?id=38ff2ee9-7465-11f0-0a80-172f0124afa4')
// import { writeFile, readFile } from 'fs/promises';

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
    { name: '1 станок прямолинейка', norm: 48, efficiency: 1 }
  ];
  const machinesCurved = [
    { name: 'Интермак', norm: 8.4, efficiency: 1 },
    { name: 'Альпа большая', norm: 5.6, efficiency: 1 },
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

}

main().catch(console.error);
