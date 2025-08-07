import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();

const orders = await fetchAllRows(
    'https://api.moysklad.ru/api/remap/1.2/entity/customerorder?' +
    'filter=state.name=Подготовить (переделать) чертежи;' +
    'state.name=В работе;' +
    'state.name=Чертежи подготовлены, прикреплены;' +
    'state.name=Поставлено в производство&expand=positions.assortment'
)
let totalPositions = 0, totalCount = 0, totalSum = 0, totalS = 0, totalCutsv1 = 0, totalCutsv2 = 0, totalCutsv3 = 0
for (const order of orders) {
    for (const pos of order.positions.rows) {
        if(!pos.assortment.name.toLowerCase().includes('триплекс')) continue
        const attrs = (pos.assortment?.attributes || []).reduce((a, x) => {
            a[x.name] = x.value;
            return a;
        }, {});

        const h = Number(attrs['Длина в мм']) || 0;
        const w = Number(attrs['Ширина в мм']) || 0;
        const pfs = Number(attrs['Кол- во полуфабрикатов']) || 1;
        totalCutsv1 += Number(attrs['Кол во вырезов 1 категорий/ шт']) || 0;
        totalCutsv2 += Number(attrs['Кол во вырезов 2 категорий/ шт']) || 0;
        totalCutsv3 += Number(attrs['Кол во вырезов 3 категорий/ шт']) || 0;

        const S = h * w / 1_000_000;           // кв.м
        const cnt = pfs * pos.quantity;

        totalSum += pos.price * (1 - pos.discount / 100)
        totalS += S * cnt;
        totalCount += cnt;
        totalPositions += 1;
    }
}
console.log('Всего позиций:', totalPositions)
console.log('Всего шт:', totalCount)
console.log('Общая сумма:', totalSum)
console.log('Общая площадь:', totalS)
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