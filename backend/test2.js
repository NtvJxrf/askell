import Client from './src/utils/got.js';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import axios from 'axios';
dotenv.config();
await axios.post('http://localhost:7878/api/sklad/changeStatusByDemand?id=a7abd7b5-7f38-11f0-0a80-04840008b7c4')
// const orders = await fetchAllRows(
//     'https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=agent=https://api.moysklad.ru/api/remap/1.2/entity/counterparty/ddff8f46-e2fe-11ec-0a80-0cef002e4e8d&expand=positions.assortment'
// );

// // сортируем по дате создания
// orders.sort((a, b) => new Date(a.created) - new Date(b.created));

// const data = [
//     ['Номер заказа', 'Дата', 'Товар', 'Количество', 'Цена', 'Скидка %', 'Сумма', 'м²']
// ];

// for (const order of orders) {
//     for (const pos of order.positions.rows) {
//         data.push([
//             order.name,
//             new Date(order.created).toLocaleDateString('ru-RU'),
//             pos.assortment?.name || '',
//             pos.quantity,
//             pos.price / 100,
//             pos.discount || 0,
//             (pos.price / 100) * (1 - (pos.discount || 0) / 100) * pos.quantity,
//             (pos?.assortment?.volume || 0) * pos.quantity
//         ]);
//     }
//     // пустая строка между заказами
//     data.push([]);
// }

// const worksheet = XLSX.utils.aoa_to_sheet(data);
// const workbook = XLSX.utils.book_new();
// XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

// XLSX.writeFile(workbook, 'liga.xlsx');
// console.log(`Excel файл создан`);

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