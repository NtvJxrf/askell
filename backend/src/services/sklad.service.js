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
        const result = await Details.findAll()
        console.log(result)
        await this.getOrder(6446)
        console.timeEnd('addPos')
    }
    static async getOrder(name){
        let order = null
        await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${name}&expand=positions.assortment&limit=100`).then(response => order = response.rows[0]).catch(() => { throw new ApiError(`Не найден заказ покупателя с номером ${name}`); });
        console.log(order)
        const details = await Details.findAll({
            where: {
                productId: {
                    [Op.in]: order.positions.rows.map(position => position.assortment.id)
                }
            }
        });
        console.log(details)
    }
}

const constructProductName = (product) => {
    return 'superstrongsteklo'
}