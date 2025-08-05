import { DataTypes } from 'sequelize';
import sequelize from '../../db.js';
const ProcessingPlansSmd = sequelize.define('ProcessingPlansSmd', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING
    },
    meta: {
        type: DataTypes.JSONB,
        allowNull: false
    },
},{
    tableName: 'ProcessingPlansSmd',
    paranoid: true,
});

export default ProcessingPlansSmd;