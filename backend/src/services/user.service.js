import UserModel from '../databases/models/user/user.model.js'; 
import ApiError from '../utils/apiError.js';
import tokenService from './token.service.js'
import crypto from 'crypto'
import valkey from '../utils/valkey.js';
import bcrypt from 'bcrypt'
export default class UserService {
    static async createUser(username, roles,) {
        if(await UserModel.findOne({ where: { username }, paranoid: false}))
            throw new ApiError(400, 'Username already exists, BAD_REQUEST')
        const user = await UserModel.create({ username, roles })
        delete user.dataValues.password
        const token = crypto.randomBytes(32).toString('hex');
        await valkey.set(`activation:${token}`, user.id, 'EX', 3600)
        return token
    }
    static async activate(password, token){
        const id = await valkey.get(`activation:${token}`)
        if(!id) throw new ApiError(400, 'The token is not valid')
        const user = await this.resetPassword(id, password)
        await generateAndSetTokens(user);
        await valkey.del(`activation:${token}`)
        return user
    }
    static async resetUserPassword(id){
        const user = await UserModel.findByPk(id)
        if(!user) throw new ApiError(400, 'User not found, BAD_REQUEST')
        user.isActive = false
        user.password = null
        user.save()
        await tokenService.deleteUserTokens(id)
        const token = crypto.randomBytes(32).toString('hex');
        await valkey.set(`activation:${token}`, id, 'EX', 3600)
        return token
    }
    static async resetPassword(id, password){
        const user = await UserModel.findByPk(id)
        if(!user)
            throw new ApiError(400, 'User not found, BAD_REQUEST')
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        user.password = hashedPassword
        user.isActive = true
        await user.save()
        return user
    }
    static async update(id, data) {
        const user = await UserModel.findByPk(id);
        if (!user) throw new ApiError(404, 'User not found')

        const allowedFields = ['username', 'roles'];
        const updateData = {};

        for (const field of allowedFields) {
            if (data[field] !== undefined){
                if(field === 'roles' && data[field].length < 1) throw new ApiError(400, 'User must have at least one role')
                updateData[field] = data[field]
            }
        }
        await user.update(updateData);
        await tokenService.deleteUserTokens(id)
        delete user.dataValues.password;
        return user;
    }

    static async delete(data, requester){
        const { id, force = false } = data
        if(id === requester.id) throw new ApiError(400, 'Cannot delete own user')
        await tokenService.deleteUserTokens(id)
        return await UserModel.destroy({ where: { id }, force })
    }
    static async restoreUser(data){
        const { userToRestore } = data
        return await UserModel.restore({ where: { id: userToRestore } })
    }
    static async login(username, password) {
        const user = await UserModel.findOne({ where: { username } })
        if (!user || !user.isActive || !await user.comparePassword(password))
            throw new ApiError(400, 'Invalid username or password')
        delete user.dataValues.password
        await generateAndSetTokens(user);
        return user;
    }
    static async getUsers(){
        return await UserModel.findAll({ attributes: { exclude: ['password'] }, paranoid: false });
    }
}

const generateAndSetTokens = async (user) => {
    const { accessToken, refreshToken } = await tokenService.generateTokens({ id: user.id, username: user.username, roles: user.roles });
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    return { accessToken, refreshToken };
}