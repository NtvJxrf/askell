import express from "express"
import UserRouter from './api/user.routes.js'
import SkladRouter from './api/sklad.routes.js'
import PricesAndCoefsRouter from './api/pricesAndCoefs.routes.js'
import authMiddleware from "../middlewares/auth.middleware.js"
import UserController from "../controllers/user.controller.js"
const router = express.Router()

//api routes
router
    .route('/isAuthenticated')
    .get(authMiddleware,(req, res) => {
        res.json({ auth: true, user: req.user})
    })
router
    .route('/login')
    .post(UserController.login)
router.use('/user', authMiddleware, UserRouter)
router.use('/sklad', authMiddleware, SkladRouter)
router.use('/pricesAndCoefs', authMiddleware, PricesAndCoefsRouter)
router.use((req, res) => {
    res.status(404).json({ message: "Not Found" })
})

export default router