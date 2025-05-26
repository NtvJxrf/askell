import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import routes from "./routes/index.js"
import { errorConverter, errorHandler } from "./middlewares/error.middleware.js"
import config from "./config/index.js"
import logger from "./utils/logger.js"
import cookieParser from 'cookie-parser'
import valkey from "./utils/valkey.js"
import rateLimit from 'express-rate-limit';
import ipRangeCheck from 'ip-range-check'
import { initModels } from "./databases/db.js"
await initModels()

const app = express()

import { trustedIps } from "./middlewares/auth.middleware.js"
const limitter = rateLimit({
  windowMs: 5 * 1000,
  max: 20,
  keyGenerator: (req) => req.ip,
  handler: async (req, res) => {
    if(ipRangeCheck(req.ip, trustedIps)) return
    const ip = req.ip;
    await valkey.set(`ban_${ip}`, 'banned', 'EX', 10 * 60);
    res.status(429).send('Too many requests')
  },
});
app.use(
  morgan(config.env === "development" ? "dev" : "combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
)
app.use(async (req, res, next) => {
  const isBanned = await valkey.get(`ban_${req.ip}`)
  if(isBanned) return res.status(429).send('Too many requests')
  next()
})
app.use(limitter)
app.use(helmet())
app.use(cookieParser())
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))


app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.set('trust proxy', 'loopback');
app.use('/', routes)
// Error handling
app.use(errorConverter)
app.use(errorHandler)

export default app
