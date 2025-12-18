import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getOrCreateProgress,
  getProgressByCandidate,
  getProgressByJob,
} from "./controller.js";

const router = express.Router();

// Get or create progress for a candidate-job pair
router.get(
  "/candidate/:candidateId/job/:jobPostingId",
  authenticate,
  getOrCreateProgress
);

// Update stage route removed - progress is now automatically updated from BolnaCall updates
// Progress can only be viewed, not manually changed

// Get all progress records for a job posting
router.get("/job/:jobPostingId", authenticate, getProgressByJob);

// Get all progress records for a candidate
router.get("/candidate/:candidateId", authenticate, getProgressByCandidate);

export default router;
