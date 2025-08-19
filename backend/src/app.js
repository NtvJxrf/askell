import express from "express"
import cors from "cors"
import helmet from "helmet"
import routes from "./routes/index.js"
import { errorConverter, errorHandler } from "./middlewares/error.middleware.js"
import cookieParser from 'cookie-parser'
import { initModels } from "./databases/db.js"
import  loggerMiddleware  from "./middlewares/logger.middleware.js"
import { initQueue } from './utils/rabbitmq.js';
import { initSkladAdditions } from "./utils/skladAdditions.js"
import getOrdersInWork from "./utils/getOrdersInWork.js"

export const version = 1.14
const promises = []
await initModels()
getOrdersInWork().then(() => console.log('Got orders in work'))
promises.push(initSkladAdditions())
promises.push(initQueue())
await Promise.all(promises)
const app = express()

import wss from './utils/WebSocket.js'

app.use(loggerMiddleware)
app.disable('etag');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://calc.askell.ru", "wss://calc.askell.ru:8080"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }
}));
app.use(cookieParser())
app.use(cors({
  origin: ['http://localhost:5173', 'https://calc.askell.ru'],
  credentials: true
}))


app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.set('trust proxy', 'loopback');
app.use('/', routes)
// Error handling
app.use(errorConverter)
app.use(errorHandler)

export default app
