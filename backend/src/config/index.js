import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })

const env = process.env.NODE_ENV || 'development'

const common = {
  env,
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_ACCESS_SECRET,
    accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES || 30,
    refreshExpirationDays: process.env.JWT_REFRESH_EXPIRATION_DAYS || 30,
  },
}

const configs = {
  development: {
    ...common,
    db: { url: process.env.DATABASE_URL },
  },
  test: {
    ...common,
    db: { url: process.env.DATABASE_URL },
  },
  production: {
    ...common,
    db: {
      url: process.env.DATABASE_URL,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    },
  },
}

export default configs[env]