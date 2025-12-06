import express from "express";
import {
  scheduleBolnaCall,
  scheduleBolnaCallsBatch,
  checkCallsScheduled,
  stopBolnaCall,
  stopAllBolnaCalls,
  getBolnaCallStatus,
  getBolnaCallsByJob,
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

export default router;
