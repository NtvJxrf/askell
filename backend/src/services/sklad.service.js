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
import ProcessingPlansSmd from "../databases/models/sklad/processingPlansSmd.js"
import { scanNonPayedOrders } from "./skladScaner.service.js"
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
const mapPrices = {
    gostPrice: 'Выше госта',
    retailPrice: 'Розница',
    bulkPrice: 'Опт',
    dealerPrice: 'Дилер',
    vipPrice: 'ВИП'
}
export default class SkladService {
    static selfcost = {
        pricesAndCoefs: {},
        updates: {}
    }
    static ordersInWork = {}
    static async addPositionsToOrder(data) {
        const indexes = []
        const prevPositions = Array.isArray(data?.order?.positions?.rows) ? data.order.positions.rows.map(el => ({id: el.assortment?.id, meta: el.assortment?.meta})) : [];
        const positions = Array.isArray(data?.positions) ? data.positions : [];
        const map = positions.reduce((acc, curr) => {if (curr?.key != null) acc[String(curr.key)] = true; return acc}, {});
        const positionsToCreate = data.positions.filter((el, index) => {if(!el.added && el.result.other.type){indexes.push(index); return true}});
        const deletedPositions = prevPositions.filter(el => !map[el.id]);
        const productsToCreate = positionsToCreate.map((product, idx) => {
            const isService = Boolean(product?.result?.other?.customerSuppliedGlassForTempering);
            const params = {
                name: product.name,
                shared: false,
                attributes: generateProductAttributes({...product.initialData, ...product.result.other, order: data.order}),
                uom: {
                    meta: {
                        "href" : "https://api.moysklad.ru/api/remap/1.2/entity/uom/19f1edc0-fc42-4001-94cb-c9ec9c62ec10",
                        "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/uom/metadata",
                        "type" : "uom",
                        "mediaType" : "application/json"
                    }
                }
            }
            params.salePrices = Object.entries(product.prices).map(([key, value]) => ({value: Number((value * 100).toFixed(2)), priceType: dictionary.priceTypes[mapPrices[key]], currency: dictionary.currencies['руб']}));
            params.productFolder = dictionary.productFolders.glassGuard;
            params.minPrice = {currency: dictionary.currencies['руб'], value: product?.result?.other?.materialsandworks * 100 || 0};
            switch (product.result.other.type){
                case 'Стекло': params.productFolder = {meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/20ea16d2-80c3-11f0-0a80-001e001e5b2d","metadataHref":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata","type":"productfolder","mediaType":"application/json"}}; break
                case 'Керагласс': params.productFolder = {meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/2c406074-80c3-11f0-0a80-1b2d001e8696","metadataHref":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata","type":"productfolder","mediaType":"application/json"}}; break
                case 'Триплекс': params.productFolder = {meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/26ce840f-80c3-11f0-0a80-1530001f634a","metadataHref":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata","type":"productfolder","mediaType":"application/json"}}; break
                case 'СМД': params.productFolder = {meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/31909ce4-80c3-11f0-0a80-0f23001e1345","metadataHref":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata","type":"productfolder","mediaType":"application/json"}}; break
                case 'Упаковка': params.productFolder = {meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/90bb2da2-88ac-11f0-0a80-09aa000b4e5d","metadataHref":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata","type":"productfolder","mediaType":"application/json"}}; break
                case 'Стеклопакет': break
            }
            if (!isService) {
                params.weight = Number((product.result.other.weight).toFixed(2));
                params.volume = Number((product.result.other.S).toFixed(2));
            } else {
                params.productFolder = {meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/9d51821f-9ce8-11f0-0a80-19d50025c39b","metadataHref":"https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata","type":"productfolder","mediaType":"application/json"}}
            }
            return {params, isService, index: indexes[idx]}
        })
        let createdProducts = null
        if (productsToCreate.length > 0) {
            const toCreateProducts = productsToCreate.filter(p => !p.isService)
            const toCreateServices = productsToCreate.filter(p => p.isService)
            const [createdProductsRes, createdServicesRes] = await Promise.all([
                toCreateProducts.length > 0 ? Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product", "post", toCreateProducts.map(p => p.params)) : [],
                toCreateServices.length > 0 ? Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/service", "post", toCreateServices.map(p => p.params)) : []
            ])
            createdProducts = []
            toCreateProducts.forEach((item, i) => {const created = createdProductsRes[i]; data.positions[item.index] = {...data.positions[item.index], position: {assortment: created}}; createdProducts.push(created)})
            toCreateServices.forEach((item, i) => {const created = createdServicesRes[i]; data.positions[item.index] = {...data.positions[item.index], position: {assortment: created}}; createdProducts.push(created)})
            const promises = []
            createdProducts.forEach((el, i) => {
                const pos = data.positions[productsToCreate[i].index]
                promises.push(Details.create({productId: pos.position.assortment.id, initialData: pos.initialData, selfcost: pos.selfcost, result: pos.result}))
            })
            const detailsResult = await Promise.allSettled(promises)
            detailsResult.forEach((result, i) => {
                if (result.status !== 'fulfilled') {
                    const failedPos = data.positions[productsToCreate[i].index];
                    logger.error('Failed to create detail', {productId: failedPos?.position?.assortment?.id, error: result.reason, initialData: failedPos?.initialData, selfcost: failedPos?.selfcost})
                }
            })
        }
        try {
            const params = {
                positions: data.positions.map((pos) => ({
                    assortment: {meta: pos.position.assortment.meta},
                    price: pos.added ? pos.position.price : Number(pos.prices[data.displayPrice].toFixed(2) * 100),
                    quantity: pos.quantity,
                    vat: data.order.organization.name === 'ООО "А2"' ? 20 : 0
                })),
                attributes: [{
                    meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/99884b94-8f93-11f0-0a80-029a000276da","type":"attributemetadata","mediaType":"application/json"},
                    value: data.planDate.strDays
                }]
            }
            if(data.planDate.apiDate) params.deliveryPlannedMoment = data.planDate.apiDate
            await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}`, "put", params)
        } catch(error) {
            logger.error(error, `Ошибка во время добавления позиций в заказ ${data.order.name}`)
            createdProducts && Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/product/delete`, "post", createdProducts.map(el => ({meta: el.meta})))
        } finally {
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
const records = await ProcessingPlansSmd.findAll();

dictionary.smdPlans = {};

for (const { name, meta } of records) {
    dictionary.smdPlans[name] = { meta };
}
SkladService.selfcost.updates['Техкарты для смд'] = {
    key: 'smdPlans',
    date: Date.now(),
};
console.log(`Загружено ${records.length} техкарт из БД в dictionary`);
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
        promises.push(makeProduct(data, material, createdEntitys, order, 'Стекло'))
        const responses = await Promise.all(promises)
        const processingprocess = responses[0]
        const product = responses[1]
        const plan = await makeProcessingPlan({data, name: position.assortment.name, order, processingprocess, product, isPF: true, material, createdEntitys, mode: 'glass'})
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
    const planViz = await makeProcessingPlan({data, name: position.assortment.name, order, processingprocess: processingprocessViz,
        product: position.assortment, isPF: false, materials: materialsViz, createdEntitys, viz: true})
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
    const { stanok } = data.result.other
    for(const material of materials){
        if(material.toLowerCase().includes('стекло')){
            for(let i = 0; i < heights.length; i++){
                const promises = []
                promises.push(makeprocessingprocess(stagesSelk))
                const attrs = { height: heights[i], width: widths[i], polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, color, print, ifPF: true, order, material, stanok, type: 'Стекло' }
                const product = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', {
                    name: `${'ПФ'} ${material} (${heights[i]}х${widths[i]}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''})`,
                    attributes: generateProductAttributes(attrs),
                    productFolder: {
                        meta: {
                            "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productfolder/7158b3fd-879a-11ef-0a80-0b580038350a",
                            "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata",
                            "type" : "productfolder",
                            "mediaType" : "application/json",
                        }
                    }
                })
                const responses = await Promise.all(promises)
                const processingprocess = responses[0]
                createdEntitys.product.push(product)
                const plan = await makeProcessingPlan({data: {initialData: {height: heights[i], width: widths[i]}}, name: position.assortment.name, order,
                    processingprocess, product, isPF: true, material, createdEntitys, mode: 'glass'})
                plan.quantity = position.quantity
                result.selk.push(plan)
                pfs.push(product)
            }
            continue
        }
        for(let i = 0; i < heights.length; i++){
            const promises = []
            promises.push(makeprocessingprocess(stagesViz))
            const attrs = { height: heights[i], width: widths[i], polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, color, print, ifPF: true, order, material, stanok, type: 'Керамика' }
            const product = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', {
                name: `${'ПФ'} ${material} (${heights[i]}х${widths[i]}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''})`,
                attributes: generateProductAttributes(attrs),
                productFolder: {
                    meta: {
                        "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productfolder/7158b3fd-879a-11ef-0a80-0b580038350a",
                        "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata",
                        "type" : "productfolder",
                        "mediaType" : "application/json",
                    }
                }
            })
            const responses = await Promise.all(promises)
            const processingprocess = responses[0]
            createdEntitys.product.push(product)
            const newData = { ...data, ...{initialData: {height: heights[i], width: widths[i]}, ceraTrim: data.result.other.ceraTrim }}
            const mode = material == 'Керамика клиента' ? 'default' : 'glass'
            const plan = await makeProcessingPlan({data: newData, name: position.assortment.name, order, processingprocess,
                product, isPF: true, material, createdEntitys, mode})
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
    data.result.additions.forEach( el => {
        materialsViz.push({
            assortment: { meta: SkladService.selfcost.materials[el.name].meta},
            quantity: el.count
        })
    })
    const processingprocessViz = await makeprocessingprocess(['ОТК'])
    const planViz = await makeProcessingPlan({data, name: position.assortment.name, order, processingprocess: processingprocessViz, product: position.assortment,
        isPF: false, materials: materialsViz, createdEntitys, viz: true})
    planViz.quantity = position.quantity
    result.viz.push(planViz)
    return result
}
const glass = async (data, order, position, createdEntitys) => {
    const result = {
        viz: [],
        selk: []
    }
    if(data.initialData.customerSuppliedGlassForTempering){
        const stagesSelk = ['Закалка', 'ОТК']
        const processingprocess = await makeprocessingprocess(stagesSelk)
        const product = position.assortment
        const plan = await makeProcessingPlan({name: position.assortment.name, order, processingprocess, product, createdEntitys})
        plan.quantity = position.quantity
        result.selk.push(plan)
        return result
    }
    data.initialData.print && (result.print = true)
    data.initialData.color && (result.color = data.initialData.color)
    const stagesSelk = generateStages(data, 'selk')
    const isPF = data.result.other.viz
    const processingprocess = await makeprocessingprocess(stagesSelk)
    let product = null
    if(isPF) product = await makeProduct(data, data.initialData.material, createdEntitys, order, 'Стекло')
    else product = position.assortment
    const plan = await makeProcessingPlan({data, name: position.assortment.name, order, processingprocess, product, isPF, material: data.initialData.material, createdEntitys, mode: 'glass'})
    plan.quantity = position.quantity
    result.selk.push(plan)
    if(isPF){
        const stagesViz = generateStages(data, 'viz')
        const processingprocessViz = await makeprocessingprocess(stagesViz)
        const materials = [{
            assortment: { meta: product.meta},
            quantity: 1
        }]
        const planViz = await makeProcessingPlan({data, name: position.assortment.name, order, processingprocess: processingprocessViz, product: position.assortment,
            isPF: false, materials, createdEntitys, viz: true})
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
            acc[curr.name] = curr.value
            return acc
        }, {})
        const pzViz = await makeProductionTask(`ВИЗ ПФ`, `ВИЗ СГИ`, productionRows, order, {viz: true, smd: true, print, height: attributes['Длина в мм'], width: attributes['Ширина в мм'], colors: [attributes['Цвет доски']?.name]}, 1, ``, createdEntitys)
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
    promises.push(makeProduct(data, data.initialData.material, createdEntitys, order, 'Стекло'))
    const responses = await Promise.all(promises)
    const processingprocess = responses[0]
    const product = responses[1]
    const plan = await makeProcessingPlan({data, name: 'Доска стеклянная магнитно-маркерная ASKELL Size', order, processingprocess, product, isPF: true, material: data.initialData.material, createdEntitys, mode: 'glass'})
    plan.quantity = position.quantity
    result.selk.push(plan)

    let processingprocessViz = {
        "href" : "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/43072ea8-17cf-11ef-0a80-178100023cbc",
        "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/processingprocess/metadata",
        "type" : "processingprocess",
        "mediaType" : "application/json",
        "uuidHref" : "https://online.moysklad.ru/app/#processingprocess/edit?id=43072ea8-17cf-11ef-0a80-178100023cbc"
    }
    const planViz = await makeProcessingPlan({data, name: 'Доска стеклянная магнитно-маркерная ASKELL Size', order, processingprocess: processingprocessViz,
        product: position.assortment, color, materialMeta: product.meta, createdEntitys, mode: 'smd', viz: true })
    const productionRows = [{
                    processingPlan: {
                        meta: planViz.meta
                    },
                    productionVolume: position.quantity
                }]
    const pzViz = await makeProductionTask(`ВИЗ ПФ`, `ВИЗ СГИ`, productionRows, order, {viz: true, smd: true, print, height: data.initialData.height, width: data.initialData.width, colors: [color]}, 1, ``, createdEntitys)
    return result
}
const glassPacket = async (data, order, position, createdEntitys) => {
    const result = {
        viz: [],
        selk: [],
        polevSP: [],
        polevGlass: []
    }
    const {
        material1, material2, material3, 
        tempered1, tempered2, tempered3,
        polishing1, polishing2, polishing3,
        blunting1, blunting2, blunting3 } = data.initialData
    const materials = [
        [material1, tempered1, polishing1, blunting1],
        [material2, tempered2, polishing2, blunting2],
        [material3, tempered3, polishing3, blunting3]
    ].filter(el => el[0])
    const pfs = []
    for(const material of materials){
        const promises = []
        const stagesRsk = generateStages(material, 'glassPolev')
        promises.push(makeprocessingprocess(stagesRsk))
        promises.push(makeProduct(data, material[0], createdEntitys, order, 'Стекло'))
        const responses = await Promise.all(promises)
        const processingprocess = responses[0]
        const product = responses[1]
        const plan = await makeProcessingPlan({data, name: position.assortment.name, order, processingprocess, product, isPF: true, material: material[0], createdEntitys, mode: 'glass'})
        plan.quantity = position.quantity
        result.polevGlass.push(plan)
        pfs.push(product)
    }

    const stagesSP = generateStages(data, 'SPbuild')
    const processingprocessPolev = await makeprocessingprocess(stagesSP)

    const materialsSP = pfs.map(pf => {
        return {
            assortment: { meta: pf.meta},
            quantity: 1
        }
    })
    const excludedWords = ['стекло', 'зеркало', 'триплекс']
    const filteredMaterials = data.result.materials.filter(el => !excludedWords.some(word => el.name.toLowerCase().includes(word)))
    for(const material of filteredMaterials){
        materialsSP.push({
            assortment: { meta: SkladService.selfcost.materials[material.name].meta},
            quantity: material.count
        })
    }
    const planPolev = await makeProcessingPlan({data, name: position.assortment.name, order, processingprocess: processingprocessPolev,
        product: position.assortment, isPF: false, materials: materialsSP, createdEntitys})
    planPolev.quantity = position.quantity
    result.polevSP.push(planPolev)
    return result
}
const packageBox = async (data, order, position, createdEntitys) => {
    const result = {
        viz: [],
        selk: []
    }
    const stagesSelk = ['Сборка ящика', 'ОТК']
    const processingprocess = await makeprocessingprocess(stagesSelk)
    const product = position.assortment
    const materials = data.result.materials.map(el => {
        return {
            assortment: {meta: SkladService.selfcost.packagingMaterials[el.name].meta},
            quantity: el.count
        }
    })
    const plan = await makeProcessingPlan({name: position.assortment.name, order, processingprocess, product, materials, createdEntitys, mode: 'package'})
    plan.quantity = position.quantity
    result.selk.push(plan)
    return result
}
export const createProductionTask = async (id) =>{
    console.time('creatingProudctionTask')
    const order = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${id}?expand=positions.assortment,invoicesOut,agent,state&limit=100`)
    if(!order)
        throw new ApiError(`Заказ покупателя с ${id} не найден`)
    const debt = await checkOrderDetails(order)
    if(debt) return
    const map = {
        'Триплекс': triplex,
        'Керагласс': ceraglass,
        'Стекло': glass,
        'СМД': smd,
        'Стеклопакет': glassPacket,
        'Упаковка': packageBox
    }
    const createdEntitys = { task: [], plan: [], product: [] }
    let selkResult = []
    let vizResult = []
    let polevResultGlass = []
    let polevResultSp = []
    const results = []
    let addComment = ''
    try{
        for(const position of order.positions.rows){
            const data = await Details.findOne({where: {productId: position.assortment.id}})
            if(data && !data?.result?.other?.customerSuppliedGlassForTempering){
                results.push(await map[data.result.other.type](data, order, position, createdEntitys))
                continue
            }
            const attrs = (position?.assortment?.attributes || []).reduce((a, x) => {
                a[x.name] = x.value;
                return a;
            }, {});
            if(position.assortment.name.toLowerCase().includes('упаковка'))
                addComment += `${position.assortment.name}\n`
            if(!data && (attrs['Тип СМД'] || attrs['Серия'])){
                await map['СМД'](null, order, position, createdEntitys)
            }
        }
        if(results.length < 1) return
        let print = false
        let triplex = false
        let ceraglass = false
        let colors = []
        let nonReserved = 0
        results.forEach( el => {
            el.selk && (selkResult = selkResult.concat(el.selk))
            el.viz && (vizResult = vizResult.concat(el.viz))
            el.polevSP && (polevResultSp = polevResultSp.concat(el.polevSP))
            el.polevGlass && (polevResultGlass = polevResultGlass.concat(el.polevGlass))
            el.print && (print = true)
            el.triplex && (triplex = true)
            el.ceraglass && (ceraglass = true)
            el.color && (colors.push(el.color))
        })
        if(selkResult.length > 0){
            const productionRows = selkResult.reduce((acc, curr) => {
                nonReserved += curr.materials.meta.size
                acc.push({  processingPlan: { meta: curr.meta },
                            productionVolume: curr.quantity
                })
                return acc
            }, [])
            const pzSelk = await makeProductionTask(`Селькоровская материалы/прочее`, `Селькоровская СГИ`, productionRows, order, {}, nonReserved, addComment, createdEntitys)
        }
        if(vizResult.length > 0){
            const productionRows = vizResult.reduce((acc, curr) => {
                acc.push({  processingPlan: { meta: curr.meta },
                            productionVolume: curr.quantity
                    })
                    return acc
                }, [])
            const pzViz = await makeProductionTask(`ВИЗ ПФ`, `ВИЗ СГИ`, productionRows, order, {viz: true, smd: false, print, triplex, colors, ceraglass}, 1, addComment, createdEntitys)
        }
        if(polevResultSp.length > 0){
            const productionRows = polevResultSp.reduce((acc, curr) => {
                acc.push({  processingPlan: { meta: curr.meta },
                            productionVolume: curr.quantity
                    })
                    return acc
                }, [])
            const pzPolev = await makeProductionTask(`Полеводство материалы/прочее`, `Полеводство СГИ`, productionRows, order, {}, 1, addComment, createdEntitys)
        }
        if(polevResultGlass.length > 0){
            const productionRows = polevResultGlass.reduce((acc, curr) => {
                acc.push({  processingPlan: { meta: curr.meta },
                            productionVolume: curr.quantity
                    })
                    return acc
                }, [])
            const pzPolev = await makeProductionTask(`Полеводство материалы/прочее`, `Полеводство СГИ`, productionRows, order, {}, 1, addComment, createdEntitys)
        }
        if(print){
            const task = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/task', 'post', {
                assignee: {
                    meta: {
                        "href" : "https://api.moysklad.ru/api/remap/1.2/entity/employee/167c3a00-f3dc-11ed-0a80-13fb000f16e1",
                        "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/employee/metadata",
                        "type" : "employee",
                        "mediaType" : "application/json",
                        }
                },
                operation: {
                    meta: order.meta
                },
                description: `В заказе №${order.name} есть уф печать`
            })
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
const makeProductionTask = async (materialsStore, productsStore, productionRows, order, checkboxes, nonReserved, addComment, createdEntitys) => {
    const stats = {
        materialsStore: { meta: dictionary.stores[materialsStore]},
        productsStore: { meta: dictionary.stores[productsStore]},
        organization: { meta: order?.organization?.meta},
        attributes: generateProductionTaskAttributes(order, checkboxes),
        productionRows,
        reserve: nonReserved == 0 ? false : true,
        awaiting: true,
        customerOrders: [{
            meta: order.meta
        }],
        description: (order.description || '') + `\n` + addComment,
        state: { meta: {
            "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/states/80ac3d11-6c11-11ef-0a80-0c2300044c17",
            "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata",
            "type" : "state",
            "mediaType" : "application/json"
        }}
    }
    order?.owner?.meta && (stats.owner = { meta: order.owner.meta})
    order?.deliveryPlannedMoment && (stats.deliveryPlannedMoment = order.deliveryPlannedMoment)

    const task = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/productiontask`, 'post', stats)
    createdEntitys.task.push(task)
    return task
}   
const makeProcessingPlan = async ({ data, name, order, processingprocess, product, isPF = false, materials = null, material = null,
    color = null, materialMeta = null, folderId = "f699d4ef-7cdb-11f0-0a80-17360009d500", createdEntitys, mode = "default", viz, //"package", "tempering", "glass", "smd"
}) => {
    let finalMaterials = materials
    if (mode === "glass") {
        finalMaterials = [{
            assortment: { meta: SkladService.selfcost.materials[material].meta },
            quantity: (data.initialData.width * data.initialData.height) / 1000000 * (data.ceraTrim ? data.ceraTrim : 1.1)
        }]
    }
    if (mode === "smd") {
        finalMaterials = generateSmdMaterials(data, color, materialMeta)
        folderId = "92522e19-80c1-11f0-0a80-09fe001efbca"
    }
    if (data?.result?.other?.package && !isPF) {
        const processingProcessPositions = await Client.sklad(`${processingprocess.href}/positions`)
        finalMaterials.push({
            processingProcessPosition: { meta: processingProcessPositions.rows.at(-1).meta },
            assortment: { meta: SkladService.selfcost.packagingMaterials[viz ? `Гофролист Т22 1050х2500 мм` : 'Гофролист Т21 1050х2000 мм'].meta },
            quantity: data.result.other.S * 2
        })
    }
    const response = await Client.sklad( 'https://api.moysklad.ru/api/remap/1.2/entity/processingplan', 'post', {
            name: `${order.name}, ${isPF ? 'ПФ, ' : ''}${name}`,
            processingProcess: { meta: processingprocess },
            ...(finalMaterials ? { materials: finalMaterials } : {}),
            products: [{
                assortment: { meta: product.meta },
                quantity: 1
            }],
            parent: {
                meta: {
                    href: `https://api.moysklad.ru/api/remap/1.2/entity/processingplanfolder/${folderId}`,
                    metadataHref: "https://api.moysklad.ru/api/remap/1.2/entity/processingplanfolder/metadata",
                    type: "processingplanfolder",
                    mediaType: "application/json"
                }
            }
        }
    )
    createdEntitys.plan.push(response)
    return response
}
const makeProduct = async (data, material, createdEntitys, order, type) => {
    const { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, color, print } = data.initialData
    const { stanok } = data.result.other
    const attrs = { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, color, print, ifPF: true, order, material, stanok } 
    if(type) attrs.type = type
    const params = {
        name: `ПФ ${material} (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''}${print ? ', Печать' : ''}${color ? `, ${color}` : ''}, площадь: ${(height * width / 1000000).toFixed(2)})`,
        attributes: generateProductAttributes(attrs),
        volume: Number((data.result.other.S).toFixed(2)),
        uom: {
            meta: {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/uom/19f1edc0-fc42-4001-94cb-c9ec9c62ec10",
                "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/uom/metadata",
                "type" : "uom",
                "mediaType" : "application/json"
            }
        },
        productFolder: {
            meta: {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productfolder/7158b3fd-879a-11ef-0a80-0b580038350a",
                "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/productfolder/metadata",
                "type" : "productfolder",
                "mediaType" : "application/json",
            }
        }
    }
    const product = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', params)
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
    data?.order?.name && result.push({ meta: dictionary.productAttributes["№ заказа покупателя"], value: data.order.name })
    for(const attribute in data){
        switch(attribute) {
            case 'height': data.height!=null && result.push({ meta: dictionary.productAttributes["Длина в мм"], value: data.height }); break;
            case 'width': data.width!=null && result.push({ meta: dictionary.productAttributes["Ширина в мм"], value: data.width }); break;
            case 'cutsv1': data.cutsv1!=null && result.push({ meta: dictionary.productAttributes["Кол-во вырезов 1 категорий"], value: data.cutsv1 }); break;
            case 'cutsv2': data.cutsv2!=null && result.push({ meta: dictionary.productAttributes["Кол-во вырезов 2 категорий"], value: data.cutsv2 }); break;
            case 'cutsv3': data.cutsv3!=null && result.push({ meta: dictionary.productAttributes["Кол-во вырезов 3 категорий"], value: data.cutsv3 }); break;
            case 'drills': data.drills!=null && result.push({ meta: dictionary.productAttributes["Кол-во сверлений"], value: data.drills }); break;
            case 'zenk': data.zenk!=null && result.push({ meta: dictionary.productAttributes["Кол-во зенкований"], value: data.zenk }); break;
            case 'material': data.material!=null && result.push({ meta: dictionary.productAttributes["Материал 1"], value: data.material }); break;
            case 'materials': data.materials?.length!=null && result.push({ meta: dictionary.productAttributes["Кол-во полуфабрикатов"], value: data.materials.length }); break;
            case 'material1': data.material1!=null && result.push({ meta: dictionary.productAttributes["Материал 1"], value: data.material1 }); break;
            case 'material2': data.material2!=null && result.push({ meta: dictionary.productAttributes["Материал 2"], value: data.material2 }); break;
            case 'material3': data.material3!=null && result.push({ meta: dictionary.productAttributes["Материал 3"], value: data.material3 }); break;
            case 'material4': data.material4!=null && result.push({ meta: dictionary.productAttributes["Материал 4"], value: data.material4 }); break;
            case 'tape1': data.tape1!=null && result.push({ meta: dictionary.productAttributes["Пленка 1"], value: {meta: SkladService.selfcost.materials[data.tape1].meta} }); break;
            case 'tape2': data.tape2!=null && result.push({ meta: dictionary.productAttributes["Пленка 1"], value: {meta: SkladService.selfcost.materials[data.tape2].meta} }); break;
            case 'tape3': data.tape3!=null && result.push({ meta: dictionary.productAttributes["Пленка 1"], value: {meta: SkladService.selfcost.materials[data.tape3].meta} }); break;
            case 'color': data.color!=null && result.push({ meta: dictionary.productAttributes["Окрашивание"], value: data.color || '' }); break;
            case 'print': data.print === true && result.push({ meta: dictionary.productAttributes["Печать"], value: true }); break;
            case 'polishing': data.polishing === true && result.push({ meta: dictionary.productAttributes["Полировка"], value: true }); break;
            case 'type': data.type!=null && result.push({ meta: dictionary.productAttributes["Тип изделия"], value: data.type }); break;
            case 'stanok': data.stanok!=null && result.push({ meta: dictionary.productAttributes["Тип станка"], value: data.stanok }); break;
            case 'productType': result.push({ meta: dictionary.productAttributes["Вид номенклатуры"], value: dictionary.attributesValue["Готовая продукция"] }); break;
            case 'tempered': data.tempered === true && result.push({ meta: dictionary.productAttributes["Закалка"], value: true }); break;
            case 'smdType': data.smdType!=null && result.push({ meta: dictionary.productAttributes["Тип СМД"], value: data.smdType }); break;
            case 'isPF': data.isPF === true && result.push({ meta: dictionary.productAttributes["Это полуфабрикат"], value: true }); break;
            case 'P': data.P!=null && result.push({ meta: dictionary.productAttributes["Периметр 1 детали в пог. м"], value: data.P }); break;
        }

    }
    return result.filter(el => el.value != undefined)
}
const generateProductionTaskAttributes = (order, checkboxes) => {
    const result = []
    const {viz, smd, print, triplex, colors, ceraglass, height, width} = checkboxes

    result.push({ meta: dictionary.productiontaskAttributes["№ заказа покупателя"], value: order.name })
    order.invoicesOut && result.push({ meta: dictionary.productiontaskAttributes["№ Счета"], value: order.invoicesOut.map(el => el.name).join(';') })
    order.agent && result.push({ meta: dictionary.productiontaskAttributes["Получатель"], value: {meta: order.agent.meta} }) 
    viz && result.push({ meta: dictionary.productiontaskAttributes["Задание для ВИЗа"], value: true }) 
    smd && result.push({ meta: dictionary.productiontaskAttributes["СМД"], value: true }) 
    print && result.push({ meta: dictionary.productiontaskAttributes["Есть УФ печать"], value: true })
    triplex && result.push({ meta: dictionary.productiontaskAttributes["Триплекс"], value: true })
    ceraglass && result.push({ meta: dictionary.productiontaskAttributes["Керагласс"], value: true })
    height && result.push({ meta: dictionary.productiontaskAttributes["Высота"], value: Number(height) })
    width && result.push({ meta: dictionary.productiontaskAttributes["Ширина"], value: Number(width) })
    if (colors?.length > 0) {
        !smd && result.push({ meta: dictionary.productiontaskAttributes["Окрашивание"], value: true });
        result.push({ meta: dictionary.productiontaskAttributes["Цвет"], value: [...new Set(colors)].join(';')
    });
    }
    return result
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
            if(recordsToDelete.length > 0){
                const productsToDelete = recordsToDelete.filter(el => el.meta.type === 'product')
                const servicesToDelete = recordsToDelete.filter(el => el.meta.type === 'service')

                let responseProducts = []
                let responseServices = []

                if(productsToDelete.length > 0){
                    responseProducts = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/product/delete", "post", productsToDelete.map(el => ({meta: el.meta}))).catch(err => {console.error("Ошибка при удалении товаров", err); return []})
                }
                if(servicesToDelete.length > 0){
                    responseServices = await Client.sklad("https://api.moysklad.ru/api/remap/1.2/entity/service/delete", "post", servicesToDelete.map(el => ({meta: el.meta}))).catch(err => {console.error("Ошибка при удалении услуг", err); return []})
                }

                const responses = [...responseProducts, ...responseServices]
                const allRecords = [...productsToDelete, ...servicesToDelete]

                await Details.destroy({
                    where: {
                        productId: {
                            [Op.in]: responses.reduce((acc, curr, index) => {
                                if(!curr.errors) acc.push(allRecords[index].id)
                                return acc
                            }, [])
                        }
                    }
                })
            }
        }
    }catch{
    }
}
const generateStages = (data, place) => {
    const result = []
    switch(place){
        case 'selk':
            result.push('Раскрой')
            data.result.other.stanok == 'Прямолинейка' && result.push('Прямолинейная обработка')
            data.result.other.stanok == 'Криволинейка' && result.push('Криволинейная обработка')
            data.initialData.cutsv1 && result.push('Вырезы в стекле 1 категории')
            data.initialData.cutsv2 && result.push('Вырезы в стекле 2 категории')
            data.initialData.cutsv3 && result.push('Вырезы в стекле 3 категории')
            data.initialData.drills && result.push('Сверление')
            data.initialData.zenk && result.push('Зенковка')
            data.initialData.tempered && result.push('Закалка')
            result.push('ОТК')
            return result
        case 'viz': 
            data.initialData.color && result.push('Окраска стекла')
            data.result.other.type == 'Триплекс' && result.push('Триплексование')
            data.initialData.print && result.push('УФ (УФ печать)')
            result.push('ОТК')
            return result
        case 'vizCera':
            result.push('Раскрой гидрорез Керамики')
            result.push('ОТК')
            return result
        case 'glassPolev':
            result.push('Раскрой')
            data[1] && result.push('Закалка')
            data[2] && result.push('Полировка')
            data[3] && result.push('Притупка')
            result.push('ОТК')
            return result
        case 'SPbuild':
            result.push('Изготовление рамки')
            result.push('Сборка стеклопакета')
            result.push('Герметизация')
            return result
    }
    if(place == 'selk'){
        const stagesSelk = ['Раскрой']
        data.result.other.stanok == 'Прямолинейка' ? stagesSelk.push('Прямолинейная обработка') : stagesSelk.push('Криволинейная обработка')
        data.initialData.cutsv1 && stagesSelk.push('Вырезы в стекле 1 категории')
        data.initialData.cutsv2 && stagesSelk.push('Вырезы в стекле 2 категории')
        data.initialData.cutsv3 && stagesSelk.push('Вырезы в стекле 3 категории')
        data.initialData.drills && stagesSelk.push('Сверление')
        data.initialData.zenk && stagesSelk.push('Зенковка')
        data.initialData.tempered && stagesSelk.push('Закалка')
        stagesSelk.push('ОТК')
        return stagesSelk;
    }else if(place == 'viz'){
        const stagesViz = []
        data.initialData.color && stagesViz.push('Окраска стекла')
        data.result.other.type == 'Триплекс' && stagesViz.push('Триплексование')
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
const changeStatusForPZ = async (id) => {
    const order = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${id}`)
    const tasks = order?.productionTasks
    if(!tasks) return
    Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/productiontask', 'post', tasks.map(el => {
        return {
            meta: el.meta,
            state: {meta: {
                "href" : "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata/states/fa4868dd-5f60-11ed-0a80-0bf1000f79a7",
                "metadataHref" : "https://api.moysklad.ru/api/remap/1.2/entity/productiontask/metadata",
                "type" : "state",
                "mediaType" : "application/json"
            }}
        }
    }))
}
const checkOrderDetails = async order => {
    const anyIssue = async (message) => {
        const task = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/task', 'post', {
            assignee: {
                meta: order.owner.meta,
            },
            operation: {
                meta: order.meta
            },
            description: message
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

    if(!order.deliveryPlannedMoment){
        await anyIssue('Не указана планируемая дата отгрузки, создание пз не было выполнено')
        return true
    }
    if(order.state.name === 'Поставлено в производство (без полной оплаты)') return false
    if(order.sum > order.payedSum){
        await anyIssue('Заказ оплачен не полностью, создание пз не было выполнено')
        return true
    }
    const missing = ['Город получателя', 'Вид доставки', 'Телефон получателя', 'Адрес получателя', 'Выбор транспортной компании']
        .filter(k => !(order.attributes||[]).some(a => a.name===k));
    if(missing.length > 0){
        await anyIssue(`Заполнены не все обязательные поля, создание пз не было выполнено\nНе заполнено: ${missing.join(',')}`)
        return true
    }
    // const counterpartyReport = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/report/counterparty/${order.agent.id}`)
    // const debt = counterpartyReport.balance < -1000
    return false
}
async function startWorker(name, func) {
    const conn = await amqp.connect('amqp://admin:%5EjZG1L%2Fi@localhost');
    const channel = await conn.createChannel();
    const QUEUE_NAME = name
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1);

    console.log(`[*] Ожидание задач в очереди "${QUEUE_NAME}"`);

    channel.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
            const id = msg.content.toString()
            try {
                await func(id)
                channel.ack(msg);
            } catch (error) {
                logger.error(`Ошибка при работе воркера ${name} с id ${id}`, {error: error?.message || error});
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
}, 600_000) //10 минут
startWorker('pzwebhook', createProductionTask)
startWorker('changeStatusByDemand', changeStatusForPZ)