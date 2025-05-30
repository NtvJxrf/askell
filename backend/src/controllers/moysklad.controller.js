import SkladService from '../services/sklad.service.js'
export default class MoySkladController{
    static async createHook(req, res){
        const id = req.query.id
        const result = await SkladService.createHook(id)
        res.sendStatus(200)
    }
    static async updateHook(req, res){
        const id = req.query.id
        const result = await SkladService.updateHook(id)
        res.sendStatus(200)
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
}