import userService from '../services/user.service.js';
import TokenService from '../services/token.service.js';
import ApiError from '../utils/apiError.js';
export default class UserController{
    static async createUser(req, res){
        const { username, password, role = 'user', creatorId } = req.body;
        if (!username || !password)
            throw new ApiError()(400, 'Username and password are required, BAD_REQUEST')
        const user = await userService.createUser(username, password, role, creatorId)
        res.status(201).json(user)
    }

    static async login(req, res) {
        const { username, password } = req.body;
        if (!username || !password) 
            throw new ApiError()(400, 'Username and password are required, BAD_REQUEST')
        const user = await userService.login(username, password)
        setTokens(res, user)
        res.status(200).json({ user, message: 'Login successful' })
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
    static async deleteUser(req, res) {
        const result = await userService.deleteUser(req.body, req.user)
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
    res.cookie('refreshToken', user.refreshToken, { maxAge: process.env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.cookie('accessToken', user.accessToken, { maxAge: process.env.JWT_ACCESS_EXPIRATION_MINUTES * 60 * 1000, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.cookie('id', user.id, { maxAge: process.env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000})
}