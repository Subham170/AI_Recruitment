import express from "express";
import { sendMessage, getChatHistory } from "./controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// All chat routes require authentication
router.post("/message", authenticate, sendMessage);
router.get("/history/:sessionId?", authenticate, getChatHistory);

export default router;
