import express from "express";
import { scheduleBolnaCall, syncBolnaCall } from "./controller.js";

const router = express.Router();

router.post("/schedule-call", scheduleBolnaCall);
router.post("/sync-execution", syncBolnaCall);

export default router;
