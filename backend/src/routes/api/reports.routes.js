import express from "express"
import ReportsController from '../../controllers/reports.controller.js'
import authorizeRoles from "../../middlewares/authorizeRoles.js"
const router = express.Router()
//api/reports
router
    .route('/create')
    .post(authorizeRoles, ReportsController.create)
export default router