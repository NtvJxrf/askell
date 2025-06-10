import { Sequelize } from "sequelize"
import config from "../config/index.js"
import valkey from "../utils/valkey.js"
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: config.env === "development" ? console.log : false,
  pool: config.db.pool,
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    defaultScope: {
      attributes: {
        exclude: ["createdAt", "updatedAt"],
      },
    },
  },
})
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const models = {}

const loadModels = async (dir) => {
  const items = fs.readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      await loadModels(fullPath)
    } else if (item.name.endsWith('.model.js')) {
      const model = await import('file://' + fullPath)
      models[model.default.name] = model.default
    }
  }
}
const initModels = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.')
    await loadModels(__dirname)
    if(process.env.NODE_ENV === 'development') {
      await sequelize.sync({alter: true})
      await valkey.flushall()
      const admin = await models.User.findOne({where: {username: 'admin'}})
      if(!admin)
        await models.User.create({
          username: 'admin',
          password: 'admin1234',
          creator: null,
          role: 'admin'
        })
    }else{
      await sequelize.sync({alter: true})
    }
    return models
  } catch (error) {
    console.error('Error loading models:', error)
    throw error
  }
}
export { initModels }
export default sequelize