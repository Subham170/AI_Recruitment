import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  addRecruitersToJobPost,
  createJobPosting,
  getJobPostingById,
  getJobPostings,
} from "./controller.js";

const router = express.Router();

// Create a new job posting
router.post("/", createJobPosting);

// Get all job postings
router.get("/", getJobPostings);

// Get job posting by ID
router.get("/:id", getJobPostingById);

// Add recruiters to a job posting (authenticated, primary recruiter only)
router.post("/:id/recruiters", authenticate, addRecruitersToJobPost);

export default router;
