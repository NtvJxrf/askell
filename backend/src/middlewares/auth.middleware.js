import TokenService from '../services/token.service.js';
import ApiError from '../utils/apiError.js';
import logger from '../utils/logger.js'
import ipRangeCheck from 'ip-range-check'
export const trustedIps = [ '23.105.238.220', '23.105.239.236', '127.0.0.1' //sklad
]
const authMiddleware = async (req, res, next) => {
    if (ipRangeCheck(req.ip, trustedIps)) {
        return next();
    }
    try {
        const accessToken = req.cookies.accessToken
        const refreshToken = req.cookies.refreshToken
        if (!accessToken && !refreshToken) {
            return next(new ApiError(401, 'Unauthorized: No tokens'));
        }

        try {
            const payload = TokenService.verifyAccessToken(accessToken)
            req.user = payload
            return next()
        } catch (error) {
            if (refreshToken) {
                try {
                    const tokens = await TokenService.refreshTokens(refreshToken)
                    res.cookie('accessToken', tokens.accessToken, {
                        maxAge: process.env.JWT_ACCESS_EXPIRATION_MINUTES * 60 * 1000,
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'strict'
                    });
                    res.cookie('refreshToken', tokens.refreshToken, {
                        maxAge: process.env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'strict'
                    });
                    const payload = TokenService.verifyAccessToken(tokens.accessToken);
                    res.cookie('id', payload.id, {
                        maxAge: process.env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
                    })
                    req.user = payload;
                    return next();
                } catch (error) {
                    res.clearCookie('accessToken');
                    res.clearCookie('refreshToken');
                    return next(new ApiError(401, 'Invalid refresh token'));
                }
            }
            return next(new ApiError(401, 'Invalid access token'));
        }
    } catch (error) {
        console.error('Authentication error:', error);
        logger.error('Authentication error:', error);
        next(new ApiError(401, 'Authentication failed'));
    }
};
export default authMiddleware;