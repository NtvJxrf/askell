import SkladService from '../services/sklad.service.js'
import { getQueueChannel } from '../utils/rabbitmq.js';
import { initSkladAdditions } from '../utils/skladAdditions.js';
import ApiError from '../utils/apiError.js';
export default class MoySkladController{
    static async createPzHook(req, res){
        const channel = getQueueChannel();
        const id = req.query.id
        const success = channel.sendToQueue('pzwebhook', Buffer.from(id), { persistent: true });

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
    }
}