import ApiError from "../utils/apiError.js"
import Client from "../utils/got.js"
import Details from "../databases/models/sklad/details.model.js"
import { Op } from 'sequelize'
import logger from "../utils/logger.js"
import Processingprocess from "../databases/models/sklad/processingprocesses.model.js"
import amqp from 'amqplib';
import crypto from 'crypto'
export const dictionary = {
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
        pricesAndCoefs: {}
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
    }

    static async addPositionsToOrder(data) {
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
                    value: product.price * 100,
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
                vat: data.order.organization.name === 'ООО "А2"' ? 20 : 0,
                vatEnabled: true,
                weight: product.result.other.weight,
                volume: product.result.other.S,
                productFolder: dictionary.productFolders.glassGuard,
                attributes: generateProductAttributes({...product.initialData, ...product.result.other}),
        }});
        if (productsToCreate.length > 0) {
            const createdProducts = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product", "post", productsToCreate)
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
                    price: (pos.price * 100|| 0),
                    quantity: pos.quantity || 1,
                    vat: data.order.organization.name === 'ООО "А2"' ? 20 : 0
                }
            }),
        }
        const updateCustomerorderRequest = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}`, "put", params);
    }

    static async getOrder(name){
        const response = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${name}&expand=positions.assortment,agent,organization&limit=100`)
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
}

