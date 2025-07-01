import { DataTypes } from 'sequelize';
import sequelize from '../../db.js';
import { auditHook } from '../../../utils/auditHook.js';

const Prices = sequelize.define('prices', {
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
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'prices',
  paranoid: true,
});

Prices.addHook('afterCreate', (instance, options) =>
  auditHook(instance, options, 'CREATE', 'prices')
);
Prices.addHook('beforeUpdate', (instance, options) =>
  auditHook(instance, options, 'UPDATE', 'prices')
);
Prices.addHook('beforeDestroy', (instance, options) =>
  auditHook(instance, options, 'DELETE', 'prices')
);

export default Prices;
