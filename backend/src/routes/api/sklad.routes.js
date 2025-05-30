import express from "express"
import MoySkladController from "../../controllers/moysklad.controller.js"
const router = express.Router()
//api/sklad
router
    .route('/getOrder')
    .get(MoySkladController.getOrder)
router
    .route('/getSelfcost')
    .get(MoySkladController.getSelfcost)
router
    .route('/addPositionsToOrder')
    .post(MoySkladController.addPositionsToOrder)
    
export default router