import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  checkCallsScheduled,
  getBolnaCallStatus,
  getBolnaCallsByJob,
  getCandidateScreenings,
  scheduleBolnaCall,
  scheduleBolnaCallsBatch,
  stopAllBolnaCalls,
  stopBolnaCall,
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
router.get(
  "/candidate/:candidateId/screenings",
  authenticate,
  getCandidateScreenings
);

export default router;
