import WorkPrices from "../databases/models/sklad/workPrices.model.js"
import SkladService from "../services/sklad.service.js"
import Client from "./got.js"
const getOrdersInWork = async () => {
    const works = await WorkPrices.findAll()
    const ratesPerHour = works.reduce((acc, curr) => {
        acc[curr.name] = curr.ratePerHour
        return acc
    }, {})

    const load = []
    let straightTotal = 0, curvedTotal = 0, drillsTotal = 0, cuttingTotal = 0, temperingTotal = 0, triplexTotal = 0, viz = 0, selk = 0

    const orders = await fetchAllRows(
        'https://api.moysklad.ru/api/remap/1.2/entity/customerorder?' +
        'filter=state.name=Подготовить (переделать) чертежи;' +
        'state.name=В работе;' +
        'state.name=Чертежи подготовлены, прикреплены;' +
        'state.name=Поставлено в производство&expand=positions.assortment'
    )

    for (const order of orders) {
        for (const position of order.positions.rows) {
            const attributes = (position.assortment?.attributes || []).reduce((acc, attr) => {
                acc[attr.name] = attr.value
                return acc
            }, {})

            if (!attributes) continue

            const stanok = attributes['тип станка обрабатывающий']
            if (!stanok) continue

            const height = Number(attributes['Длина в мм']) || 0
            const width = Number(attributes['Ширина в мм']) || 0
            const pfs = Number(attributes['Кол- во полуфабрикатов']) || 1
            const cutsv1 = Number(attributes['Кол во вырезов 1 категорий/ шт']) || 0
            const cutsv2 = Number(attributes['Кол во вырезов 2 категорий/ шт']) || 0
            const cutsv3 = Number(attributes['Кол во вырезов 3 категорий/ шт']) || 0

            const P = 2 * (height + width) / 1000
            const S = height * width / 1_000_000
            const count = pfs * position.quantity
            const rate = (name) => ratesPerHour[name] || 1
            const setup = 10 //Время на переналадку
            const thisStraight = stanok === 'Прямолинейка' ? (P / 0.8 + 1) / 60  * 2.5 : 0
            const thisCurved = stanok === 'Криволинейка'
                ? (P / 0.22
                + cutsv1 * 8
                + cutsv2 * 16
                + cutsv3 * 32
                + setup) / 60
                : 0

            straightTotal += thisStraight * count
            curvedTotal += thisCurved * count

            load.push({
                id: position.assortment.id,
                created: order.created.split(' ')[0],
                position: position.assortment.name,
                quantity: position.quantity,
                stanok,
                thisStraight: thisStraight * count,
                thisCurved: thisCurved * count,
                name: order.name,
                deliveryPlannedMoment: order?.deliveryPlannedMoment?.split(' ')[0],
            })
        }
    }
    const sorted = load.filter(el => el.stanok).sort((a, b) => new Date(a.created) - new Date(b.created))

    const [krivArr, pryamArr, otherArr] = sorted.reduce(
        ([kriv, pryam, other], el) => {
            if (el.stanok === 'Криволинейка') kriv.push(el)
            else if (el.stanok === 'Прямолинейка') pryam.push(el)
            else other.push(el)
            return [kriv, pryam, other]
        },
        [[], [], []]
    )

    SkladService.ordersInWork = {
        kriv: krivArr,
        pryam: pryamArr,
        other: otherArr,
        straightTotal,
        curvedTotal,
        drillsTotal,
        cuttingTotal,
        temperingTotal,
        triplexTotal,
        selk,
        viz,
    }
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

export default getOrdersInWork