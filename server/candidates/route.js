import express from "express";
import {
  createCandidate,
  deleteCandidate,
  getCandidateByIdOrEmail,
  getCandidates,
  getCandidatesByRole,
  seedCandidates,
  updateCandidate,
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

// Update a candidate by ID
router.put("/:id", updateCandidate);

// Delete a candidate by ID
router.delete("/:id", deleteCandidate);

// Get candidate by ID or email (must be last to avoid route conflicts)
router.get("/:identifier", getCandidateByIdOrEmail);

export default router;
