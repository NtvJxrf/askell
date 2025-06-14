import ApiError from "../utils/apiError.js"
import Client from "../utils/got.js"
import Details from "../databases/models/sklad/details.model.js"
import { Op } from 'sequelize'
import logger from "../utils/logger.js"
import Processingprocess from "../databases/models/sklad/processingprocesses.model.js"
import crypto from 'crypto'
import PricesAndCoefs from "../databases/models/sklad/pricesAndCoefs.model.js"
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
    static selfcost = {}
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
                weight: product.result.other.weight,
                volume: product.result.other.S,
                productFolder: dictionary.productFolders.glassGuard,
                attributes: generateProductAttributes({...product.initialData, ...product.result.other}),
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
                    initialData: pos.initialData,
                    selfcost: pos.selfcost,
                    result: pos.result
                }))
            })
            const detailsResult = await Promise.allSettled(promises)
            detailsResult.forEach((result, i) => {
                if (result.status !== 'fulfilled') {
                    const failedPos = data.positions[indexes[i]];
                    logger.error('Failed to create detail', {
                        productId: failedPos?.position?.assortment?.id,
                        error: result.reason,
                        initialData: failedPos?.initialData,
                        selfcost: failedPos?.selfcost 
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
            if(detail){
                el.result = detail.result
                el.initialData = detail.initialData
            }
        })
        return order
    }
    static async createProductionTask(id){
        console.time('creatindProudctionTask')
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
        let selkResult = []
        let vizResult = []
        for(const position of order.positions.rows){
            const data = await Details.findOne({where: {productId: position.assortment.id}})
            const plans = await map[data.result.other.type](data, order, position)
            selkResult = [...selkResult, ...plans.selk]
            vizResult = [...vizResult, ...plans.viz]
        }

        const pzSelk = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/productiontask`, 'post', {
            materialsStore: { meta: dictionary.stores[`Склад Селькоровская материалы/прочее`]},
            productsStore: { meta: dictionary.stores[`Склад Селькоровская ПФ`]},
            organization: { meta: order.organization.meta},
            deliveryPlannedMoment: order.deliveryPlannedMoment,
            owner: { meta: order.owner.meta},
            attributes: [{meta: {
                            "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/attributes/d9371a8e-3a81-11ee-0a80-04f7002df766",
                            "type" : "attributemetadata",
                            "mediaType" : "application/json"
                        },value: order.name}],
            productionRows: selkResult.reduce((acc, curr) => {
                acc.push({  processingPlan: { meta: curr.meta },
                            productionVolume: curr.quantity
                })
                return acc
            }, [])
        })
        if(vizResult.length > 0){
            const pzViz = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/productiontask`, 'post', {
                materialsStore: { meta: dictionary.stores[`Склад ВИЗ ПФ`]},
                productsStore: { meta: dictionary.stores[`Екатеринбург ВИЗ СГИ`]},
                organization: { meta: order.organization.meta},
                deliveryPlannedMoment: order.deliveryPlannedMoment,
                owner: { meta: order.owner.meta},
                attributes: [{meta: {
                            "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/attributes/d9371a8e-3a81-11ee-0a80-04f7002df766",
                            "type" : "attributemetadata",
                            "mediaType" : "application/json"
                        },value: order.name
                    },{meta: {
                            "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/attributes/a389bba7-410a-11f0-0a80-0098000450d3",
                            "type" : "attributemetadata",
                            "mediaType" : "application/json"
                        },value: true}],
                productionRows: vizResult.reduce((acc, curr) => {
                acc.push({  processingPlan: { meta: curr.meta },
                            productionVolume: curr.quantity
                })
                return acc
            }, [])
            })
        }
        console.timeEnd('creatindProudctionTask')
    }
}

