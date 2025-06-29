import { DataTypes } from 'sequelize';
import sequelize from '../../db.js';
import bcrypt from 'bcrypt';
const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    roles: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: ['manager'],
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
},{
    tableName: 'users',
    paranoid: true,
});

User.beforeCreate(async (user) => {
    if(!user.password) return
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(user.password, salt);
})

User.prototype.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password)
}

export default User;