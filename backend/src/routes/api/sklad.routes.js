import express from "express"
import MoySkladController from "../../controllers/moysklad.controller.js"
import authorizeRoles from "../../middlewares/authorizeRoles.js"
const router = express.Router()
//api/sklad
router
    .route('/getOrder')
    .get(authorizeRoles, MoySkladController.getOrder)
router
    .route('/getSelfcost')
    .get(authorizeRoles, MoySkladController.getSelfcost)
router
    .route('/addPositionsToOrder')
    .post(authorizeRoles, MoySkladController.addPositionsToOrder)
router
    .route('/createPzHook')
    .post(authorizeRoles, MoySkladController.createPzHook)
router
    .route('/updateSelfcosts')
    .post(authorizeRoles, MoySkladController.updateSelfcosts)
router
    .route('/ordersInWork')
    .get(authorizeRoles, MoySkladController.ordersInWork)
export default router