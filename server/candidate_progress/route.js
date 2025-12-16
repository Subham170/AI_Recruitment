import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getOrCreateProgress,
  getProgressByCandidate,
  getProgressByJob,
  updateStage,
} from "./controller.js";

const router = express.Router();

// Get or create progress for a candidate-job pair
router.get(
  "/candidate/:candidateId/job/:jobPostingId",
  authenticate,
  getOrCreateProgress
);

// Update a specific stage
router.put(
  "/candidate/:candidateId/job/:jobPostingId/stage/:stage",
  authenticate,
  updateStage
);

// Get all progress records for a job posting
router.get("/job/:jobPostingId", authenticate, getProgressByJob);

// Get all progress records for a candidate
router.get("/candidate/:candidateId", authenticate, getProgressByCandidate);

export default router;
