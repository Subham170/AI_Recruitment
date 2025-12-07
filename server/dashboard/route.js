import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { getDashboardStats, getUserAnalytics } from "./controller.js";

const router = express.Router();

// Get dashboard statistics for all roles
// GET /api/dashboard/stats
router.get("/stats", authenticate, getDashboardStats);

// Get detailed analytics for a specific user
// GET /api/dashboard/analytics/:userId
router.get("/analytics/:userId", authenticate, getUserAnalytics);

export default router;

