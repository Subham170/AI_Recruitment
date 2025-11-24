import express from "express";
import {
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

export default router;
