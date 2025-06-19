import ApiError from '../utils/apiError.js';
import PricesAndCoefs from '../databases/models/sklad/pricesAndCoefs.model.js'
import { getPicesAndCoefs } from '../utils/skladAdditions.js';
import { create } from 'got';
export default class pricesAndCoefsService {
    static async getPricesAndCoefs() {
        const elements = await PricesAndCoefs.findAll();
        if (!elements)
            throw new ApiError(404, 'Prices and coefficients not found');
        return elements.map(el => el.toJSON());
    }

    static async updatePricesAndCoefs(data) {
        const { value, description, name } = data.body;
        const element = await PricesAndCoefs.findOne({
            where: {
                name: name
            },
        });
        if (!element)
            throw new ApiError(404, 'Prices and coefficients not found')
        await PricesAndCoefs.update(
            { value, description, lastUpdatedBy: data.user?.username },
            {where: {name: name}}
        );
        await getPicesAndCoefs()
        return element.toJSON()
    }
    static async createPricesAndCoefs(data) {
        const { value, description, name, type } = data.body;
        if (await PricesAndCoefs.findOne({ where: { name } }))
            throw new ApiError(400, 'Prices and coefficients with this name already exists');
        const element = await PricesAndCoefs.create({ value, description, name, type, createdBy: data.user?.username });
        await getPicesAndCoefs()
        return element.toJSON();
    }

    static async deletePricesAndCoefs(name) {
        const element = await PricesAndCoefs.findOne({ where: { name } });
        if (!element)
            throw new ApiError(404, 'Prices and coefficients with this name not found');
        await PricesAndCoefs.destroy({ where: { name }, force: true });
        await getPicesAndCoefs()
        return true;
    }
}

