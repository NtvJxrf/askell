import { DataTypes } from 'sequelize';
import sequelize from '../../db.js';
const Processingprocess = sequelize.define('processingprocess', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING
    },
    stages: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    meta: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    hash: {
        type: DataTypes.STRING,
        unique: true,
    },
},{
    tableName: 'processingprocess',
    paranoid: true,
});

export default Processingprocess;