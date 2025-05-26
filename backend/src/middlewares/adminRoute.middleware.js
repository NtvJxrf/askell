import User from '../databases/models/user/user.model.js';
import ApiError from '../utils/apiError.js';
import TokenService from '../services/token.service.js';
const adminRouteMiddleware = async (req, res, next) => {
    if(req.user.role != 'admin')
        throw new ApiError(403, 'FORBIDDEN')
    next()
}

export default adminRouteMiddleware