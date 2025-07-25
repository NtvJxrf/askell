import app from "./app.js"
import logger from "./utils/logger.js"
const server = app.listen(process.env.PORT,() => {
  logger.info(`Server running on port ${process.env.PORT}`)
})
export default server
