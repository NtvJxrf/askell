import logger from '../utils/logger.js'

export default function loggerMiddleware(req, res, next) {
  const start = Date.now();

  // Логируем входящий запрос как info
  logger.info(`➡️ Incoming request: ${req.method} ${req.originalUrl}`);

  // Чтобы поймать ошибки, переопределим res.end
  const originalEnd = res.end;
  
  res.end = function (...args) {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (res.statusCode < 400)
      logger.info(`✅ Successful response: ${logMessage}`, { route: req.originalUrl});
    
    originalEnd.apply(this, args);
  };

  next();
}