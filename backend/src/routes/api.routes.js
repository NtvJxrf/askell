import express from "express"
import UserRouter from './api/user.routes.js'
import SkladRouter from './api/sklad.routes.js'
import PricesAndCoefsRouter from './api/pricesAndCoefs.routes.js'
import adminRouteMiddleware from "../middlewares/adminRoute.middleware.js"
import health from '../utils/health.js'
const router = express.Router()

//api routes
router
    .route('/isAuthenticated')
    .get((req, res) => {
        res.json({ auth: true})
    })
router.use('/user', UserRouter)
router.use('/sklad', SkladRouter)
router.use('/pricesAndCoefs', PricesAndCoefsRouter)
router
    .route('/health')
    .get(adminRouteMiddleware, health)
router.use((req, res) => {
    res.status(404).json({ message: "Not Found" })
})

export default router