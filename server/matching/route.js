import express from "express";
import {
  getCandidateMatches,
  getJobMatches,
  refreshCandidateMatches,
  refreshJobMatches,
} from "./controller.js";

const router = express.Router();

// Get matching candidates for a job posting
router.get("/job/:jobId/candidates", getJobMatches);

// Get matching jobs for a candidate
router.get("/candidate/:candidateId/jobs", getCandidateMatches);

// Manually refresh matches for a job posting
router.post("/job/:jobId/refresh", refreshJobMatches);

// Manually refresh matches for a candidate
router.post("/candidate/:candidateId/refresh", refreshCandidateMatches);

export default router;
