import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createOrUpdateAvailability,
  deleteAvailability,
  getAvailabilityByJob,
  getAvailabilityByRecruiter,
  getAvailabilityByRecruiterAndJob,
  updateAvailabilitySlots,
} from "./controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create or update availability for a recruiter and job
router.post("/", createOrUpdateAvailability);

// Get availability for current recruiter and specific job
router.get("/job/:job_id", getAvailabilityByRecruiterAndJob);

// Get all availability for a specific job (all recruiters)
router.get("/job/:job_id/all", getAvailabilityByJob);

// Get all availability for current recruiter (all jobs)
router.get("/recruiter/my-availability", getAvailabilityByRecruiter);

// Update availability slots (add, remove, or update individual slots)
router.patch("/job/:job_id/slots", updateAvailabilitySlots);

// Delete availability for current recruiter and specific job
router.delete("/job/:job_id", deleteAvailability);

export default router;

