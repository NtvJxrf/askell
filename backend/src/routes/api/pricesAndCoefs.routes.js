import express from "express"
import pricesAndCoefsController from "../../controllers/pricesAndCoefs.controller.js"
const router = express.Router()
//api/pricesAndCoefs
router
    .route('/getPricesAndCoefs')
    .get(pricesAndCoefsController.getPricesAndCoefs)
router
    .route('/updatePricesAndCoefs')
    .post(pricesAndCoefsController.updatePricesAndCoefs)
router
    .route('/createPricesAndCoefs')
    .post(pricesAndCoefsController.createPricesAndCoefs)
router
    .route('/deletePricesAndCoefs')
    .post(pricesAndCoefsController.deletePricesAndCoefs)
export default router