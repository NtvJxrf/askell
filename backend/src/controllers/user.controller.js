import userService from '../services/user.service.js';
import TokenService from '../services/token.service.js';
import ApiError from '../utils/apiError.js';
export default class UserController{
    static async createUser(req, res){
        const { username, roles = ['user'] } = req.body;
        if (!username)
            throw new ApiError(400, 'Username and password are required, BAD_REQUEST')
        if (roles.length < 1)
            throw new ApiError(400, 'User must have at least one role')
        const token = await userService.createUser(username, roles)
        const url = `https://calc.askell.ru/activate?token=${token}`
        res.status(201).json(url)
    }

    static async login(req, res) {
        const { username, password } = req.body;
        if (!username || !password) 
            throw new ApiError(400, 'Username and password are required, BAD_REQUEST')
        const user = await userService.login(username, password)
        setTokens(res, user)
        res.status(200).json({ user, message: 'Login successful' })
    }
    static async resetUserPassword(req, res) {
        const { id } = req.body;
        if (!id) 
            throw new ApiError(400, 'Id are required, BAD_REQUEST')
        const token = await userService.resetUserPassword(id)
        const url = `https://calc.askell.ru/activate?token=${token}`
        res.status(200).json(url)
    }
    static async activate(req, res){
        const { password, token } = req.body
        if (!password || !token) 
            throw new ApiError(400, 'Password and token are required, BAD_REQUEST')
        const user = await userService.activate(password, token)
        setTokens(res, user)
        res.status(200).json({ user, message: 'Login successful' })
    }
    static async update(req, res){
        const { id, data } = req.body
        const user = await userService.update(id, data)
        res.sendStatus(200)
    }
    static async logout(req, res) {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }
        const user = TokenService.verifyRefreshToken(refreshToken)
        await TokenService.destroyRefreshToken(refreshToken, user.id);
        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        res.status(200).json({ message: 'Logout successful' });
    }
    static async getUsers(req, res) {
        const users = await userService.getUsers()
        res.status(200).json(users)
    }
    static async delete(req, res) {
        const result = await userService.delete(req.body, req.user)
        if(result != 0)
            return res.sendStatus(200)
        return res.sendStatus(404)
    }
    static async restoreUser(req, res) {
        const result = await userService.restoreUser(req.body)
        if(result != 0)
            return res.sendStatus(200)
        return res.sendStatus(404)
    }
}

const setTokens = (res, user) => {
    res.cookie('refreshToken', user.refreshToken, { 
        maxAge: Number(process.env.JWT_REFRESH_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.cookie('accessToken', user.accessToken, { 
        maxAge: Number(process.env.JWT_ACCESS_EXPIRATION_MINUTES) * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
}