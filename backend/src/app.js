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
const promises = []
promises.push(getOrdersInWork())
promises.push(initModels())
promises.push(initSkladAdditions())
promises.push(initQueue())
await Promise.all(promises)
const app = express()

app.use(loggerMiddleware)
app.disable('etag');
app.use(helmet())
app.use(cookieParser())
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))


app.use(express.json({ limit: '15mb' }))
app.use(express.urlencoded({ extended: true, limit: '15mb' }))
app.set('trust proxy', 'loopback');
app.use('/', routes)
// Error handling
app.use(errorConverter)
app.use(errorHandler)

export default app
