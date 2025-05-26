import winston from "winston"

const { combine, timestamp, printf, colorize, align } = winston.format

import path from "path"
import { fileURLToPath } from "url"
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logDirectory = path.join(__dirname, "..", "logs")
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    colorize(),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logDirectory, "error.log"), level: "error" }),
    new winston.transports.File({ filename: path.join(logDirectory, "combined.log") }),
  ],
  exitOnError: false,
})

export default logger