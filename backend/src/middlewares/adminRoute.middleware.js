import ApiError from '../utils/apiError.js';
const adminRouteMiddleware = async (req, res, next) => {
    if(req.user.role != 'admin')
        throw new ApiError(403, 'FORBIDDEN')
    next()
}

export default adminRouteMiddleware