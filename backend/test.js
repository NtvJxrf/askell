import SkladService from '../backend/src/services/sklad.service.js'
import Client from '../backend/src/utils/got.js';
import { writeFile, readFile } from 'fs/promises';

const getOrdersInWork = async () => {
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
    await writeFile('orders.json', JSON.stringify(orders, null, 2), 'utf8');
    // const fileContent = await readFile('orders.json', 'utf-8');
    // const orders = JSON.parse(fileContent);
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
    console.log(`Total Triplex: ${totalTriplexM2}`)
    console.log('Итого по заказам:', total);
    console.log('Вырезы 1 кат:', totalCutsv1);
    console.log('Вырезы 2 кат:', totalCutsv2);
    console.log('Вырезы 3 кат:', totalCutsv3);
    const machinesStraight = [
        { name: '1 станок прямолинейка', shiftHours: 8, norm: 48, efficiency: 1, schedule: { on: 5, off: 2 } }
    ];
    const machinesCurved = [
        { name: '1 станок криволинейка', shiftHours: 12, norm: 15, efficiency: 1, schedule: { on: 3, off: 1 } },
        { name: '2 станок криволинейка', shiftHours: 12, norm: 10, efficiency: 1, schedule: { on: 2, off: 2 } },
    ];
    const straightLoad = Math.ceil(total['Прямолинейка'].P / (8 * 48))
    console.log('Загруженность прямолинейки в рабочих днях:', straightLoad)
    const temp = Math.ceil((total['Криволинейка'].P / 14 + totalCutsv1 / 8 + totalCutsv2 / 4 + totalCutsv3 / 2 + total.Криволинейка.positionsCount * 0.166) / (12 * 1.25))
    const curvedLoad = temp - Math.floor(temp / 7) * 2
    console.log('Загруженность криволинейки в рабочих днях:', curvedLoad)
    const triplexLoad = Math.ceil(total['Триплекс (Без учета резки стекла)'].S / 27)
    console.log(total['Триплекс (Без учета резки стекла)'].S / 27)
    console.log(triplexLoad)
    const res = {
      straightLoad,
      curvedLoad,
      triplexLoad,
      total,
      totalCutsv1,
      totalCutsv2,
      totalCutsv3,
      curvedArr: curvedArr.sort((a, b) => new Date(a.created) - new Date(b.created)),
      straightArr: straightArr.sort((a, b) => new Date(a.created) - new Date(b.created)),
      otherArr: otherArr.sort((a, b) => new Date(a.created) - new Date(b.created))
    }
    SkladService.ordersInWork = res

}
getOrdersInWork()
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

export default getOrdersInWork