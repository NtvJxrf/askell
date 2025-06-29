import express from "express"
import UserController from '../../controllers/user.controller.js'
import authorizeRoles from '../../middlewares/authorizeRoles.js'
const router = express.Router()
//api/user
router
    .route('/createUser')
    .post(UserController.createUser)
router
    .route('/getUsers')
    .get(UserController.getUsers)
router
    .route('/deleteUser')
    .delete(UserController.deleteUser)
router
    .route('/restoreUser')
    .delete(UserController.restoreUser)
export default router