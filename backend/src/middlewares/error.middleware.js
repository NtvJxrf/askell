import httpStatus from 'http-status'
import logger from '../utils/logger.js'
import ApiError from '../utils/apiError.js'

export const errorConverter = (err, req, res, next) => {
  console.error(err)
  let error = err
  if (err.name === 'ValidationError') {
    const message = err.message
    error = new ApiError(httpStatus.BAD_REQUEST, message, true, err.stack)
  } else if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR
    const message = error.message || httpStatus[statusCode]
    error = new ApiError(statusCode, message, false, err.stack)
  }
  next(error)
}

export const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err
  
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR]
  }

  res.locals.errorMessage = err.message

  const response = {
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  }

  logger.error(`⛔Request failed: ${req.method} ${req.originalUrl}`, {stack: err.stack, route: req.originalUrl})

  res.status(statusCode).send(response)
}