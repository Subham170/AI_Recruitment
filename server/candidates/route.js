import express from "express";
import {
  createCandidate,
  getCandidateByIdOrEmail,
  getCandidates,
  getCandidatesByRole,
  seedCandidates,
} from "./controller.js";

const router = express.Router();

// Seed multiple dummy candidates
router.post("/seed", seedCandidates);

// Create a new candidate
router.post("/", createCandidate);

// Get all candidates
router.get("/", getCandidates);

// Get candidates by role (must be before /:identifier to avoid route conflict)
router.get("/role/:role", getCandidatesByRole);

// Get candidate by ID or email
router.get("/:identifier", getCandidateByIdOrEmail);

export default router;
