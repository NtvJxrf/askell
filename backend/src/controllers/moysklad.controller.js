import SkladService from '../services/sklad.service.js'
import { getQueueChannel } from '../utils/rabbitmq.js';
import { initSkladAdditions } from '../utils/skladAdditions.js';
import { getMaterials, getPackagingMaterials, getProcessingStages, getStores, getUnders, getColors, getPicesAndCoefs, getAttributes, getProcessingPlansSmd, getCurrency, getPriceTypes } from '../utils/skladAdditions.js'
import SkladHooks from '../services/skladHooks.service.js';
import { broadcast } from '../utils/WebSocket.js';
export default class MoySkladController{
    static async createPzHook(req, res){
        const channel = getQueueChannel();
        const id = req.query.id
        const success = channel.sendToQueue('pzwebhook', Buffer.from(id), { persistent: true });

        if (!success) throw new Error('Failed to enqueue task');
        res.sendStatus(200);
    }
    static async changeStatusByDemand(req, res){
        const channel = getQueueChannel();
        const id = req.query.id
        const success = channel.sendToQueue('changeStatusByDemand', Buffer.from(id), { persistent: true });

        if (!success) throw new Error('Failed to enqueue task');
        res.sendStatus(200);
    }
    static async getOrder(req, res){
        const name = req.query.orderName
        const result = await SkladService.getOrder(name)
        res.send(result)
    }
    static async getSelfcost(req, res){
        res.send(SkladService.selfcost)
    }
    static async addPositionsToOrder(req, res){
        const result = await SkladService.addPositionsToOrder(req.body)
        res.sendStatus(200)
    }
    static async updateSelfcosts(req, res){
        const result = await initSkladAdditions()
        res.sendStatus(200)
        broadcast({type: 'selfcosts', data: SkladService.selfcost})
    }
    static async updateSelfcostsWithKey(req, res){
        const skladUpdaters = {
            materials: getMaterials,
            packaging: getPackagingMaterials,
            processingStages: getProcessingStages,
            stores: getStores,
            unders: getUnders,
            colors: getColors,
            pricing: getPicesAndCoefs,
            attributes: getAttributes,
            smdPlans: getProcessingPlansSmd,
            currencies: getCurrency,
            priceTypes: getPriceTypes
        };
        const { key } = req.params;
        const result = await skladUpdaters[key]()
        res.sendStatus(200)
        broadcast({type: 'selfcosts', data: SkladService.selfcost})
    }
    static async ordersInWork(req, res){
        res.send(SkladService.ordersInWork)
    }
    static async pzChangedWebhook(req, res){
        const result = await SkladHooks.pzChange(req.body)
        res.sendStatus(200)
    }
    static async orderCompleted(req, res){
        res.sendStatus(200)
        const result = await SkladHooks.orderCompleted(req.query.id)
    }
}