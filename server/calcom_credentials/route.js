import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  saveApiSecretKey,
  getEventTypes,
  saveEventType,
  getCredentials,
} from "./controller.js";

const router = express.Router();

// Save Cal.com API secret key
router.post("/save-key", authenticate, saveApiSecretKey);

// Get event types from Cal.com
router.get("/:recruiterId/event-types", authenticate, getEventTypes);

// Save event type ID
router.post("/save-event-type", authenticate, saveEventType);

// Get credentials for a recruiter
router.get("/:recruiterId", authenticate, getCredentials);

export default router;

