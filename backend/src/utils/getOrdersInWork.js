import SkladService from '../services/sklad.service.js';
import Client from './got.js';
import { broadcast } from "./WebSocket.js"
import { google } from "googleapis";
const getOrdersInWork = async () => {
    const res = await readSheet()
    SkladService.ordersInWork = res
    broadcast({type: 'ordersInWork', data: res})
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
async function getLoad() {
  const orders = await fetchAllRows(
        'https://api.moysklad.ru/api/remap/1.2/entity/customerorder?' +
        'filter=state.name=Подготовить (переделать) чертежи;' +
        'state.name=В работе;' +
        'state.name=Чертежи подготовлены, прикреплены;' +
        'state.name=Поставлено в производство;' +
        'state.name=Проверить чертежи;' +
        'state.name=Проверено технологом' +
        '&expand=positions.assortment'
    )
    let totalCutsv1 = 0, totalCutsv2 = 0, totalCutsv3 = 0, totalTriplexM2 = 0
    const total = {
        'Криволинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
        'Прямолинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
        'Триплекс (Без учета резки стекла)': { count: 0, positionsCount: 0, S: 0, P: 0 }
    };
    const curvedArr = [], straightArr = [], otherArr = []
    // Сбор статистики по заказам
    for (const order of orders) {
        for (const pos of order.positions.rows) {
            const attrs = (pos.assortment?.attributes || []).reduce((a, x) => {
                a[x.name] = x.value;
                return a;
            }, {});
            const stanok = attrs['Тип станка'];
            const positionData = {id: pos.id, position: pos.assortment.name, deliveryPlannedMoment: order.deliveryPlannedMoment, name: order.name, created: order.created, quantity: pos.quantity}
            !stanok && otherArr.push(positionData)
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
            const currArr = stanok === 'Прямолинейка' ? straightArr : curvedArr
            currArr.push(positionData)
        }
    }
    return {
      total,
      totalCutsv1,
      totalCutsv2,
      totalCutsv3,
      totalTriplexM2,
      curvedArr: curvedArr.sort((a, b) => new Date(a.created) - new Date(b.created)),
      straightArr: straightArr.sort((a, b) => new Date(a.created) - new Date(b.created)),
      otherArr: otherArr.sort((a, b) => new Date(a.created) - new Date(b.created))
    }
}
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

function calcLoad(objects, startIndex, load, columns, toNum) {
    let result = 0;
    let index = startIndex;
    while (load > 0) {
        result++;
        for (const col of columns) {
            load -= toNum(objects[0][col]) * toNum(objects[index][col]);
        }
        index++;
    }
    return result;
}
async function readSheet() {
    const auth = new google.auth.GoogleAuth({
        keyFile: "./schedule-471508-c646e9809860.json",
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = "1PpE2ng3DS8u0aJCEzUrysIePp-ji731uF7z2wcb_XBQ";
    const range = "schedule!A1:Z500";

    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const objects = toObjects(res.data.values);
    const currentDate = todayISO();
    const currentLoad = await getLoad();

    const index = objects.findIndex(el => el["Дата"] === currentDate);

    const toNum = str => Number(str.replace(",", "."));

    const curvedLoad = currentLoad.total["Криволинейка"].P + currentLoad.totalCutsv1 * 1.86 + currentLoad.totalCutsv2 * 3.5 + currentLoad.totalCutsv3 * 7;
    const straightLoad = currentLoad.total["Прямолинейка"].P;
    const triplexLoad = currentLoad.totalTriplexM2;

    const curvedResult = calcLoad(objects, index, curvedLoad, ["Интермак", "Альпа большая", "Альпа малая"], toNum);
    const straightResult = calcLoad(objects, index, straightLoad, ["Джими"], toNum);
    const triplexResult = calcLoad(objects, index, triplexLoad, ["Триплекс"], toNum);
    return { ...currentLoad, curvedResult, straightResult, triplexResult }
}
export default getOrdersInWork