import express from "express";
import { createRequire } from "module";
import {
  createCandidate,
  deleteCandidate,
  getCandidateByIdOrEmail,
  getCandidates,
  getCandidatesByRole,
  seedCandidates,
  updateCandidate,
} from "./controller.js";

const require = createRequire(import.meta.url);
const multer = require("multer");

// Configure multer for memory storage (for file uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));

    if (
      allowedMimes.includes(file.mimetype) ||
      allowedExtensions.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type. Supported formats: ${allowedExtensions.join(", ")}`
        ),
        false
      );
    }
  },
});

const router = express.Router();

// Seed multiple dummy candidates
router.post("/seed", seedCandidates);

// Create a new candidate (with optional resume file upload)
router.post("/", upload.single("resume"), createCandidate);

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
