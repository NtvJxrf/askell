import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import { google } from "googleapis";
import { writeFile, readFile } from 'fs/promises';
function toObjects(values) {
    const [header, ...rows] = values;
    return rows.map(row =>
        Object.fromEntries(header.map((key, i) => [key, row[i] ?? null]))
    );
}
function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

////////////
const load = async () => {
    const fileContent = await readFile('orders.json', 'utf-8');
    const orders = JSON.parse(fileContent);
    let totalCutsv1 = 0, totalCutsv2 = 0, totalCutsv3 = 0, totalTriplexM2 = 0
    const total = {
        'Криволинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
        'Прямолинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
        'Триплекс (Без учета резки стекла)': { count: 0, positionsCount: 0, S: 0, P: 0 }
    };
    // Сбор статистики по заказам
    for (const order of orders) {
        for (const pos of order.positions.rows) {
            const attrs = (pos.assortment?.attributes || []).reduce((a, x) => {
                a[x.name] = x.value;
                return a;
            }, {});
            const stanok = attrs['Тип станка'];

            if (!stanok) continue;
            const h = Number(attrs['Длина в мм']) || 0;
            const w = Number(attrs['Ширина в мм']) || 0;
            const pfs = Number(attrs['Кол-во полуфабрикатов']) || 1;
            totalCutsv1 += Number(attrs['Кол-во вырезов 1 категорий']) || 0;
            totalCutsv2 += Number(attrs['Кол-во вырезов 2 категорий']) || 0;
            totalCutsv3 += Number(attrs['Кол-во вырезов 3 категорий']) || 0;

            const P = 2 * (h + w) / 1000;          // пог.м
            const S = h * w / 1_000_000;           // кв.м
            const cnt = pfs * pos.quantity;
            if(pos.assortment.name.toLowerCase().includes('триплекс')){
              total['Триплекс (Без учета резки стекла)'].P += P * pos.quantity;
              total['Триплекс (Без учета резки стекла)'].S += S * pos.quantity;
              total['Триплекс (Без учета резки стекла)'].count += pos.quantity
              total['Триплекс (Без учета резки стекла)'].positionsCount += 1
              totalTriplexM2 += pos.assortment.volume * pos.quantity
            }
            total[stanok].P += P * cnt;
            total[stanok].S += S * cnt;
            total[stanok].count += cnt;
            total[stanok].positionsCount += 1;
        }
    }
    return {...total, totalCutsv1, totalCutsv2, totalCutsv3, totalTriplexM2}
}

/////////////
async function readSheet() {
    // Авторизация
    const auth = new google.auth.GoogleAuth({
        keyFile: "./schedule-471508-c646e9809860.json",
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = "1PpE2ng3DS8u0aJCEzUrysIePp-ji731uF7z2wcb_XBQ";
    const range = "schedule!A1:F500"; // диапазон ячеек

    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const objects = toObjects(res.data.values);
    const currentDate = todayISO()
    const currentLoad = await load()
    let indexCurved = objects.findIndex(el => el['Дата'] == currentDate);
    let indexStraight = indexCurved;
    let curvedLoad = currentLoad['Криволинейка'].P + currentLoad.totalCutsv1 * 1.75
    let straightLoad = currentLoad['Прямолинейка'].P
    let straightResult = 0
    let curvedResult = 0
    while(curvedLoad > 0){
        curvedResult ++
        curvedLoad -= Number(objects[0]['Интермак']) * objects[indexCurved]['Интермак']
        curvedLoad -= Number(objects[0]['Альпа большая']) * objects[indexCurved]['Альпа большая']
        curvedLoad -= Number(objects[0]['Альпа малая']) * objects[indexCurved]['Альпа малая']
        indexCurved++
    }
    while(straightLoad > 0){
        straightResult ++
        straightLoad -= Number(objects[0]['Джими']) * objects[indexStraight]['Джими']
        indexStraight++
    }
    console.log(currentLoad)
    console.log(curvedResult)
    console.log(straightResult)
}
readSheet()