const triplex = async (data, order, position, createdEntitys) => {
    const result = {
        viz: [],
        selk: []
    }
    const pfs = []
    const materials = Object.entries(data.initialData).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);

    const stagesSelk = ['1. РСК (раскрой)']
        data.result.other.stanok == 'Прямолинейка' ? stagesSelk.push('4. ПРЛ (прямолинейная обработка)') : stagesSelk.push('3. КРЛ (криволинейная обработка)')
        data.initialData.cutsv1 && stagesSelk.push('8. ВРЗ (вырезы в стекле 1 кат.)')
        data.initialData.cutsv2 && stagesSelk.push('9. ВРЗ (вырезы в стекле 2 кат.)')
        data.initialData.drills && stagesSelk.push('7. ОТВ (сверление в стекле отверстий)')
        data.initialData.zenk && stagesSelk.push('10. Зенковка')
        data.initialData.tempered && stagesSelk.push('Закалка')
        stagesSelk.push('ОТК')


    for(const material of materials){
        const promises = []
        promises.push(makeprocessingprocess(stagesSelk))
        promises.push(makeProduct(data, material, true, createdEntitys))
        const responses = await Promise.all(promises)
        const processingprocess = responses[0]
        const product = responses[1]
        const plan = await makeProcessingPlanGlass(data, position.assortment.name, order, processingprocess, product, true, material, createdEntitys)
        plan.quantity = position.quantity
        result.selk.push(plan)
        pfs.push(product)
    }

    

    const stagesViz = []
        data.initialData.color && stagesSelk.push('УФ (УФ печать)')
        stagesViz.push('5. ТРПЛ')
        stagesViz.push('ОТК')


    const processingprocessViz = await makeprocessingprocess(stagesViz)
    const materialsViz = pfs.map(pf => {
        return {
            assortment: { meta: pf.meta},
            quantity: 1
        }
    })
    const tapes = data.result.materials.filter(material => material.name.toLowerCase().includes('пленка'))
    for(const tape of tapes){
        materialsViz.push({
            assortment: { meta: SkladService.selfcost.materials[tape.name].meta},
            quantity: tape.count
        })
    }
    const planViz = await makeProcessingPlanViz(data, position.assortment.name, order, processingprocessViz, position.assortment, false, materialsViz, createdEntitys)
    planViz.quantity = position.quantity
    result.viz.push(planViz)
    return result
}
const ceraglass = async () => {

}
const glass = async (data, order, position, createdEntitys) => {
    const result = {
        viz: [],
        selk: []
    }
    const stagesSelk = ['1. РСК (раскрой)']
    data.result.other.stanok == 'Прямолинейка' ? stagesSelk.push('4. ПРЛ (прямолинейная обработка)') : stagesSelk.push('3. КРЛ (криволинейная обработка)')
    data.initialData.cutsv1 && stagesSelk.push('8. ВРЗ (вырезы в стекле 1 кат.)')
    data.initialData.cutsv2 && stagesSelk.push('9. ВРЗ (вырезы в стекле 2 кат.)')
    data.initialData.drills && stagesSelk.push('7. ОТВ (сверление в стекле отверстий)')
    data.initialData.zenk && stagesSelk.push('10. Зенковка')
    data.initialData.tempered && stagesSelk.push('Закалка')
    stagesSelk.push('ОТК')
    const isPF = data.result.other.viz
    const promises = []
    promises.push(makeprocessingprocess(stagesSelk))
    promises.push(makeProduct(data, position.assortment.name, isPF, createdEntitys))
    const responses = await Promise.all(promises)
    const processingprocess = responses[0]
    const product = responses[1]
    const plan = await makeProcessingPlanGlass(data, position.assortment.name, order, processingprocess, product, isPF, data.initialData.material, createdEntitys)
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
        const planViz = await makeProcessingPlanViz(data, position.assortment.name, order, processingprocessViz, position.assortment, false, materials, createdEntitys)
        planViz.quantity = position.quantity
        result.viz.push(planViz)
    }
    return result
}
const smd = async (data, order, position, createdEntitys) => {
    if(!data){
        const productionRows = [{
                    processingPlan: {
                        meta: dictionary.smdPlans[position.assortment.name].meta
                    },
                    productionVolume: position.quantity
                }]
        const pzViz = await makeProductionTask(`Склад ВИЗ ПФ`, `Екатеринбург ВИЗ СГИ`, productionRows, order, true)
        return
    }
    
}
export const createProductionTask = async (id) =>{
        console.time('creatingProudctionTask')
        const order = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${id}?expand=positions.assortment,invoicesOut&limit=100`)
        if(!order)
            throw new ApiError(`Заказ покупателя с ${id} не найден`)
        const map = {
            'Триплекс': triplex,
            'Керагласс': ceraglass,
            'Стекло': glass,
            'СМД': smd,
        }
        const createdEntitys = { task: [], plan: [], product: [] }
        let selkResult = []
        let vizResult = []
        const results = []
        try{
            for(const position of order.positions.rows){
                if(position.assortment.pathName.toLowerCase().includes('смд')){
                    await map['СМД'](null, order, position, createdEntitys)
                    continue
                }
                const data = await Details.findOne({where: {productId: position.assortment.id}})
                if(data) results.push(await map[data.result.other.type](data, order, position, createdEntitys))
            }
            if(results.length < 1) return
            results.forEach( el => {
                el.selk && (selkResult = selkResult.concat(el.selk))
                el.viz && (vizResult = vizResult.concat(el.viz))
            })
            const productionRows = selkResult.reduce((acc, curr) => {
                    acc.push({  processingPlan: { meta: curr.meta },
                                productionVolume: curr.quantity
                    })
                    return acc
                }, [])
            const pzSelk = await makeProductionTask(`Склад Селькоровская материалы/прочее`, `Склад Селькоровская ПФ`, productionRows, order, false, createdEntitys)
            if(vizResult.length > 0){
                const productionRows = vizResult.reduce((acc, curr) => {
                    acc.push({  processingPlan: { meta: curr.meta },
                                productionVolume: curr.quantity
                        })
                        return acc
                    }, [])
                const pzViz = await makeProductionTask(`Склад ВИЗ ПФ`, `Екатеринбург ВИЗ СГИ`, productionRows, order, true, createdEntitys)
            }
            console.timeEnd('creatingProudctionTask')
        }catch(error){
            logger.error('Ошибка во время создания произодственного задания', {stack: error.stack})
            for(const entity in createdEntitys){
                switch(entity){
                    case 'task':
                        if(createdEntitys[entity].length > 0)
                        await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/productiontask/delete', 'post', createdEntitys[entity].map(el => {return {meta: el.meta}}))
                        break
                    case 'plan':
                        if(createdEntitys[entity].length > 0)
                        await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingplan/delete', 'post', createdEntitys[entity].map(el => {return {meta: el.meta}}))
                        break
                    case 'product':
                        if(createdEntitys[entity].length > 0)
                        await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product/delete', 'post', createdEntitys[entity].map(el => {return {meta: el.meta}}))
                        break
                }
            }
            const task = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/task', 'post', {
                assignee: {
                    meta: order.owner.meta,
                },
                operation: {
                    meta: order.meta
                },
                description: `Ошибка во время создания производственного задания ${order.name}`
            })
        }
        
    }
const makeProductionTask = async (materialsStore, productsStore, productionRows, order, viz, createdEntitys) => {
    const task = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/productiontask`, 'post', {
                materialsStore: { meta: dictionary.stores[materialsStore]},
                productsStore: { meta: dictionary.stores[productsStore]},
                organization: { meta: order.organization.meta},
                deliveryPlannedMoment: order.deliveryPlannedMoment,
                owner: { meta: order.owner.meta},
                attributes: generateProductionTaskAttributes(order, viz),
                productionRows
            })
    createdEntitys.task.push(task)
    return task
}   
const makeProcessingPlanViz = async (data, name, order, processingprocess, product, isPF, materials, createdEntitys) => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingplan', 'post', {
        name: `${order.name}, ${isPF ? 'ПФ, ' : ''}${name}`,
        processingProcess: { meta: processingprocess },
        materials,
        products: [{
            assortment: {
                meta: product.meta,
            },
            quantity: 1
        }]
    })
    createdEntitys.plan.push(response)
    return response
}
const makeProcessingPlanGlass = async (data, name, order, processingprocess, product, isPF, material, createdEntitys) => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingplan', 'post', {
        name: `${order.name}, ${isPF ? 'ПФ, ' : ''}${name}`,
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
    createdEntitys.plan.push(response)
    return response
}
const makeProduct = async (data, name, isPF, createdEntitys) => {
    const product = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', {
        name: `${isPF ? 'ПФ' : ''} ${name}`,
        attributes: generateProductAttributes(data.initialData)
    })
    createdEntitys.product.push(product)
    return product
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
            case 'smdType': result.push({ meta: dictionary.productAttributes["Тип СМД"], value: data.smdType }); break;
        }
    }
    return result
}
const generateProductionTaskAttributes = (order, viz) => {
    const result = []
        order.invoicesOut && result.push({ meta: dictionary.productiontaskAttributes["№ Счета"], value: order.invoicesOut.map(el => el.name).join(';') })
        result.push({ meta: dictionary.productiontaskAttributes["№ заказа покупателя"], value: order.name })
        viz && result.push({ meta: dictionary.productiontaskAttributes["Задание для ВИЗа"], value: viz }) 
        
    return result
}
async function startWorker() {
    const conn = await amqp.connect('amqp://admin:%5EjZG1L%2Fi@localhost');
    const channel = await conn.createChannel();
    const QUEUE_NAME = 'pzwebhook';
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1);

    console.log(`[*] Ожидание задач в очереди "${QUEUE_NAME}"`);

    channel.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
            const id = msg.content.toString()
            try {
                await createProductionTask(id)
                channel.ack(msg);
            } catch (error) {
                logger.error(`Ошибка при создании производственного задания с id ${id}`, {error: error?.message || error});
                console.error(error)
                channel.reject(msg, false)
            }
        }
    }, { noAck: false });
}

startWorker()