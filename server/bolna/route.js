import express from "express";
import { scheduleBolnaCall } from "./controller.js";

const router = express.Router();

router.post("/schedule-call", scheduleBolnaCall);

export default router;
