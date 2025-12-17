import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  checkCallsScheduled,
  getBolnaCallStatus,
  getBolnaCallsByJob,
  getCandidateScreenings,
  getJobScreenings,
  getJobInterviews,
  scheduleBolnaCall,
  scheduleBolnaCallsBatch,
  stopAllBolnaCalls,
  stopBolnaCall,
  triggerScreening,
  sendEmailManually,
  updateInterviewOutcome,
} from "./controller.js";

const router = express.Router();

router.post("/schedule-call", scheduleBolnaCall);
router.post("/schedule-calls-batch", scheduleBolnaCallsBatch);
router.post("/check-calls", checkCallsScheduled);

// Stop call APIs
router.post("/call/:executionId/stop", stopBolnaCall);
router.post("/job/:jobId/stop-all", stopAllBolnaCalls);

// Get call status APIs
router.get("/call/:executionId/status", getBolnaCallStatus);
router.get("/job/:jobId/calls", getBolnaCallsByJob);
router.get("/job/:jobId/screenings", getJobScreenings);
router.get("/job/:jobId/interviews", getJobInterviews);
router.get(
  "/candidate/:candidateId/screenings",
  authenticate,
  getCandidateScreenings
);

// Screening API
router.post("/call/:executionId/screen", triggerScreening);

// Manual email sending API
router.post("/send-email", sendEmailManually);

// Interview outcome API
router.post("/call/:executionId/outcome", authenticate, updateInterviewOutcome);

export default router;
