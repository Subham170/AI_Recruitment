import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getCandidateInterviews,
  getRecruiterTasks,
  getRecruiterTaskStats,
  updateTaskStatus,
  cancelInterview,
  getBookedSlots,
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

// Get booked slots for a recruiter (for filtering availability)
// Query params: jobId (optional)
router.get("/recruiter/:recruiterId/booked-slots", getBookedSlots);

// Update task status
router.patch("/:taskId/status", updateTaskStatus);

// Cancel interview (cancels Cal.com booking and updates task)
router.post("/:taskId/cancel", cancelInterview);

export default router;
