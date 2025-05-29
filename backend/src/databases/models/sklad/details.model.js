import { DataTypes } from 'sequelize';
import sequelize from '../../db.js';
const Details = sequelize.define('Details', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    productId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    selfcost: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    initialData: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    result: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
},{
    tableName: 'details',
    paranoid: true,
});

export default Details;