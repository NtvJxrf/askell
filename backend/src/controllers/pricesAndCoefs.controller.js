import pricesAndCoefsService from '../services/pricesAndCoefs.service.js';
export default class pricesAndCoefsController {
    static async getPricesAndCoefs(req, res) {
        const result = await pricesAndCoefsService.getPricesAndCoefs();
        res.send(result);
    }

    static async updatePricesAndCoefs(req, res) {
        const result = await pricesAndCoefsService.updatePricesAndCoefs(req);
        res.send(result);
    }

    static async createPricesAndCoefs(req, res) {
        const result = await pricesAndCoefsService.createPricesAndCoefs(req);
        res.send(result);
    }
    static async deletePricesAndCoefs(req, res) {
        const { name } = req.body;
        if (!name)
            return res.status(400).send({ message: 'Name is required' })
        const result = await pricesAndCoefsService.deletePricesAndCoefs(name);
        if (result)
            return res.sendStatus(200);
        return res.sendStatus(404);
    }
}