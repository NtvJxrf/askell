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
    .route('/changeStatusByDemand')
    .post(authorizeRoles, MoySkladController.changeStatusByDemand)
router
    .route('/updateSelfcosts')
    .post(authorizeRoles, MoySkladController.updateSelfcosts)
router
    .route('/updateSelfcosts/:key')
    .post(authorizeRoles, MoySkladController.updateSelfcostsWithKey)
router
    .route('/ordersInWork')
    .get(authorizeRoles, MoySkladController.ordersInWork)
router
    .route('/pzChanged')
    .get(authorizeRoles, MoySkladController.pzChangedWebhook)
export default router