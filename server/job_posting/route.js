import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  addRecruitersToJobPost,
  createJobPosting,
  getJobPostingById,
  getJobPostings,
  updateJobPosting,
} from "./controller.js";

const router = express.Router();

// Create a new job posting (authenticated)
router.post("/", authenticate, createJobPosting);

// Get all job postings (optional auth - categorizes for recruiters if authenticated)
router.get("/", authenticate, getJobPostings);

// Get job posting by ID
router.get("/:id", authenticate, getJobPostingById);

// Update a job posting (authenticated)
router.put("/:id", authenticate, updateJobPosting);

// Add recruiters to a job posting (authenticated, primary recruiter only)
router.post("/:id/recruiters", authenticate, addRecruitersToJobPost);

export default router;
