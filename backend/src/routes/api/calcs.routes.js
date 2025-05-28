import express from "express"
import CalcsController from "../../controllers/calc.controller.js"

const router = express.Router()
//api/calc
router
    .route('/calculate')
    .post(CalcsController.calculate)
router
    .route('/saveHistory')
    .post(CalcsController.saveHistory)
router
    .route('/getHistory')
    .get(CalcsController.getHistory)
    
export default router