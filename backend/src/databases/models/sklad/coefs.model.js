import { DataTypes } from 'sequelize';
import sequelize from '../../db.js';
import { auditHook } from '../../../utils/auditHook.js'

const Coefs = sequelize.define('coefs', {
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
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'coefs',
  paranoid: true,
});

// === АУДИТ ХУКИ ===

Coefs.addHook('afterCreate', (instance, options) =>
  auditHook(instance, options, 'CREATE', 'coefs')
);

Coefs.addHook('beforeUpdate', (instance, options) =>
  auditHook(instance, options, 'UPDATE', 'coefs')
);

Coefs.addHook('beforeDestroy', (instance, options) =>
  auditHook(instance, options, 'DELETE', 'coefs')
);

export default Coefs;
