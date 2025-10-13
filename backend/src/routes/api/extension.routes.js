import express from "express"
import ExtensionController from "../../controllers/extension.controller.js"
import authorizeRoles from "../../middlewares/authorizeRoles.js"
const router = express.Router()
//api/extension
router
    .route('/logisticRequest')
    .post(authorizeRoles, ExtensionController.logisticRequest)
router
    .route('/reclamationRequest')
    .post(authorizeRoles, ExtensionController.reclamationRequest)
export default router