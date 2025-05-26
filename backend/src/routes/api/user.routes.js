import express from "express"
import UserController from '../../controllers/user.controller.js'
import adminRouteMiddleware from '../../middlewares/adminRoute.middleware.js'
const router = express.Router()
//api/calc
router
    .route('/createUser')
    .post(adminRouteMiddleware, UserController.createUser)
router
    .route('/getUsers')
    .get(adminRouteMiddleware, UserController.getUsers)
router
    .route('/deleteUser')
    .delete(adminRouteMiddleware, UserController.deleteUser)
router
    .route('/restoreUser')
    .delete(adminRouteMiddleware, UserController.restoreUser)

export default router