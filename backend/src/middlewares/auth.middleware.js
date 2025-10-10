import TokenService from '../services/token.service.js';
import ApiError from '../utils/apiError.js';
import logger from '../utils/logger.js';
import ipRangeCheck from 'ip-range-check';
export const trustedIps = ['23.105.238.220', '23.105.239.236', '127.0.0.1', '::1'];

const authMiddleware = async (req, res, next) => {
  try {
    const clientIp = req.ip
    if (ipRangeCheck(clientIp, trustedIps)) {
      req.user = { roles: ['system'], username: 'system' };
      return next();
    }
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) return next(new ApiError(401, 'Unauthorized: No tokens'))

    if (accessToken) {
      try {
        const payload = TokenService.verifyAccessToken(accessToken);
        req.user = payload;
        return next();
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          logger.debug('Access token expired, trying refresh token');
        } else {
          logger.error('Invalid access token', err);
        }
        // Переход к refreshToken
      }
    }

    if (refreshToken) {
      try {
        const tokens = await TokenService.refreshTokens(refreshToken);
        const payload = tokens.payload

        res.cookie('accessToken', tokens.accessToken, {
          maxAge: Number(process.env.JWT_ACCESS_EXPIRATION_MINUTES) * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });

        res.cookie('refreshToken', tokens.refreshToken, {
          maxAge: Number(process.env.JWT_REFRESH_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });

        res.cookie('id', payload.id, {
          maxAge: Number(process.env.JWT_REFRESH_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });

        req.user = payload
        return next()
      } catch (err) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        logger.error('Invalid refresh token', err);
        return next(new ApiError(401, 'Invalid refresh token'));
      }
    }
    return next(new ApiError(401, 'Invalid access token'));
  } catch (error) {
    logger.error('Authentication error:', error);
    return next(new ApiError(401, 'Authentication failed'));
  }
};

export default authMiddleware;
