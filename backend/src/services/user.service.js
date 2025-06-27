import UserModel from '../databases/models/user/user.model.js'; 
import ApiError from '../utils/apiError.js';
import tokenService from './token.service.js'
import crypto from 'crypto'
import valkey from '../utils/valkey.js';
import { json } from 'sequelize';
export default class UserService {
    static async createUser(username, roles,) {
        if(await UserModel.findOne({ where: { username }, paranoid: false}))
            throw new ApiError(400, 'Username already exists, BAD_REQUEST')
        console.log(roles)
        const user = await UserModel.create({ username, password: crypto.randomBytes(32).toString('hex'), roles })
        delete user.dataValues.password
        const token = crypto.randomBytes(32).toString('hex');
        await valkey.set(token, JSON.stringify(user), 'EX', 3600)
        return token
    }
    static async resetPassword(username, password){
        const user = await UserModel.findOne({ where: { username }, paranoid: false})
        if(!user)
            throw new ApiError(400, 'User not fount, BAD_REQUEST')
    }
    static async deleteUser(data, requester){
        const { userToDelete, force } = data
        if(userToDelete === requester.id)
            throw new ApiError(400, 'suicide?')
        await tokenService.deleteUserTokens(userToDelete)
        return await UserModel.destroy({ where: { id: userToDelete }, force: true })
    }
    static async restoreUser(data){
        const { userToRestore } = data
        return await UserModel.restore({ where: { id: userToRestore } })
    }
    static async login(username, password) {
        const user = await UserModel.findOne({ where: { username } })
        if (!user || !await user.comparePassword(password)) {
            throw new ApiError(400, 'Invalid username or password');
        }
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