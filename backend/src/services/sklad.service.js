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
            },
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

    static async addPositionsToOrder(data){
        console.time('addPos')
        let order = null
        await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${data.orderName}&expand=positions&limit=100`).then(response => order = response.rows[0]).catch(() => { throw new ApiError(`Не найден заказ покупателя с номером ${data.orderName}`); });
        const createdProducts = {}
        const products = data.positions.map(product => {
            createdProducts[product.name] = {
                initialData: product.initialData,
                selfcost: product.selfcost,
                quantity: product.quantity
            }
            return {
                name: product.name,
                productFolder: dictionary.productFolders.glassGuard,
                attributes: [
                    {   
                        meta: dictionary.attributes['Вид номенклатуры'],
                        name: 'Вид номенклатуры',
                        value: dictionary.attributesValue['Готовая продукция']
                    }
                ]

            }
        })
        const createProductsRequest = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', products)
        for(const product of createProductsRequest){
            await Details.create({
                productId: product.id,
                selfcost: createdProducts[product.name].selfcost,
                initialData: createdProducts[product.name].initialData
            })
        }
        const params = {
            positions: createProductsRequest.map(product => {
                return {
                    quantity: createdProducts[product.name].quantity,
                    //price: createdProducts[product.name].price,
                    assortment: {
                        meta: product.meta
                    }
                }
            }).concat(order.positions.rows.map(product => {
                return {
                    quantity: product.quantity,
                    assortment: product.assortment,
                    price: product.price,
                    reserve: product.reserve,
                }
            }))
        }
        const updateCustomerorderRequest = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${order.id}`, 'put', params)
        // console.log(updateCustomerorderRequest)
        await this.getOrder(6446)
        console.timeEnd('addPos')
    }
    static async getOrder(name){
        let order = null
        await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${name}&expand=positions.assortment&limit=100`).then(response => order = response.rows[0]).catch(() => { throw new ApiError(`Не найден заказ покупателя с номером ${name}`); });
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