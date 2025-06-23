import pricesAndCoefsService from '../services/pricesAndCoefs.service.js';
export default class pricesAndCoefsController {
    static async getAll(req, res) {
        const result = await pricesAndCoefsService.getAll();
        res.send(result);
    }

    static async update(req, res) {
        const result = await pricesAndCoefsService.update(req);
        return res.sendStatus(200);
    }

    static async create(req, res) {
        const result = await pricesAndCoefsService.create(req);
        return res.sendStatus(200);
    }
    static async delete(req, res) {
        const result = await pricesAndCoefsService.delete(req);
        if (result)
            return res.sendStatus(200);
        return res.sendStatus(404);
    }
}