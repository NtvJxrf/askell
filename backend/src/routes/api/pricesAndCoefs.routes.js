import express from "express"
import pricesAndCoefsController from "../../controllers/pricesAndCoefs.controller.js"
import authorizeRoles from "../../middlewares/authorizeRoles.js"
const router = express.Router()
//api/pricesAndCoefs
router
    .route('/getAll')
    .get(authorizeRoles, pricesAndCoefsController.getAll)
router
    .route('/update')
    .post(authorizeRoles, pricesAndCoefsController.update)
router
    .route('/create')
    .post(authorizeRoles, pricesAndCoefsController.create)
router
    .route('/delete')
    .post(authorizeRoles, pricesAndCoefsController.delete)
router
    .route('/bulk')
    .post(authorizeRoles, pricesAndCoefsController.bulk)    
export default router