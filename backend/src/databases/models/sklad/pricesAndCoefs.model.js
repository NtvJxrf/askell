import { DataTypes } from 'sequelize';
import sequelize from '../../db.js';
const PricesAndCoefs = sequelize.define('prices_and_coefs', {
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
},{
    tableName: 'prices_and_coefs',
    paranoid: true,
});

export default PricesAndCoefs;