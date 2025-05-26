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
}