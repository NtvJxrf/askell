import ApiError from '../utils/apiError.js';
import Coefs from '../databases/models/sklad/coefs.model.js';
import Prices from '../databases/models/sklad/prices.mode.js';
import WorkPrices from '../databases/models/sklad/workPrices.model.js';
import { getPicesAndCoefs } from '../utils/skladAdditions.js';

const modelMap = {
  coefs: Coefs,
  prices: Prices,
  work_prices: WorkPrices,
};

export default class pricesAndCoefsService {
  static async getAll() {
    const [coefs, prices, workPrices] = await Promise.all([
      Coefs.findAll(),
      Prices.findAll(),
      WorkPrices.findAll(),
    ]);
    return {
      coefs: coefs.map(i => i.toJSON()),
      prices: prices.map(i => i.toJSON()),
      work_prices: workPrices.map(i => i.toJSON()),
    };
  }

  static getModelByType(type) {
    const model = modelMap[type];
    if (!model) throw new ApiError(400, `Unknown type: ${type}`);
    return model;
  }

  static async create(data) {
    const { type, name, value, description, ratePerHour, costOfWork } = data.body;
    const model = this.getModelByType(type);

    const exists = await model.findOne({ where: { name } });
    if (exists) throw new ApiError(400, 'Record with this name already exists');

    let createData = {
        name,
        description,
        createdBy: data.user.id,
    };
    if (type === 'work_prices') {
        createData.ratePerHour = ratePerHour
        createData.costOfWork = costOfWork
    } else
        createData.value = value

    const record = await model.create(createData, { userId: data.user.id });

    await getPicesAndCoefs();
    return record.toJSON();
    }


  static async update(data) {
    const { type, name, value, description, ratePerHour, costOfWork } = data.body;
    const model = this.getModelByType(type);

    const record = await model.findOne({ where: { name } });
    if (!record) throw new ApiError(404, 'Record not found');

    let updateData = {
        name,
        description,
    };
    if (type === 'work_prices') {
        updateData.ratePerHour = ratePerHour;
        updateData.costOfWork = costOfWork;
    } else
        updateData.value = value

    await model.update(updateData, { where: { name }, individualHooks: true, userId: data.user.id });

    await getPicesAndCoefs();
    return record.toJSON();
  }

  static async delete(data) {
    const { type, name } = data.body;
    const model = this.getModelByType(type);

    const record = await model.findOne({ where: { name } });
    if (!record) throw new ApiError(404, 'Record not found');

    await model.destroy({ where: { name }, force: true, individualHooks: true, userId: data.user.id });

    await getPicesAndCoefs();
    return true;
  }
}
