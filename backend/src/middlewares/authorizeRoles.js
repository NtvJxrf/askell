import ApiError from "../utils/apiError.js";
const authorizeRoles = (allowedRoles) => {
  return async (req, res, next) => {
    const user = req.user
    if(user.roles.includes('admin')){
      next()
      return
    }
    if(allowedRoles === 'none')
      throw new ApiError(403, 'FORBIDDEN')
    const hasAccess = allowedRoles.some(role => user.roles.includes(role))
    if (!hasAccess)
        throw new ApiError(403, 'FORBIDDEN')

    next();
  };
}
export default authorizeRoles