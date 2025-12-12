import express from "express";
import {
  getRecruiterTasks,
  getRecruiterTaskStats,
  updateTaskStatus,
} from "./controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all tasks for the current recruiter with optional filters
// Query params: filter (today/week/month), startDate, endDate
router.get("/", getRecruiterTasks);

// Get task statistics for the current recruiter
router.get("/stats", getRecruiterTaskStats);

// Update task status
router.patch("/:taskId/status", updateTaskStatus);

export default router;