const triplex = async (data, order, position) => {

}
const ceraglass = async () => {

}
const glass = async (data, order, position) => {
    const result = {
        viz: [],
        selk: []
    }
    const stagesSelk = ['1. РСК (раскрой)']
    data.result.other.stanok == 'Прямолинейка' ? stagesSelk.push('4. ПРЛ (прямолинейная обработка)') : stagesSelk.push('3. КРЛ (криволинейная обработка)')
    data.initialData.cutsv1 != 0 && stagesSelk.push('8. ВРЗ (вырезы в стекле 1 кат.)')
    data.initialData.cutsv2 != 0 && stagesSelk.push('9. ВРЗ (вырезы в стекле 2 кат.)')
    data.initialData.drills != 0 && stagesSelk.push('7. ОТВ (сверление в стекле отверстий)')
    data.initialData.zenk != 0 && stagesSelk.push('10. Зенковка')
    data.initialData.tempered && stagesSelk.push('Закалка')
    stagesSelk.push('ОТК')
    const isPF = data.result.other.viz
    const processingprocess = await makeprocessingprocess(stagesSelk)
    const product = await makeProduct(data, position.assortment.name, isPF)
    const plan = await makeProcessingPlanGlass(data, position.assortment.name, order, processingprocess, product, isPF, data.initialData.material)
    plan.quantity = position.quantity
    result.selk.push(plan)
    if(isPF){
        const stagesViz = []
        data.initialData.color && stagesSelk.push('Окраска стекла')
        data.initialData.color && stagesSelk.push('УФ (УФ печать)')
        stagesViz.push('ОТК')
        const processingprocessViz = await makeprocessingprocess(stagesViz)
        const materials = [{
            assortment: { meta: product.meta},
            quantity: 1
        }]
        const planViz = await makeProcessingPlanViz(data, position.assortment.name, order, processingprocessViz, position.assortment, false, materials)
        planViz.quantity = position.quantity
        result.viz.push(planViz)
    }
    return result
}
const smd = async () => {

}
const makeProcessingPlanViz = async (data, name, order, processingprocess, product, isPF, materials) => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingplan', 'post', {
        name: `${order.name}, ${isPF ? 'ПФ, ' : ''}${name} TTTTTEST`,
        processingProcess: { meta: processingprocess },
        materials,
        products: [{
            assortment: {
                meta: product.meta,
            },
            quantity: 1
        }]
    })
    return response
}
const makeProcessingPlanGlass = async (data, name, order, processingprocess, product, isPF, material) => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingplan', 'post', {
        name: `${order.name}, ${isPF ? 'ПФ, ' : ''}${name} TTTTTEST`,
        processingProcess: { meta: processingprocess },
        materials: [{
            assortment: {
                meta: SkladService.selfcost.materials[material].meta
            },
            quantity: (data.initialData.width * data.initialData.height) / 1000000
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
const makeProduct = async (data, name, isPF) => {
    return await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', {
        name: `${isPF ? 'ПФ' : ''} ${name} TTTTTEST`,
        attributes: generateProductAttributes(data.initialData)
    })
}
const makeprocessingprocess = async stages => {
    const normalizedStages = stages.map(s => s.trim().toLowerCase()).sort();
    const hash = getStagesHash(normalizedStages)
    const existing = await Processingprocess.findOne({where: { hash } })
    if(existing) return existing.meta
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
const calcSelfcost = async () => {
    let materials = {}
    const promises = []
    promises.push(Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Матированное%20стекло%20(Matelux);pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Осветленное%20стекло;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Простое%20стекло;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Рифленое%20стекло;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Стекло%20Stopsol%20и%20Зеркало;pathName=0%20Закупки/0.02.03%20Стекло/Материал%20от%20поставщиков,%20Стекло/Цветное%20стекло"))
    promises.push(Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0%20Закупки/0.02.04%20Пленка%20EVA/Пленка%20EVA%20прозрачная;pathName=0%20Закупки/0.02.04%20Пленка%20EVA/Плёнки%20декоративные%20и%20цветные"))
    promises.push(Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=0%20Закупки/0.02.02%20Керамика/LAMINAM;pathName=0%20Закупки/0.02.02%20Керамика/ДЕГОН%20Стандарт"))
    const results = await Promise.all(promises)

    for(const result of results){
        for(const material of result.rows){
            materials[material.name] = {
                meta: material.meta,
                name: material.name,
                salePrices: material.salePrices,
            }
        }
    }
    SkladService.selfcost.materials = materials
}
const getProcessingStages = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingstage')
    dictionary.processingstages = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
}
const getStores = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/store')
    dictionary.stores = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
}
const getProcuctAttributes = async () => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes')
    dictionary.productAttributes = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
}
const getUnders = async () => {
    const response = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=Керагласс%20товары%20и%20полуфабрикаты/Подстолья")
    SkladService.selfcost.unders = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = curr.meta
        return acc
    }, {})
}
const getColors = async () => {
    const response = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product?filter=pathName=ТЕСТ/Цвета%20RAL%20(Только%20для%20продажи)")
    SkladService.selfcost.colors = response.rows.reduce(( acc, curr ) => {
        acc[curr.name] = {
            meta: curr.meta,
            salePrices: curr.salePrices
        }
        return acc
    }, {})
}
export const getPicesAndCoefs = async () => {
    const elements = await PricesAndCoefs.findAll()
    SkladService.selfcost.pricesAndCoefs = elements.reduce((acc, curr) => {
        acc[curr.name] = curr.value
        return acc
    }, {})
}
const generateProductAttributes = (data) => {
    const result = []
    for(const attribute in data){
        switch(attribute) {
            case 'height': result.push({ meta: dictionary.productAttributes["Длина в мм"], value: String(data.height) }); break;
            case 'width': result.push({ meta: dictionary.productAttributes["Ширина в мм"], value: String(data.width) }); break;
            case 'cutsv1': result.push({ meta: dictionary.productAttributes["Кол во вырезов 1 категорий/ шт"], value: String(data.cutsv1) }); break;
            case 'cutsv2': result.push({ meta: dictionary.productAttributes["Кол во вырезов 2 категорий/ шт"], value: String(data.cutsv2) }); break;
            case 'drills': result.push({ meta: dictionary.productAttributes["Кол во сверлении/шт"], value: String(data.drills) }); break;
            case 'zenk': result.push({ meta: dictionary.productAttributes["Кол во зенковании/ шт"], value: String(data.zenk) }); break;
            case 'material': result.push({ meta: dictionary.productAttributes["Материал 1"], value: data.material }); break;
            case 'material1': result.push({ meta: dictionary.productAttributes["Материал 1"], value: data.material1 }); break;
            case 'material2': result.push({ meta: dictionary.productAttributes["Материал 2"], value: data.material2 }); break;
            case 'material3': result.push({ meta: dictionary.productAttributes["Материал 3"], value: data.material3 }); break;
            case 'color': result.push({ meta: dictionary.productAttributes["Окрашивание"], value: data.color || '' }); break;
            case 'print': result.push({ meta: dictionary.productAttributes["Печать"], value: data.print ? 'Да' : '' }); break;
            case 'polishing': result.push({ meta: dictionary.productAttributes["Полировка"], value: data.polishing ? 'Да' : '' }); break;
            case 'type': result.push({ meta: dictionary.productAttributes["Тип изделия"], value: data.type }); break;
            case 'stanok': result.push({ meta: dictionary.productAttributes["тип станка обрабатывающий"], value: data.stanok }); break;
            case 'productType': result.push({ meta: dictionary.productAttributes["Вид номенклатуры"], value: dictionary.attributesValue["Готовая продукция"] }); break;
            case 'tempered': result.push({ meta: dictionary.productAttributes["Закалка"], value: data.tempered ? 'Да' : '' }); break;
        }
    }
    return result
}
getPicesAndCoefs()
calcSelfcost()
getProcessingStages()
getProcuctAttributes()
getUnders()
getColors()
getStores()
// setInterval(() => {
//     SkladService.calcSelfcost()
//     SkladService.getProcessingStages()
// }, 3_600_000);