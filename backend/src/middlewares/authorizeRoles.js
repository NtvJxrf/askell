import ApiError from "../utils/apiError.js";
const accessMap = {
  '/api/user': [],//users

  '/api/sklad/getOrder': ['manager', 'accountant'],  //sklad
  '/api/sklad/getSelfcost': ['anyone'],
  '/api/sklad/addPositionsToOrder': ['manager', 'accountant'],
  '/api/sklad/createPzHook': [],
  '/api/sklad/updateSelfcosts': ['anyone'],
  '/api/sklad/ordersInWork': ['anyone'],
  '/api/sklad/changeStatusByDemand': [],

  '/api/reports/create': ['anyone'],//reports

  '/api/pricesAndCoefs/getAll': ['anyone'], // prices
  '/api/pricesAndCoefs/update': ['accountant'],
  '/api/pricesAndCoefs/create': ['accountant'],
  '/api/pricesAndCoefs/delete': [],
  '/api/pricesAndCoefs/bulk': ['accountant'],
}
const authorizeRoles = (req, res, next) => {
  const user = req.user;
  if (!req.user || !Array.isArray(req.user.roles))return next(new ApiError(401, 'UNAUTHORIZED'))

  if (user.roles.includes('admin') || user.roles.includes('system'))return next()

  const endpoint = req.originalUrl.split('?')[0]

  const allowedRoles = getAllowedRoles(endpoint)
  const hasAccess = allowedRoles.some(role => user.roles.includes(role) || role === 'anyone')

  if (!hasAccess) return next(new ApiError(403, 'FORBIDDEN'))

  next();
};

const getAllowedRoles = (endpoint) => {
  const matchingKeys = Object.keys(accessMap).filter(path => endpoint.startsWith(path))

  const bestMatch = matchingKeys.sort((a, b) => b.length - a.length)[0];

  return accessMap[bestMatch] || [];
};
export default authorizeRoles