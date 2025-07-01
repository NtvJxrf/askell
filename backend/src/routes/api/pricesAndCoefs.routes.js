import express from "express"
import pricesAndCoefsController from "../../controllers/pricesAndCoefs.controller.js"
import authorizeRoles from "../../middlewares/authorizeRoles.js"
const router = express.Router()
//api/pricesAndCoefs
router
    .route('/getAll')
    .get(pricesAndCoefsController.getAll)
router
    .route('/update')
    .post(authorizeRoles(['accountant']), pricesAndCoefsController.update)
router
    .route('/create')
    .post(authorizeRoles(['accountant']), pricesAndCoefsController.create)
router
    .route('/delete')
    .post(authorizeRoles(['none']), pricesAndCoefsController.delete)
router
    .route('/bulk')
    .post(authorizeRoles(['accountant']), pricesAndCoefsController.bulk)    
export default router