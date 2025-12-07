import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { getDashboardStats } from "./controller.js";

const router = express.Router();

// Get dashboard statistics for all roles
// GET /api/dashboard/stats
router.get("/stats", authenticate, getDashboardStats);

export default router;

