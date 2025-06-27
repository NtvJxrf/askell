import express from "express"
import UserController from '../../controllers/user.controller.js'
import authorizeRoles from '../../middlewares/authorizeRoles.js'
const router = express.Router()
//api/user
router
    .route('/createUser')
    .post(authorizeRoles(['none']), UserController.createUser)
router
    .route('/getUsers')
    .get(UserController.getUsers)
router
    .route('/logout')
    .get(UserController.logout)
router
    .route('/deleteUser')
    .delete(authorizeRoles(['none']), UserController.deleteUser)
router
    .route('/restoreUser')
    .delete(UserController.restoreUser)

export default router