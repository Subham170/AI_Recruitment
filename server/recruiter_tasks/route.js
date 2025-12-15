import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getCandidateInterviews,
  getRecruiterTasks,
  getRecruiterTaskStats,
  updateTaskStatus,
} from "./controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all tasks for the current recruiter with optional filters
// Query params: filter (today/week/month), startDate, endDate
router.get("/", getRecruiterTasks);

// Get task statistics for the current recruiter
router.get("/stats", getRecruiterTaskStats);

// Get interviews (all tasks) for a specific candidate
router.get("/candidate/:candidateId/interviews", getCandidateInterviews);

// Update task status
router.patch("/:taskId/status", updateTaskStatus);

export default router;
