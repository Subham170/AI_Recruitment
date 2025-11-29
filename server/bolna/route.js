import express from "express";
import { scheduleBolnaCall, scheduleBolnaCallsBatch, checkCallsScheduled } from "./controller.js";

const router = express.Router();

router.post("/schedule-call", scheduleBolnaCall);
router.post("/schedule-calls-batch", scheduleBolnaCallsBatch);
router.post("/check-calls", checkCallsScheduled);

export default router;
