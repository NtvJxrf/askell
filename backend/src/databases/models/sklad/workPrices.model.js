import { DataTypes } from 'sequelize';
import sequelize from '../../db.js';
import { auditHook } from '../../../utils/auditHook.js';

const WorkPrices = sequelize.define('work_prices', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  ratePerHour: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  costOfWork: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  salary: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'work_prices',
  paranoid: true,
});

WorkPrices.addHook('afterCreate', (instance, options) =>
  auditHook(instance, options, 'CREATE', 'work_prices')
);
WorkPrices.addHook('beforeUpdate', (instance, options) =>
  auditHook(instance, options, 'UPDATE', 'work_prices')
);
WorkPrices.addHook('beforeDestroy', (instance, options) =>
  auditHook(instance, options, 'DELETE', 'work_prices')
);

export default WorkPrices;
