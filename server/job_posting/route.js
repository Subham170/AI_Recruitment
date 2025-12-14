import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  addRecruitersToJobPost,
  createJobPosting,
  deleteJobPosting,
  getJobPostingById,
  getJobPostings,
  updateJobPosting,
} from "./controller.js";

const router = express.Router();

// Create a new job posting (authenticated)
router.post("/", authenticate, createJobPosting);

// Get all job postings (optional auth - categorizes for recruiters if authenticated)
router.get("/", authenticate, getJobPostings);

// Add recruiters to a job posting (authenticated, primary recruiter only)
// This must come before /:id routes to avoid route conflicts
router.post("/:id/recruiters", authenticate, addRecruitersToJobPost);

// Get job posting by ID
router.get("/:id", authenticate, getJobPostingById);

// Update a job posting (authenticated)
router.put("/:id", authenticate, updateJobPosting);

// Delete a job posting (authenticated, primary recruiter only)
router.delete("/:id", authenticate, deleteJobPosting);

export default router;
