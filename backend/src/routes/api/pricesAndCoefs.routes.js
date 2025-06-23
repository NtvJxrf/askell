import express from "express"
import pricesAndCoefsController from "../../controllers/pricesAndCoefs.controller.js"
const router = express.Router()
//api/pricesAndCoefs
router
    .route('/getAll')
    .get(pricesAndCoefsController.getAll)
router
    .route('/update')
    .post(pricesAndCoefsController.update)
router
    .route('/create')
    .post(pricesAndCoefsController.create)
router
    .route('/delete')
    .post(pricesAndCoefsController.delete)
export default router