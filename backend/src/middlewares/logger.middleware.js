import logger from '../utils/logger.js'

export default function loggerMiddleware(req, res, next) {
  const start = Date.now();
  if(req.originalUrl === '/api/isAuthenticated'){
    next()
    return
  }
  logger.info(`➡️ Incoming request: ${req.method} ${req.originalUrl}`);

  const originalEnd = res.end;
  
  res.end = function (...args) {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode}`;

    if (res.statusCode < 400)
      logger.info(`✅ Successful response: ${logMessage}`, { route: req.originalUrl, user: { username: req.user.username, id: req.user.id } || undefined, duration });
    
    originalEnd.apply(this, args);
  };

  next();
}