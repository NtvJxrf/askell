import ApiError from "../utils/apiError.js"
import Client from "../utils/got.js"
import Details from "../databases/models/sklad/details.model.js"
import { Op } from 'sequelize'
const dictionary = {
        productFolders: {
            glassGuard: {
                "meta" : {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productfolder/8c5e0002-5f31-11ed-0a80-0bf10003e56f",
                    "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata",
                    "type" : "productfolder",
                    "mediaType" : "application/json",
                    "uuidHref" : "https://online.moysklad.ru/app/#good/edit?id=8c5e0002-5f31-11ed-0a80-0bf10003e56f"
                }
            }
        },
        attributes: {
            'Вид номенклатуры': {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/1cefb31a-65fb-11ef-0a80-0c0e00155150",
                "type" : "attributemetadata",
                "mediaType" : "application/json"
            },'Длина в мм': {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/af7e2ea6-0ff5-11ee-0a80-04e600042beb",
                    "type" : "attributemetadata",
                    "mediaType" : "application/json"
            },'Ширина в мм': {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/af7e3204-0ff5-11ee-0a80-04e600042bec",
                "type" : "attributemetadata",
                "mediaType" : "application/json"
            },'Кол во вырезов 1 категорий/ шт': {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/a73e8f44-102d-11ee-0a80-06060010f7cc",
                "type" : "attributemetadata",
                "mediaType" : "application/json"
            },'Кол во вырезов 2 категорий/ шт': {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/a73e9004-102d-11ee-0a80-06060010f7cd",
                "type" : "attributemetadata",
                "mediaType" : "application/json"
            },'Кол во сверлении/шт': {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/a73e913f-102d-11ee-0a80-06060010f7cf",
                "type" : "attributemetadata",
                "mediaType" : "application/json"
            },'Кол во зенковании/ шт': {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/a73e91db-102d-11ee-0a80-06060010f7d0",
                "type" : "attributemetadata",
                "mediaType" : "application/json"
            },'тип станка обрабатывающий': {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/a73e8b90-102d-11ee-0a80-06060010f7ca",
                "type" : "attributemetadata",
                "mediaType" : "application/json"
            }

        },
        attributesValue: {
            'Готовая продукция': {
                'meta': {
                    'href': 'https://api.moysklad.ru/api/remap/1.2/entity/customentity/b1afe1e0-65fa-11ef-0a80-0d170011cc61/c3513bce-65fa-11ef-0a80-01ee0012bd23',
                    'metadataHref': 'https://api.moysklad.ru/api/remap/1.2/context/companysettings/metadata/customEntities/b1afe1e0-65fa-11ef-0a80-0d170011cc61',
                    'type': 'customentity',
                    'mediaType': 'application/json',
                    'uuidHref': 'https://online.moysklad.ru/app/#custom_b1afe1e0-65fa-11ef-0a80-0d170011cc61/edit?id=c3513bce-65fa-11ef-0a80-01ee0012bd23'
                },
                'name': 'Готовая продукция'
            }
        }
}

export default class SkladService {
    static selfcost = {
        workPrices: {
            'Раскрой стекла': 65.05970854,
            'Раскрой керамики': 654.678932,
            'Раскрой гидрорез керамика': 245.5045995,
            'Шлифовка': {
                'Криволинейка': 85.39086746,
                'Прямолинейка': 36.92578052
            },
            'Полировка': {
                'Криволинейка': 113.8544899,
                'Прямолинейка': 36.92578052
            },
            'Мойка': 52.18382839,
            'Закалка': {
                '4': 30.36119732,
                '5': 37.95149665,
                '6': 45.54179598,
                '8': 60.72239464,
                '10': 75.9029933,
                '12': 91.08359196
            },
            'Сверление': 113.8544899,
            'Зенковка': 227.7089799,
            'Вырез в стекле 1 кат': 455.4179598,
            'Вырез в стекле 2 кат': 910.8359196,
            'Окраска стекла': 245.5045995,
            'УФ печать': 2365,
            'Триплекс': {
                '4': 468.7170214,
                '6': 468.7170214,
                '8': 468.7170214,
                '9': 468.7170214,
                '10': 489.2233911,
                '11': 505.0,
                '12': 641.6,
                '14': 559.112447,
                '16': 599.8141194,
                '18': 641.6044474,
                '20': 686.6293209,
                '22': 782.7574258,
                '24': 1739.46,
                '26': 3478.92,
                '28': 3478.92,
                '30': 3478.92,
                '32': 3478.92,
                '34': 3478.92,
                '36': 3478.92
            },
            'Ламинирование (Эпоксидный клей)': 869.7304731,
            'Сборка иных конструкций': 7856.147184,
            'Сверление СМД': 300.0,
            'Вырезы СМД': 1300.0
            }
}
    static ordersInWork = null
    static async getOrdersInWork(){
        const orders = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=state=https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/86ef9098-927f-11ee-0a80-145a003ab7bf&expand=agent&limit=100')
        
        
        const result = []
        orders.rows.forEach( order => {
                const temp = {
                    name: order.name,
                    agent: order.agent.name,
                    date: order.created,
                    deliveryPlannedMoment: order.deliveryPlannedMoment
                }
        })
        console.log(result)
    }

