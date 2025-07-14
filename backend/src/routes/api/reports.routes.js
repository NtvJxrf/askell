import express from "express"
import ReportsController from '../../controllers/reports.controller.js'
const router = express.Router()
//api/user
router
    .route('/create')
    .post(ReportsController.create)
export default router