import pricesAndCoefsService from '../services/pricesAndCoefs.service.js';
import SkladService from '../services/sklad.service.js';
export default class pricesAndCoefsController {
    static async getAll(req, res) {
        const result = await pricesAndCoefsService.getAll();
        res.send(result);
    }
    static async update(req, res) {
        const result = await pricesAndCoefsService.update(req);
        broadcast({type: 'selfcosts', data: SkladService.selfcost})
        return res.sendStatus(200);
    }
    static async bulk(req, res) {
        const result = await pricesAndCoefsService.bulk(req);
        broadcast({type: 'selfcosts', data: SkladService.selfcost})
        return res.sendStatus(200);
    }
    static async create(req, res) {
        const result = await pricesAndCoefsService.create(req);
        broadcast({type: 'selfcosts', data: SkladService.selfcost})
        return res.sendStatus(200);
    }
    static async delete(req, res) {
        const result = await pricesAndCoefsService.delete(req);
        broadcast({type: 'selfcosts', data: SkladService.selfcost})
        if (result)
            return res.sendStatus(200);
        return res.sendStatus(404);
    }
}