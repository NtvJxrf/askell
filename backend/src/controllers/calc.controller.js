import CalcsService from '../services/calcs.service.js';

export default class CalcsController{
    static calculate(req, res){
        const { values, type } =  req.body
        const result = CalcsService.calculate(values, type)
        return res.json(result)
    }
    static async saveHistory(req, res){
        await CalcsService.createHistoryNote(req.body)
        res.sendStatus(200)
    }
    static async getHistory(req, res){
        const result = await CalcsService.getHistoryNotes(req.query.type)
        res.json(JSON.stringify(result))
    }
    static async deleteHistory(req, res){
        const result = await CalcsService.deleteHistory(req.body.id)
        if(result != 0)
            return res.sendStatus(200)
        return res.sendStatus(404)
    }
    static async updateHistory(req, res){
        const result = await CalcsService.updateHistory(req.body)
        if(result[0] != 0)
            return res.sendStatus(200)
        return res.sendStatus(404)
    }
}