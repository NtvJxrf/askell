// models/auditLog.js
import { DataTypes } from 'sequelize';
import sequelize from '../../db.js';

const AuditLog = sequelize.define('audit_log', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  entityName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  changedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  changedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  oldData: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  newData: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  changeType: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE'),
    allowNull: false,
  }
}, {
  tableName: 'audit_log',
  paranoid: true,
});

export default AuditLog;
