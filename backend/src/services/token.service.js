import jwt from 'jsonwebtoken'
import valkey from '../utils/valkey.js';
import ApiError from '../utils/apiError.js';

const refreshTTLSeconds = process.env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60

export default class TokenService {
    static async generateTokens(payload) {
        const accessToken = this.generateAccessToken(payload)
        const refreshToken = await this.generateRefreshToken(payload)
        return { accessToken, refreshToken };
    }

    static generateAccessToken(payload) {
        return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: `${process.env.JWT_ACCESS_EXPIRATION_MINUTES}m` });
    }

    static async generateRefreshToken(payload) {
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: `${process.env.JWT_REFRESH_EXPIRATION_DAYS}d` });
        await valkey.set(refreshToken, payload.id, 'EX', refreshTTLSeconds)
        await valkey.sadd(`refreshTokens:${payload.id}`, refreshToken);
        await valkey.expire(`refreshTokens:${payload.id}`, refreshTTLSeconds);
        return refreshToken
    }

    static verifyAccessToken(token) {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    }

    static verifyRefreshToken(token) {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    }
    static async destroyRefreshToken(token, id){
        await valkey.del(token)
        await valkey.srem(`refreshTokens:${id}`, token)
    }
    static async deleteUserTokens(id){
        const tokens = await valkey.smembers(`refreshTokens:${id}`)
        for (const token of tokens)
            await valkey.del(token)
        await valkey.del(`refreshTokens:${id}`);
    }
    static async refreshTokens(refreshToken) {
        const exists = await valkey.exists(refreshToken)
        if(!exists) throw new ApiError(401, 'Invalid refresh token')
        const payload = this.verifyRefreshToken(refreshToken)
        const tokens = await this.generateTokens({
            id: payload.id,
            username: payload.username,
            roles: payload.roles
        });
        await this.destroyRefreshToken(refreshToken, payload.id)
        return {...tokens, payload}
    }
}