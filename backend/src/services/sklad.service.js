import ApiError from "../utils/apiError.js"
import Client from "../utils/got.js"
import Details from "../databases/models/sklad/details.model.js"
import getOrdersInWork from "../utils/getOrdersInWork.js"
import { Op } from 'sequelize'
import logger from "../utils/logger.js"
import Processingprocess from "../databases/models/sklad/processingprocesses.model.js"
import amqp from 'amqplib';
import crypto from 'crypto'
import {generateSmdMaterials} from '../utils/generateSmdMaterials.js'
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
    static ordersInWork = {}
    static async addPositionsToOrder(data) {
        const indexes = []
        const prevPositions = Array.isArray(data?.order?.positions?.rows)
            ? data.order.positions.rows.map(el => ({
                id: el.assortment?.id,
                meta: el.assortment?.meta
            }))
            : [];
        const positions = Array.isArray(data?.positions) ? data.positions : [];
        const map = positions.reduce((acc, curr) => {
            if (curr?.key != null) {
            acc[String(curr.key)] = true;
            }
            return acc;
        }, {});
        const positionsToCreate = data.positions.filter((el, index) => {
            if(!el.added){
                indexes.push(index)
                return true
            }
        })
        const deletedPositions = prevPositions.filter(el => !map[el.id])
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
                owner: { meta: data.order.owner.meta},
        }});
        let createdProducts = null
        if (productsToCreate.length > 0) {
            createdProducts = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product", "post", productsToCreate)
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
        try{
            const params = {
                positions: data.positions.map((pos) => {
                    return{
                        assortment: {
                            meta: pos.position.assortment.meta
                        },
                        price: Number((pos.price * 100).toFixed(2)),
                        quantity: pos.quantity,
                        vat: data.order.organization.name === 'ООО "А2"' ? 20 : 0
                    }
                }),
            }
            const updateCustomerorderRequest = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}`, "put", params);
        }catch(error){
            logger.error(error, `Ошибка во время добавления позиций в заказ ${data.order.name}`)
            createdProducts && Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/product/delete`, "post", createdProducts.map(el => {return {meta: el.meta}}));
        }finally{
            deleteEntitys(deletedPositions)
        }
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
    data.initialData.print && (result.print = true)
    data.initialData.color && (result.color = data.initialData.color)
    result.triplex = true
    const pfs = []
    const materials = Object.entries(data.initialData).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);

    const stagesSelk = generateStages(data, 'selk')


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

    const stagesViz = generateStages(data, 'viz')

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
const ceraglass = async (data, order, position, createdEntitys) => {
    const result = {
        viz: [],
        selk: []
    }
    data.initialData.color && (result.color = data.initialData.color)
    result.ceraglass = true
    const pfs = []
    const materials = [data.initialData.material1, data.initialData.material2]
    const heights = data.result.other.heights
    const widths = data.result.other.widths
    const stagesSelk = generateStages(data, 'selk')
    const stagesViz = generateStages(data, 'vizCera')
    const { polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, color, print } = data.initialData
    for(const material of materials){
        if(material.toLowerCase().includes('стекло')){
            for(let i = 0; i < heights.length; i++){
                const promises = []
                promises.push(makeprocessingprocess(stagesSelk))
                const product = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', {
                    name: `${'ПФ'} ${material} (${heights[i]}х${widths[i]}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''})`,
                    attributes: generateProductAttributes({...data.initialData, ...data.result.other, height: heights[i], width: widths[i]})
                })
                const responses = await Promise.all(promises)
                const processingprocess = responses[0]
                createdEntitys.product.push(product)
                const plan = await makeProcessingPlanGlass({initialData: {height: heights[i], width: widths[i]}}, position.assortment.name, order, processingprocess, product, true, material, createdEntitys)
                plan.quantity = position.quantity
                result.selk.push(plan)
                pfs.push(product)
            }
            continue
        }
        for(let i = 0; i < heights.length; i++){
            const promises = []
            promises.push(makeprocessingprocess(stagesViz))
            const product = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', {
                name: `${'ПФ'} ${material} (${heights[i]}х${widths[i]}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''})`,
                attributes: generateProductAttributes({...data.initialData, ...data.result.other, height: heights[i], width: widths[i]})
            })
            const responses = await Promise.all(promises)
            const processingprocess = responses[0]
            createdEntitys.product.push(product)
            const plan = await makeProcessingPlanGlass({initialData: {height: heights[i], width: widths[i]}, ceraTrim: data.result.other.ceraTrim }, position.assortment.name, order, processingprocess, product, true, material, createdEntitys)
            plan.quantity = position.quantity
            result.viz.push(plan)
            pfs.push(product)
        }
    }
    const materialsViz = pfs.map(pf => {
        return {
            assortment: { meta: pf.meta},
            quantity: 1
        }
    })
    data.initialData.blank && materialsViz.push({
        assortment: { meta: SkladService.selfcost.materials['Пятак капролон черный D32 H11 М8'].meta},
        quantity: data.initialData.blank
    })
    materialsViz.push({
        assortment: { meta: SkladService.selfcost.materials['Клей кераглас'].meta},
        quantity: data.result.materials.find(el => el.name == 'Клей кераглас').count
    })
    const processingprocessViz = await makeprocessingprocess(['ОТК'])
    const planViz = await makeProcessingPlanViz(data, position.assortment.name, order, processingprocessViz, position.assortment, false, materialsViz, createdEntitys)
    planViz.quantity = position.quantity
    result.viz.push(planViz)
    return result
}
const glass = async (data, order, position, createdEntitys) => {
    const result = {
        viz: [],
        selk: []
    }
    data.initialData.print && (result.print = true)
    data.initialData.color && (result.color = data.initialData.color)
    const stagesSelk = generateStages(data, 'selk')
    const isPF = data.result.other.viz
    const processingprocess = await makeprocessingprocess(stagesSelk)
    let product = null
    if(isPF) product = await makeProduct(data, data.initialData.material, isPF, createdEntitys)
    else product = position.assortment
    const plan = await makeProcessingPlanGlass(data, position.assortment.name, order, processingprocess, product, isPF, data.initialData.material, createdEntitys)
    plan.quantity = position.quantity
    result.selk.push(plan)
    if(isPF){
        const stagesViz = generateStages(data, 'viz')
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
        const print = position.assortment.name.toLowerCase().includes('уф печать')
        const attributes = position?.assortment?.attributes.reduce((acc, curr) => {
            acc[curr.name] = acc.value
            return acc
        }, {})
        const pzViz = await makeProductionTask(`Склад ВИЗ ПФ`, `Екатеринбург ВИЗ СГИ`, productionRows, order, {viz: true, smd: true, print, height: attributes['Длина в мм'], width: attributes['Ширина в мм'], colors: [attributes['Цвет доски'].name]}, createdEntitys)
        return
    }
    const result = {
        viz: [],
        selk: []
    }
    const print = data.initialData.print
    const color = data.initialData.color
    print && (result.print = true)
    color && (result.color = data.initialData.color)
    const stagesSelk = generateStages(data, 'selk')
    const promises = []
    promises.push(makeprocessingprocess(stagesSelk))
    promises.push(makeProduct(data, data.initialData.material, true, createdEntitys))
    const responses = await Promise.all(promises)
    const processingprocess = responses[0]
    const product = responses[1]
    const plan = await makeProcessingPlanGlass(data, 'Доска стеклянная магнитно-маркерная ASKELL Size', order, processingprocess, product, true, data.initialData.material, createdEntitys)
    plan.quantity = position.quantity
    result.selk.push(plan)


    let processingprocessViz = {
        "href" : "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/43072ea8-17cf-11ef-0a80-178100023cbc",
        "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/metadata",
        "type" : "processingprocess",
        "mediaType" : "application/json",
        "uuidHref" : "https://online.moysklad.ru/app/#processingprocess/edit?id=43072ea8-17cf-11ef-0a80-178100023cbc"
    }
    const planViz = await makeProcessingPlanVizSmd(data, 'Доска стеклянная магнитно-маркерная ASKELL Size', order, processingprocessViz, position.assortment, color, product.meta, createdEntitys)
    const productionRows = [{
                    processingPlan: {
                        meta: planViz.meta
                    },
                    productionVolume: position.quantity
                }]
    const pzViz = await makeProductionTask(`Склад ВИЗ ПФ`, `Екатеринбург ВИЗ СГИ`, productionRows, order, {viz: true, smd: true, print, height: data.initialData.height, width: data.initialData.width, colors: [color]}, createdEntitys)
    return result
}
const glassPacket = async (data, order, position, createdEntitys) => {

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
        'Стеклопакет': glassPacket
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
        let print = false
        let triplex = false
        let ceraglass = false
        let colors = []
        results.forEach( el => {
            el.selk && (selkResult = selkResult.concat(el.selk))
            el.viz && (vizResult = vizResult.concat(el.viz))
            el.print && (print = true)
            el.triplex && (triplex = true)
            el.ceraglass && (ceraglass = true)
            el.color && (colors.push(el.color))
        })
        const productionRows = selkResult.reduce((acc, curr) => {
                acc.push({  processingPlan: { meta: curr.meta },
                            productionVolume: curr.quantity
                })
                return acc
            }, [])
        const pzSelk = await makeProductionTask(`Склад Селькоровская материалы/прочее`, `Склад Селькоровская ПФ`, productionRows, order, {}, createdEntitys)
        if(vizResult.length > 0){
            const productionRows = vizResult.reduce((acc, curr) => {
                acc.push({  processingPlan: { meta: curr.meta },
                            productionVolume: curr.quantity
                    })
                    return acc
                }, [])
            const pzViz = await makeProductionTask(`Склад ВИЗ ПФ`, `Екатеринбург ВИЗ СГИ`, productionRows, order, {viz: true, smd: false, print, triplex, colors, ceraglass}, createdEntitys)
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
        await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${order.id}`, 'put', {
            state: { meta: {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/6a37967b-5899-11f0-0a80-1bc9000373a3",
                "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata",
                "type" : "state",
                "mediaType" : "application/json"
            }}
        })
    }
    
}
const makeProductionTask = async (materialsStore, productsStore, productionRows, order, checkboxes, createdEntitys) => {
    const task = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/productiontask`, 'post', {
                materialsStore: { meta: dictionary.stores[materialsStore]},
                productsStore: { meta: dictionary.stores[productsStore]},
                organization: { meta: order.organization.meta},
                deliveryPlannedMoment: order.deliveryPlannedMoment,
                owner: { meta: order.owner.meta},
                attributes: generateProductionTaskAttributes(order, checkboxes),
                productionRows,
                reserve: true
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
    // const multi = data.ceraTrim ? data.ceraTrim : SkladService.selfcost.pricesAndCoefs['Коэффициент обрези стекло']
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingplan', 'post', {
        name: `${order.name}, ${isPF ? 'ПФ, ' : ''}${name}`,
        processingProcess: { meta: processingprocess },
        materials: [{
            assortment: {
                meta: SkladService.selfcost.materials[material].meta
            },
            quantity: (data.initialData.width * data.initialData.height) / 1000000 * (data.ceraTrim ? data.ceraTrim : 0.1)
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
    const { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, color, print } = data.initialData
    const product = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', {
        name: `${isPF ? 'ПФ' : ''} ${name} (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''})`,
        attributes: generateProductAttributes({...data.initialData, ...data.result.other, isPF})
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
            case 'cutsv3': result.push({ meta: dictionary.productAttributes["Кол во вырезов 3 категорий/ шт"], value: String(data.cutsv3) }); break;
            case 'drills': result.push({ meta: dictionary.productAttributes["Кол во сверлении/шт"], value: String(data.drills) }); break;
            case 'zenk': result.push({ meta: dictionary.productAttributes["Кол во зенковании/ шт"], value: String(data.zenk) }); break;
            case 'material': result.push({ meta: dictionary.productAttributes["Материал 1"], value: data.material }); break;
            case 'materials': result.push({ meta: dictionary.productAttributes["Кол- во полуфабрикатов"], value: data.materials.length }); break;
            case 'material1': result.push({ meta: dictionary.productAttributes["Материал 1"], value: data.material1 }); break;
            case 'material2': result.push({ meta: dictionary.productAttributes["Материал 2"], value: data.material2 }); break;
            case 'material3': result.push({ meta: dictionary.productAttributes["Материал 3"], value: data.material3 }); break;
            case 'material4': result.push({ meta: dictionary.productAttributes["Материал 4"], value: data.material4 }); break;
            case 'color': result.push({ meta: dictionary.productAttributes["Окрашивание"], value: data.color || '' }); break;
            case 'print': result.push({ meta: dictionary.productAttributes["Печать"], value: data.print ? 'Да' : '' }); break;
            case 'polishing': result.push({ meta: dictionary.productAttributes["Полировка"], value: data.polishing ? 'Да' : '' }); break;
            case 'type': result.push({ meta: dictionary.productAttributes["Тип изделия"], value: data.type }); break;
            case 'stanok': result.push({ meta: dictionary.productAttributes["тип станка обрабатывающий"], value: data.stanok }); break;
            case 'productType': result.push({ meta: dictionary.productAttributes["Вид номенклатуры"], value: dictionary.attributesValue["Готовая продукция"] }); break;
            case 'tempered': result.push({ meta: dictionary.productAttributes["Закалка"], value: data.tempered ? 'Да' : '' }); break;
            case 'smdType': result.push({ meta: dictionary.productAttributes["Тип СМД"], value: data.smdType }); break;
            case 'isPF': result.push({ meta: dictionary.productAttributes["Это полуфабрикат"], value: true }); break;
        }
    }
    return result
}
const generateProductionTaskAttributes = (order, checkboxes) => {
    const result = []
    const {viz, smd, print, triplex, colors, ceraglass, height, width} = checkboxes

    result.push({ meta: dictionary.productiontaskAttributes["№ заказа покупателя"], value: order.name })
    order.invoicesOut && result.push({ meta: dictionary.productiontaskAttributes["№ Счета"], value: order.invoicesOut.map(el => el.name).join(';') })
    viz && result.push({ meta: dictionary.productiontaskAttributes["Задание для ВИЗа"], value: true }) 
    smd && result.push({ meta: dictionary.productiontaskAttributes["СМД"], value: true }) 
    print && result.push({ meta: dictionary.productiontaskAttributes["Есть УФ печать"], value: true })
    triplex && result.push({ meta: dictionary.productiontaskAttributes["Триплекс"], value: true })
    ceraglass && result.push({ meta: dictionary.productiontaskAttributes["Керагласс"], value: true })
    height && result.push({ meta: dictionary.productiontaskAttributes["Высота"], value: height })
    width && result.push({ meta: dictionary.productiontaskAttributes["Ширина"], value: width })
    if (colors?.length > 0) {
        result.push({ meta: dictionary.productiontaskAttributes["Окрашивание"], value: true });
        result.push({ meta: dictionary.productiontaskAttributes["Цвет"], value: [...new Set(colors)].join(';')
    });
    }
    return result
}
const makeProcessingPlanVizSmd = async (data, name, order, processingprocess, product, color, materialMeta, createdEntitys) => {
    const response = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/processingplan', 'post', {
        name: `${order.name}, ${name}`,
        processingProcess: { meta: processingprocess },
        materials: generateSmdMaterials(data, color, materialMeta),
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
const deleteEntitys = async (deletedPositions) => {
    try{
        if(deletedPositions.length > 0){
            const records = await Details.findAll({
                where: {
                    productId: {
                        [Op.in]: deletedPositions.map(el => el.id)
                    }
                }
            })
            const recordsToDelete = deletedPositions.filter(el => records.find(rec => rec.productId == el.id))
            Details.destroy({
                where: {
                    productId: {
                        [Op.in]: recordsToDelete.map(el => el.id)
                    }
                }
            });
            Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/product/delete`, "post", recordsToDelete.map(el => {return {meta: el.meta}})).catch(err => {console.error("Ошибка при удалении", err)});
        }
    }catch{
    }
}
const generateStages = (data, place) => {
    if(place == 'selk'){
        const stagesSelk = ['1. РСК (раскрой)']
        data.result.other.stanok == 'Прямолинейка' ? stagesSelk.push('4. ПРЛ (прямолинейная обработка)') : stagesSelk.push('3. КРЛ (криволинейная обработка)')
        data.initialData.cutsv1 && stagesSelk.push('8. ВРЗ (вырезы в стекле 1 кат.)')
        data.initialData.cutsv2 && stagesSelk.push('9. ВРЗ (вырезы в стекле 2 кат.)')
        data.initialData.drills && stagesSelk.push('7. ОТВ (сверление в стекле отверстий)')
        data.initialData.zenk && stagesSelk.push('10. Зенковка')
        data.initialData.tempered && stagesSelk.push('Закалка')
        stagesSelk.push('ОТК')
        return stagesSelk;
    }else if(place == 'viz'){
        const stagesViz = []
        data.initialData.color && stagesViz.push('Окраска стекла')
        data.result.other.type == 'Триплекс' && stagesViz.push('5. ТРПЛ')
        data.initialData.print && stagesViz.push('УФ (УФ печать)')
        stagesViz.push('ОТК')
        return stagesViz;
    }
    else if(place == 'vizCera'){
        const stagesViz = []
        stagesViz.push('Раскрой гидрорез Керамики')
        stagesViz.push('ОТК')
        return stagesViz;
    }
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
setInterval(async () => {
    try {
        await getOrdersInWork()
    } catch (err) {
        console.error('getOrdersInWork error:', err)
        logger.error('getOrdersInWork error:', err)
    }
}, 300_000)
startWorker()