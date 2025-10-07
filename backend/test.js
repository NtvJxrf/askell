import SkladService from './src/services/sklad.service.js'
import Client from './src/utils/got.js';
import { broadcast } from './src/utils/WebSocket.js';
import { google } from "googleapis";
import { writeFile, readFile } from 'fs/promises'
import * as XLSX from 'xlsx'
const getOrdersInWork = async () => {
    const res = await readSheet()
    SkladService.ordersInWork = res
    broadcast({ type: 'ordersInWork', data: res })
}
async function getLoad() {
    // const tasks = await fetchAllRows('https://api.moysklad.ru/api/remap/1.2/entity/productiontask?' +
    //     'filter=state.name=Новое задание;' + 
    //     'state.name=Поставлен в производство;' +
    //     'state.name=Ждёт раскрой;' +
    //     'state.name=Раскроен;' +
    //     'state.name=Закалка;' +
    //     'https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/attributes/8438849b-5b27-11f0-0a80-01dc002fd402=false;'
    // )
    const orders = await fetchAllRows(
        'https://api.moysklad.ru/api/remap/1.2/entity/customerorder?' +
        'filter=state.name=Подготовить (переделать) чертежи;' +
        'state.name=Чертежи подготовлены, прикреплены;' +
        'state.name=Проверить чертежи;' +
        'state.name=Проверено технологом' +
        '&expand=positions.assortment'
    )
    // const productPromises = []
    // const productionStagesPromises = []
    // for (const task of tasks) {
    //     productPromises.push(fetchAllRows(`${task.meta.href}/products?expand=assortment`).then(rows => ({
    //         task,
    //         products: rows
    //     })))
    //     productionStagesPromises.push(fetchAllRows(`https://api.moysklad.ru/api/remap/1.2/entity/productionstage/?filter=productionTask=${task.meta.href}&expand=stage`).then(rows => ({
    //         task,
    //         stages: rows
    //     })))
    // }
    const products = JSON.parse(await readFile('products.json', 'utf-8'))
    const productionStages = JSON.parse(await readFile('productionStages.json', 'utf-8'))
    // const products = await Promise.allSettled(productPromises)
    // const productionStages = await Promise.allSettled(productionStagesPromises)
    // await writeFile('products.json', JSON.stringify(products, null, 2), 'utf-8')
    // await writeFile('productionStages.json', JSON.stringify(productionStages, null, 2), 'utf-8')
    const total = {
        'Криволинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
        'Прямолинейка': { count: 0, positionsCount: 0, S: 0, P: 0 },
        'Триплекс (Без учета резки стекла)': { count: 0, positionsCount: 0, S: 0, P: 0 },
        cutsv1: 0,
        cutsv2: 0,
        cutsv3: 0,
    }
    const result = {}
    for (const { status, value } of products) {
        const { task, products } = value
        if (task.productionEnd)
            continue
        const attrs = (task.attributes || []).reduce((a, x) => {
            a[x.name] = x.value;
            return a;
        }, {});
        for (const product of products) {
            countLoadTasks(product, total, result, attrs['№ заказа покупателя'], task.deliveryPlannedMoment, task.productionStart)
        }
    }
    for (const order of orders) {
        for (const pos of order.positions.rows)
            countLoadOrders(pos, total)
    }
    for (const { status, value } of productionStages) {
        const { task, stages } = value
        for (const stage of stages) {
            const name = stage.stage.name
            const key = stage.productionRow.meta.href;
            if (!result[key]) {
                continue;
            }
            result[key].cutOutQuantity ??= 0
            switch (name) {
                case 'Криволинейная обработка':
                    total['Криволинейка'].P -= (result[key].P / result[key].count) * stage.completedQuantity
                    total['Криволинейка'].S -= (result[key].S / result[key].count) * stage.completedQuantity
                    break
                case 'Прямолинейная обработка':
                    total['Прямолинейка'].P -= (result[key].P / result[key].count) * stage.completedQuantity
                    total['Прямолинейка'].S -= (result[key].S / result[key].count) * stage.completedQuantity
                    break
                case 'Триплексование':
                    total['Триплекс (Без учета резки стекла)'].P -= (result[key].P / result[key].count) * stage.completedQuantity
                    total['Триплекс (Без учета резки стекла)'].S -= (result[key].S / result[key].count) * stage.completedQuantity
                    break
                case 'Раскрой':
                    result[key].cutOutQuantity = stage.completedQuantity
                    result[key].otherData.availableQ = result[key].isStarted ? stage.availableQuantity : stage.totalQuantity
                break
                case 'ОТК':
                    stage.skippedQuantity && (result[key].cutOutQuantity += stage.skippedQuantity)
                break
            }
        }
    }
    function countLoadTasks(product, total, result, name, date, isStarted) {
        const attrs = (product.assortment?.attributes || []).reduce((a, x) => {
            a[x.name] = x.value;
            return a;
        }, {});
        const stanok = attrs['Тип станка'];
        if (!stanok) {
            return
        }
        const h = Number(attrs['Длина в мм'])
        const w = Number(attrs['Ширина в мм'])
        const cutsv1 = Number(attrs['Кол-во вырезов 1 категорий']) || 0;
        const cutsv2 = Number(attrs['Кол-во вырезов 2 категорий']) || 0;
        const cutsv3 = Number(attrs['Кол-во вырезов 3 категорий']) || 0;
        const drills = Number(attrs['Кол-во сверлений']) || 0;
        const zenk = Number(attrs['Кол-во зенкований']) || 0;
        const tempered = attrs['Закалка'] || false
        const material = attrs['Материал 1']
        const P = 2 * (h + w) / 1000;          // пог.м
        const S = h * w / 1_000_000;           // кв.м
        const Q = product.planQuantity
        if (attrs['Тип изделия'] == 'Стекло') {
            total[stanok].P += P * Q + cutsv1 * 1.86 * Q + cutsv2 * 3.5 * Q + cutsv3 * 7 * Q
            total[stanok].S += S * Q
            total[stanok].count += Q
            total[stanok].positionsCount++
            total.cutsv1 += cutsv1 * Q
            total.cutsv2 += cutsv2 * Q
            total.cutsv3 += cutsv3 * Q
            const key = product.productionRow.meta.href
            result[key] = result[key] || {
                P: 0, S: 0, count: 0, cutsv1: 0, cutsv2: 0, cutsv3: 0, isStarted, otherData:{
                    material,
                    product: product.assortment.name,
                    name,
                    totalQ: Q,
                    date,
                    S,
                    P,
                    cutsv1,
                    cutsv2,
                    cutsv3,
                    drills,
                    zenk,
                    h,
                    w,
                    stanok,
                    tempered,
                    totalS: S * Q,
                    totalP: P * Q,
                    totalDrills: drills * Q,
                    totalZenk: zenk * Q
                }
            };
            result[key].glass = true
            result[key].P += P * Q
            result[key].S += S * Q
            result[key].count += Q
            result[key].cutsv1 += cutsv1 * Q
            result[key].cutsv2 += cutsv2 * Q
            result[key].cutsv3 += cutsv3 * Q
        }
        if (attrs['Тип изделия'] == 'Триплекс') {
            total['Триплекс (Без учета резки стекла)'].P += P * Q
            total['Триплекс (Без учета резки стекла)'].S += S * Q
            total['Триплекс (Без учета резки стекла)'].count += Q
            total['Триплекс (Без учета резки стекла)'].positionsCount += 1

            const key = product.productionRow.meta.href;
            result[key] = result[key] || { P: 0, S: 0, count: 0 };
            result[key].P += P * Q
            result[key].S += S * Q
            result[key].count += Q
        }
    }
    function countLoadOrders(product, total) {
        const attrs = (product.assortment?.attributes || []).reduce((a, x) => {
            a[x.name] = x.value;
            return a;
        }, {});
        const stanok = attrs['Тип станка'];
        if (!stanok) return
        const h = Number(attrs['Длина в мм']) || 0;
        const w = Number(attrs['Ширина в мм']) || 0;
        const pfs = Number(attrs['Кол-во полуфабрикатов']) || 1;
        const cutsv1 = Number(attrs['Кол-во вырезов 1 категорий']) || 0;
        const cutsv2 = Number(attrs['Кол-во вырезов 2 категорий']) || 0;
        const cutsv3 = Number(attrs['Кол-во вырезов 3 категорий']) || 0;

        const P = 2 * (h + w) / 1000;          // пог.м
        const S = h * w / 1_000_000;           // кв.м
        const cnt = pfs * product.quantity;
        if (product.assortment.name.toLowerCase().includes('триплекс')) {
            total['Триплекс (Без учета резки стекла)'].P += P * product.quantity
            total['Триплекс (Без учета резки стекла)'].S += S * product.quantity;
            total['Триплекс (Без учета резки стекла)'].count += product.quantity
            total['Триплекс (Без учета резки стекла)'].positionsCount += 1
        }
        total[stanok].P += P * cnt + cutsv1 * 1.86 * cnt + cutsv2 * 3.5 * cnt + cutsv3 * 7 * cnt
        total[stanok].S += S * cnt;
        total[stanok].count += cnt;
    }
    const wb = XLSX.utils.book_new()
    // берём все значения из result, где есть остаток
    const allRows = Object.values(result)
        .filter(v => (v.count - (v.cutOutQuantity || 0)) > 0 && v.glass)
        .map(v => ({
            ...v.otherData
        }))
    allRows.sort((a, b) => (a.material || '').localeCompare(b.material || '', 'ru'))
    const ws = XLSX.utils.json_to_sheet(allRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Materials')
    XLSX.writeFile(wb, 'materials.xlsx')
    return total
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

    const curvedLoad = currentLoad["Криволинейка"].P
    const straightLoad = currentLoad["Прямолинейка"].P
    const triplexLoad = currentLoad['Триплекс (Без учета резки стекла)'].S

    const curvedResult = calcLoad(objects, index, curvedLoad, ["Интермак", "Альпа большая", "Альпа малая"], toNum);
    const straightResult = calcLoad(objects, index, straightLoad, ["Джими"], toNum);
    const triplexResult = calcLoad(objects, index, triplexLoad, ["Триплекс"], toNum);
    return { ...currentLoad, curvedResult, straightResult, triplexResult }
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
getOrdersInWork()
export default getOrdersInWork