import UserModel from '../databases/models/user/user.model.js'; 
import ApiError from '../utils/apiError.js';
import tokenService from './token.service.js';
import loginValidator from '../validators/login.validator.js';
import createUserValidator from '../validators/createUser.validator.js';

export default class userService {
    static async createUser(username, password, role = 'user',) {
        await createUserValidator.validateAsync({ username, password })
        if(await UserModel.findOne({ where: { username }, paranoid: false}))
            throw new ApiError(400, 'Username already exists, BAD_REQUEST')
        const user = await UserModel.create({ username, password, role })
        delete user.dataValues.password
        return user
    }
    static async deleteUser(data, requester){
        const { userToDelete, force } = data
        if(userToDelete === requester.id)
            throw new ApiError(400, 'suicide?')
        await tokenService.deleteUserTokens(userToDelete)
        return await UserModel.destroy({ where: { id: userToDelete }, force })
    }
    static async restoreUser(data){
        const { userToRestore } = data
        return await UserModel.restore({ where: { id: userToRestore } })
    }
    static async login(username, password) {
        await loginValidator.validateAsync({ username, password })
        const user = await UserModel.findOne({ where: { username } })
        if (!user || !await user.comparePassword(password)) {
            throw new ApiError(400, 'Invalid username or password');
        }
        delete user.dataValues.password
        await generateAndSetTokens(user);
        return user;
    }
    static async getUsers(){
        return await UserModel.findAll({paranoid: false})
    }
}

const generateAndSetTokens = async (user) => {
    const { accessToken, refreshToken } = await tokenService.generateTokens({ id: user.id, username: user.username, role: user.role });
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    return { accessToken, refreshToken };
}