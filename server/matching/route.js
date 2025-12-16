import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getCandidateMatches,
  getJobMatches,
  markCandidateAsApplied,
  refreshCandidateMatches,
  refreshJobMatches,
} from "./controller.js";

const router = express.Router();

// Get matching candidates for a job posting
router.get("/job/:jobId/candidates", getJobMatches);

// Get matching jobs for a candidate
router.get("/candidate/:candidateId/jobs", getCandidateMatches);

// Mark a candidate as applied for a job
router.post(
  "/job/:jobId/candidate/:candidateId/apply",
  authenticate,
  markCandidateAsApplied
);

// Manually refresh matches for a job posting
router.post("/job/:jobId/refresh", refreshJobMatches);

// Manually refresh matches for a candidate
router.post("/candidate/:candidateId/refresh", refreshCandidateMatches);

export default router;