    static async addPositionsToOrder(data) {
        console.time('addPos');
        const indexes = []
        const positionsToCreate = data.positions.filter((el, index) => {
            if(!el.added){
                indexes.push(index)
                return true
            }
        })
        const productsToCreate = positionsToCreate.map(product => {
            return {
                name: product.name,
                salePrices: [
                {
                    value: Number(product.price * 100),
                    priceType: {
                    meta: {
                        href: "https://api.moysklad.ru/api/remap/1.2/context/companysettings/pricetype/61e764a9-2ad0-11ee-0a80-0476000bb1a7",
                        type: "pricetype",
                        mediaType: "application/json",
                    },
                    },
                    currency: {
                    meta: {
                        href: "https://api.moysklad.ru/api/remap/1.2/entity/currency/0664a90c-6e69-11e4-90a2-8ecb0012e9ec",
                        metadataHref: "https://api.moysklad.ru/api/remap/1.2/entity/currency/metadata",
                        type: "currency",
                        mediaType: "application/json",
                        uuidHref:
                        "https://online.moysklad.ru/app/#currency/edit?id=0664a90c-6e69-11e4-90a2-8ecb0012e9ec",
                    },
                    },
                },
                ],
                productFolder: dictionary.productFolders.glassGuard,
                attributes: [
                {
                    meta: dictionary.attributes["Вид номенклатуры"],
                    name: "Вид номенклатуры",
                    value: dictionary.attributesValue["Готовая продукция"],
                },
                {
                    meta: dictionary.attributes["Длина в мм"],
                    name: "Длина в мм",
                    value: String(product.details.initialData.length),
                },
                {
                    meta: dictionary.attributes["Ширина в мм"],
                    name: "Ширина в мм",
                    value: String(product.details.initialData.width),
                },
                {
                    meta: dictionary.attributes["Кол во вырезов 1 категорий/ шт"],
                    name: "Кол во вырезов 1 категорий/ шт",
                    value: String(product.details.initialData.cutsv1),
                },
                {
                    meta: dictionary.attributes["Кол во вырезов 2 категорий/ шт"],
                    name: "Кол во вырезов 2 категорий/ шт",
                    value: String(product.details.initialData.cutsv2),
                },
                {
                    meta: dictionary.attributes["Кол во сверлении/шт"],
                    name: "Кол во сверлении/шт",
                    value: String(product.details.initialData.drills),
                },
                {
                    meta: dictionary.attributes["Кол во зенковании/ шт"],
                    name: "Кол во зенковании/ шт",
                    value: String(product.details.initialData.zenk),
                },
                ],
            }});

        let createdProducts = [];
        if (productsToCreate.length > 0) {
            console.time('create')
            createdProducts = await Client.sklad(
            "https://api.moysklad.ru/api/remap/1.2/entity/product",
            "post",
            productsToCreate
            );
            console.timeEnd('create')
            createdProducts.forEach((el, index) => {
                data.positions[indexes[index]] = {...data.positions[indexes[index]], position: { assortment: el}}
                const pos = data.positions[indexes[index]]
                Details.create({
                    productId: pos.position.assortment.id,
                    initialData: pos.details.initialData,
                    selfcost: pos.details.selfcost
                })
            })
        }
        const params = {
            positions: data.positions.map((pos) => {
                return{
                    assortment: {
                        meta: pos.position.assortment.meta
                    },
                    price: (pos.price || 0) * 100,
                    quantity: pos.quantity || 1,
                }
            }),
        };
        console.time('update order')
        const updateCustomerorderRequest = await Client.sklad(
          `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}`,
          "put",
          params
        );
        console.timeEnd('update order')

        console.timeEnd("addPos");
    }

    static async getOrder(name){
        let order = null
        await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${name}&expand=positions.assortment,agent&limit=100`).then(response => order = response.rows[0]).catch(() => { throw new ApiError(`Не найден заказ покупателя с номером ${name}`); });
        if(!order) throw new ApiError(`Не найден заказ покупателя с номером ${name}`)
        const details = await Details.findAll({
            where: {
                productId: {
                    [Op.in]: order.positions.rows.map(position => position.assortment.id)
                }
            }
        })
        order.positions.rows.forEach( el => {
            const detail = details.find( detail => detail.productId == el.assortment.id)
            detail ? el.details = detail.toJSON() : false
        })
        return order
    }
    static async calcSelfcost(){
        let materials = {}
        const promises = []
        promises.push(Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Матированное%20стекло%20(Matelux);pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Осветленное%20стекло;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Простое%20стекло;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Рифленое%20стекло;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Стекло%20Stopsol%20и%20Зеркало;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Цветное%20стекло"))
        promises.push(Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0%20Закупки/0.02.04%20Пленка%20EVA/Пленка%20EVA%20прозрачная;pathName=0%20Закупки/0.02.04%20Пленка%20EVA/Плёнки%20декоративные%20и%20цветные"))
        const results = await Promise.all(promises)

        for(const result of results){
            for(const material of result.rows){
                materials[material.name] = material.salePrices[0].value / 100
            }
        }
        this.selfcost.materials = materials
    }
}
SkladService.calcSelfcost()
// setInterval(() => {
//     SkladService.calcSelfcost()
// }, 3_600_000);