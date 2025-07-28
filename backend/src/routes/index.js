import express from "express"
import apiRoutes from "./api.routes.js"
import path from "path"
import { fileURLToPath } from "url"
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const router = express.Router()

// API routes
router.use(express.static(path.join(__dirname, "../../public")))
router.use("/api", apiRoutes)
router.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/index.html"));
});

export default router
