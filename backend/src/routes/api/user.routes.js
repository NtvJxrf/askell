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
    .route('/delete')
    .delete(UserController.delete)
router
    .route('/restoreUser')
    .delete(UserController.restoreUser)
router
    .route('/update')
    .post(UserController.update)
router
    .route('/resetUserPassword')
    .post(UserController.resetUserPassword)
export default router