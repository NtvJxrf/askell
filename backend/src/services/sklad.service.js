import ApiError from "../utils/apiError.js"
import Client from "../utils/got.js"
import Details from "../databases/models/sklad/details.model.js"
import { Op } from 'sequelize'
import logger from "../utils/logger.js"
import Processingprocess from "../databases/models/sklad/processingprocesses.model.js"
import crypto from 'crypto'
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
            console.log(product)
            return {
                name: product.name,
                salePrices: [{
                    value: Number(product.price),
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
                }],
                productFolder: dictionary.productFolders.glassGuard,
                attributes: [{
                    meta: dictionary.productAttributes["Вид номенклатуры"],
                    value: dictionary.attributesValue["Готовая продукция"],
                },{
                    meta: dictionary.productAttributes["Длина в мм"],
                    value: String(product.details.initialData.length),
                },{
                    meta: dictionary.productAttributes["Ширина в мм"],
                    value: String(product.details.initialData.width),
                },{
                    meta: dictionary.productAttributes["Кол во вырезов 1 категорий/ шт"],
                    value: String(product.details.initialData.cutsv1),
                },{
                    meta: dictionary.productAttributes["Кол во вырезов 2 категорий/ шт"],
                    value: String(product.details.initialData.cutsv2),
                },{
                    meta: dictionary.productAttributes["Кол во сверлении/шт"],
                    value: String(product.details.initialData.drills),
                },{
                    meta: dictionary.productAttributes["Кол во зенковании/ шт"],
                    value: String(product.details.initialData.zenk),
                },{
                    meta: dictionary.productAttributes["Материал 1"],
                    value: `${product.details.initialData.material1}`,
                },{
                    meta: dictionary.productAttributes["Материал 2"],
                    value: `${product.details.initialData.material2}`,
                },{
                    meta: dictionary.productAttributes["Материал 3"],
                    value: product.details.initialData.material3 ? `${product.details.initialData.material3}` : '',
                },{
                    meta: dictionary.productAttributes["тип станка обрабатывающий"],
                    value: product.result.other.stanok
                },{
                    meta: dictionary.productAttributes["Тип изделия"],
                    value: product.result.other.type
                },{
                    meta: dictionary.productAttributes["Окрашивание"],
                    value: product.details.initialData.color ? product.details.initialData.color : '',
                },{
                    meta: dictionary.productAttributes["Печать"],
                    value: product.details.initialData.print ? 'Да' : '',
                },{
                    meta: dictionary.productAttributes["Полировка"],
                    value: product.details.initialData.processing ? 'Да' : '',
                }],
            }});

        if (productsToCreate.length > 0) {
            console.time('create')
            const createdProducts = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product", "post", productsToCreate);
            console.timeEnd('create')
            const promises = []
            createdProducts.forEach((el, index) => {
                data.positions[indexes[index]] = {...data.positions[indexes[index]], position: { assortment: el}}
                const pos = data.positions[indexes[index]]
                promises.push(Details.create({
                    productId: pos.position.assortment.id,
                    initialData: pos.details.initialData,
                    selfcost: pos.details.selfcost
                }))
            })
            const detailsResult = await Promise.allSettled(promises)
            detailsResult.forEach((result, i) => {
                if (result.status !== 'fulfilled') {
                    const failedPos = data.positions[indexes[i]];
                    logger.error('Failed to create detail', {
                        productId: failedPos?.position?.assortment?.id,
                        error: result.reason,
                        inputData: failedPos?.details
                    });
                }
            });
        }
        const params = {
            positions: data.positions.map((pos) => {
                return{
                    assortment: {
                        meta: pos.position.assortment.meta
                    },
                    price: (pos.price || 0),
                    quantity: pos.quantity || 1,
                }
            }),
        };
        console.time('update order')
        const updateCustomerorderRequest = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}`, "put", params);
        console.timeEnd('update order')

        console.timeEnd("addPos");
    }

    static async getOrder(name){
        const response = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${name}&expand=positions.assortment,agent&limit=100`)
        const order = response.rows[0]
        if(!order.positions) return order
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
                materials[material.name] = material
            }
        }
        this.selfcost.materials = materials
    }
    static async getProcessingStages(){
        const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingstage')
        dictionary.processingstages = response.rows.reduce(( acc, curr ) => {
            acc[curr.name] = curr.meta
            return acc
        }, {})
    }
    static async getProcuctAttributes(){
        const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes')
        dictionary.productAttributes = response.rows.reduce(( acc, curr ) => {
            acc[curr.name] = curr.meta
            return acc
        }, {})
    }
    static async createProductionTask(id){
        const order = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${id}?expand=positions.assortment&limit=100`)
        if(!order){
            throw new ApiError(`Заказ покупателя с ${id} не найден`)
        }
        const map = {
            'Триплекс': triplex,
            'Керагласс': ceraglass,
            'Стекло': glass,
            'СМД': smd,
        }
        const result = []
        for(const position of order.positions.rows){
            const attributes = position.assortment.attributes.reduce( (acc, curr) => {
                acc[curr.name] = curr
                return acc
            }, {})
            result.push(await map[attributes['Тип изделия'].value](position, attributes, order))
        }
        const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/productiontask', 'post', {
            materialsStore: {
                meta: {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/store/d2ff1943-beaa-11ef-0a80-021900071041",
                    "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/store/metadata",
                    "type" : "store",
                    "mediaType" : "application/json",
                    "uuidHref" : "https://online.moysklad.ru/app/#warehouse/edit?id=d2ff1943-beaa-11ef-0a80-021900071041"
                }
            },
            productsStore: {
                meta: {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/store/7ebd9c32-1ccf-11ef-0a80-0287000b172c",
                    "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/store/metadata",
                    "type" : "store",
                    "mediaType" : "application/json",
                    "uuidHref" : "https://online.moysklad.ru/app/#warehouse/edit?id=7ebd9c32-1ccf-11ef-0a80-0287000b172c"
                }
            },
            organization: {
                meta: order.organization.meta
            },
            productionRows: result.map(el => {
                return el.reduceRight(( acc, curr) => {
                    acc.push({
                        processingPlan: {
                            meta: curr.meta
                        },
                        productionVolume: curr.quantity,
                    })
                    return acc
                }, [])
            }).flat(),
            attributes: [{
                meta: {
                    "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/attributes/d9371a8e-3a81-11ee-0a80-04f7002df766",
                    "type" : "attributemetadata",
                    "mediaType" : "application/json"
                },
                value: order.name
            }]
        })
        console.log('done')
    }
}

const triplex = async (position, attributes, order) => {
    const PFs = [attributes['Материал 1'], attributes['Материал 2'], attributes['Материал 3']]
    const createdPFs = []
    const finalPlans = []
    for(const pf of PFs){
        if(!pf) continue
        
        const processingprocess = await makeprocessingprocess(attributes)
        const product = await makeProduct(attributes, pf.value)
        const processingPlan = await makeProcessingPlan(attributes, pf.value, order, processingprocess, product)
        processingPlan.quantity = position.quantity
        finalPlans.push(processingPlan)
        createdPFs.push(product)
    }
    const finalProcessingprocess = await Processingprocess.findOne({where: {name: 'Триплекс'}})
    const finalProcessingPlan = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingplan', 'post', {
        name: position.assortment.name,
        processingProcess: finalProcessingprocess,
        materials: createdPFs.map( el => {
            return {
                assortment: { meta: el.meta },
                quantity: 1
            }
        }),
        products: [{
            assortment: { meta: position.assortment.meta },
            quantity: 1
        }]
    })
    finalProcessingPlan.quantity = position.quantity
    finalPlans.push(finalProcessingPlan)
    return finalPlans
}
const ceraglass = async () => {

}
const glass = async () => {

}
const smd = async () => {

}
const makeProcessingPlan = async (attributes, material, order, processingprocess, product, isPF = true) => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingplan', 'post', {
        name: `${order.name} ${isPF ? 'ПФ' : ''} ${material}, ${attributes['Длина в мм'].value}х${attributes['Ширина в мм'].value} TTTTTEST`,
        processingProcess: { meta: processingprocess },
        materials: [{
            assortment: {
                meta: SkladService.selfcost.materials[material].meta
            },
            quantity: (attributes['Длина в мм'].value * attributes['Ширина в мм'].value) / 1000000
        }],
        products: [{
            assortment: {
                meta: product.meta,
            },
            quantity: 1
        }]
    })
    return response
}
const makeProduct = async (attributes, material, isPF = true) => {
    return await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', {
        name: `${isPF ? 'ПФ' : ''} ${material}, ${attributes['Длина в мм'].value}х${attributes['Ширина в мм'].value} TTTTTEST`,
        attributes: [{
                    meta: dictionary.attributes["Длина в мм"],
                    name: "Длина в мм",
                    value: String(attributes['Длина в мм'].value),
                },{
                    meta: dictionary.attributes["Ширина в мм"],
                    name: "Ширина в мм",
                    value: String(attributes['Ширина в мм'].value),
                },{
                    meta: dictionary.attributes["Кол во вырезов 1 категорий/ шт"],
                    name: "Кол во вырезов 1 категорий/ шт",
                    value: String(attributes['Кол во вырезов 1 категорий/ шт'].value),
                },{
                    meta: dictionary.attributes["Кол во вырезов 2 категорий/ шт"],
                    name: "Кол во вырезов 2 категорий/ шт",
                    value: String(attributes['Кол во вырезов 2 категорий/ шт'].value),
                },{
                    meta: dictionary.attributes["Кол во сверлении/шт"],
                    name: "Кол во сверлении/шт",
                    value: String(attributes['Кол во сверлении/шт'].value),
                },{
                    meta: dictionary.attributes["Кол во зенковании/ шт"],
                    name: "Кол во зенковании/ шт",
                    value: String(attributes['Кол во зенковании/ шт'].value),
                }],
    })
}
const makeprocessingprocess = async attributes => {
    const stages = ['1. РСК (раскрой)']
    attributes['тип станка обрабатывающий'].value == 'Прямолинейка' ? stages.push('4. ПРЛ (прямолинейная обработка)') : stages.push('3. КРЛ (криволинейная обработка)')
    // attributes['Кол во вырезов 1 категорий/ шт'].value != 0 ? stages.push('8. ВРЗ (вырезы в стекле 1 кат.)') : false
    // attributes['Кол во вырезов 2 категорий/ шт'].value != 0 ? stages.push('9. ВРЗ (вырезы в стекле 2 кат.)') : false
    // attributes['Кол во отверстии/ шт'].value != 0 ? stages.push('7. ОТВ (сверление в стекле отверстий)') : false
    // attributes['Кол во зенковании/ шт'].value != 0 ? stages.push('10. Зенковка') : false
    attributes['Закалка'].value == 'Закалённое' ? stages.push('Закалка') : false
    stages.push('ОТК')
    const normalizedStages = stages.map(s => s.trim().toLowerCase()).sort();
    const hash = getStagesHash(normalizedStages)
    const existing = await Processingprocess.findOne({
        where: {
            hash
        }
    })
    if(existing){
        return existing.meta
    }
    else{
        const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingprocess', 'post', {
            name: String(Date.now()),
            positions: stages.map( el => {
                return {
                    processingstage: {
                        meta: dictionary.processingstages[el]
                    }
                }
            }),
            description: stages.join('\n')
        })
        await Processingprocess.create({
            hash,
            stages: normalizedStages,
            meta: response.meta
        })
        return response.meta
    }
}
function getStagesHash(stages) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stages))
    .digest('hex');
}

await SkladService.calcSelfcost()
await SkladService.getProcessingStages()
await SkladService.getProcuctAttributes()
// setInterval(() => {
//     SkladService.calcSelfcost()
//     SkladService.getProcessingStages()
// }, 3_600_000);