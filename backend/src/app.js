import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import routes from "./routes/index.js"
import { errorConverter, errorHandler } from "./middlewares/error.middleware.js"
import config from "./config/index.js"
import logger from "./utils/logger.js"
import cookieParser from 'cookie-parser'
import bodyParser from "body-parser"
import { initModels } from "./databases/db.js"
await initModels()

const app = express()


app.use(
  morgan(config.env === "development" ? "dev" : "combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
)
app.use(helmet())
app.use(cookieParser())
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))


app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))
app.set('trust proxy', 'loopback');
app.use('/', routes)
// Error handling
app.use(errorConverter)
app.use(errorHandler)

export default app
