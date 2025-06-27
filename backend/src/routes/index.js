import express from "express"
import apiRoutes from "./api.routes.js"
import authMiddleware from "../middlewares/auth.middleware.js"
import path from "path"
import { fileURLToPath } from "url"
import UserController from "../controllers/user.controller.js"
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const router = express.Router()

// API routes
router.use(express.static(path.join(__dirname, "../../public")))
router.use("/api", apiRoutes)
router.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/index.html"));
});

export default router
