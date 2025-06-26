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
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('admin', 'user'),
        defaultValue: 'user',
    },
},{
    tableName: 'users',
    paranoid: true,
});

User.beforeCreate((user) => {
    const salt = bcrypt.genSaltSync(10)
    user.password = bcrypt.hashSync(user.password, salt);
})

User.prototype.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password)
}

export default User;