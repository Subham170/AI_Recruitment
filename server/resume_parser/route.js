import express from "express";
import { createRequire } from "module";
import { createCandidateData } from "../candidates/controller.js";
import {
  formatParsedResumeData,
  parseResumeFromFile,
  parseResumeFromUrl,
} from "./controller.js";

const require = createRequire(import.meta.url);
const multer = require("multer");

// Configure multer for memory storage (no disk writes)
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
          `Invalid file type. Supported formats: ${allowedExtensions.join(
            ", "
          )}`
        ),
        false
      );
    }
  },
});

const router = express.Router();

/**
 * POST /api/resume-parser/url
 * Parse resume from a publicly accessible URL
 * Body: { url: string, saveToDatabase?: boolean }
 */
router.post("/url", async (req, res) => {
  try {
    const { url, saveToDatabase = false } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    const parsedData = await parseResumeFromUrl(url);
    const formattedData = formatParsedResumeData(parsedData);

    // Validate required fields
    if (!formattedData.name || !formattedData.email) {
      return res.status(400).json({
        success: false,
        message:
          "Required fields missing: Name and Email are required to save candidate",
        data: {
          raw: parsedData,
          formatted: formattedData,
          missingFields: {
            name: !formattedData.name,
            email: !formattedData.email,
          },
        },
      });
    }

    let candidate = null;
    if (saveToDatabase) {
      try {
        candidate = await createCandidateData({
          name: formattedData.name,
          email: formattedData.email,
          phone_no: formattedData.phone_no,
          skills: formattedData.skills,
          experience: formattedData.experience,
          resume_url: url,
          bio: formattedData.bio,
        });
      } catch (dbError) {
        // Handle duplicate email or other DB errors
        if (
          dbError.code === 11000 ||
          dbError.message.includes("already exists")
        ) {
          return res.status(400).json({
            success: false,
            message: "Candidate already exists with this email",
            data: {
              raw: parsedData,
              formatted: formattedData,
            },
          });
        }
        throw dbError;
      }
    }

    res.json({
      success: true,
      message:
        saveToDatabase && candidate
          ? "Resume parsed and candidate saved successfully"
          : "Resume parsed successfully",
      data: {
        raw: parsedData,
        formatted: formattedData,
        candidate: candidate,
      },
    });
  } catch (error) {
    console.error("Error parsing resume from URL:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to parse resume from URL",
    });
  }
});

/**
 * POST /api/resume-parser/upload
 * Parse resume from uploaded file
 * Supports:
 * - Content-Type: multipart/form-data (FormData with 'file' field) - Recommended
 * - Content-Type: application/octet-stream (raw binary)
 * - Content-Type: application/json (base64 encoded file)
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    let fileBuffer;
    let fileName;
    let saveToDatabase = false;

    // Handle multipart/form-data (FormData) - processed by multer
    if (req.file) {
      fileBuffer = req.file.buffer;
      fileName = req.file.originalname || "resume.pdf";
      // Check for saveToDatabase in form data
      saveToDatabase =
        req.body.saveToDatabase === "true" || req.body.saveToDatabase === true;
    } else if (req.headers["content-type"]?.includes("application/json")) {
      // Handle application/json with base64
      const {
        file,
        filename,
        fileName: fileNameAlt,
        saveToDatabase: save,
      } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "File data is required in 'file' field (base64 encoded)",
        });
      }

      // Decode base64
      fileBuffer = Buffer.from(file, "base64");
      fileName = filename || fileNameAlt || "resume.pdf";
      saveToDatabase = save || false;
    } else {
      // Handle application/octet-stream (raw binary)
      fileBuffer = req.body;
      fileName =
        req.headers["x-file-name"] || req.query.filename || "resume.pdf";
      saveToDatabase =
        req.headers["x-save-to-database"] === "true" ||
        req.query.saveToDatabase === "true";
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "File data is required",
      });
    }

    const parsedData = await parseResumeFromFile(fileBuffer, fileName);
    const formattedData = formatParsedResumeData(parsedData);

    // Validate required fields
    if (!formattedData.name || !formattedData.email) {
      return res.status(400).json({
        success: false,
        message:
          "Required fields missing: Name and Email are required to save candidate",
        data: {
          raw: parsedData,
          formatted: formattedData,
          missingFields: {
            name: !formattedData.name,
            email: !formattedData.email,
          },
        },
      });
    }

    let candidate = null;
    if (saveToDatabase) {
      try {
        candidate = await createCandidateData({
          name: formattedData.name,
          email: formattedData.email,
          phone_no: formattedData.phone_no,
          skills: formattedData.skills,
          experience: formattedData.experience,
          resume_url: "", // Would need file upload service
          bio: formattedData.bio,
        });
      } catch (dbError) {
        if (
          dbError.code === 11000 ||
          dbError.message.includes("already exists")
        ) {
          return res.status(400).json({
            success: false,
            message: "Candidate already exists with this email",
            data: {
              raw: parsedData,
              formatted: formattedData,
            },
          });
        }
        throw dbError;
      }
    }

    res.json({
      success: true,
      message:
        saveToDatabase && candidate
          ? "Resume parsed and candidate saved successfully"
          : "Resume parsed successfully",
      data: {
        raw: parsedData,
        formatted: formattedData,
        candidate: candidate,
      },
    });
  } catch (error) {
    console.error("Error parsing resume from file:", error);

    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 10MB limit",
        });
      }
      return res.status(400).json({
        success: false,
        message: error.message || "File upload error",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to parse resume from file",
    });
  }
});

// Separate route for raw binary uploads (application/octet-stream)
router.post(
  "/upload/binary",
  express.raw({ type: "application/octet-stream", limit: "10mb" }),
  async (req, res) => {
    try {
      const fileBuffer = req.body;
      const fileName =
        req.headers["x-file-name"] || req.query.filename || "resume.pdf";

      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: "File data is required",
        });
      }

      const parsedData = await parseResumeFromFile(fileBuffer, fileName);
      const formattedData = formatParsedResumeData(parsedData);
      const saveToDatabase =
        req.headers["x-save-to-database"] === "true" ||
        req.query.saveToDatabase === "true";

      // Validate required fields
      if (!formattedData.name || !formattedData.email) {
        return res.status(400).json({
          success: false,
          message:
            "Required fields missing: Name and Email are required to save candidate",
          data: {
            raw: parsedData,
            formatted: formattedData,
            missingFields: {
              name: !formattedData.name,
              email: !formattedData.email,
            },
          },
        });
      }

      let candidate = null;
      if (saveToDatabase) {
        try {
          candidate = await createCandidateData({
            name: formattedData.name,
            email: formattedData.email,
            phone_no: formattedData.phone_no,
            skills: formattedData.skills,
            experience: formattedData.experience,
            resume_url: "", // Would need file upload service
            bio: formattedData.bio,
          });
        } catch (dbError) {
          if (
            dbError.code === 11000 ||
            dbError.message.includes("already exists")
          ) {
            return res.status(400).json({
              success: false,
              message: "Candidate already exists with this email",
              data: {
                raw: parsedData,
                formatted: formattedData,
              },
            });
          }
          throw dbError;
        }
      }

      res.json({
        success: true,
        message:
          saveToDatabase && candidate
            ? "Resume parsed and candidate saved successfully"
            : "Resume parsed successfully",
        data: {
          raw: parsedData,
          formatted: formattedData,
          candidate: candidate,
        },
      });
    } catch (error) {
      console.error("Error parsing resume from file:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to parse resume from file",
      });
    }
  }
);

/**
 * GET /api/resume-parser/url
 * Parse resume from URL (GET method for testing)
 * Query: ?url=<encoded_url>
 */
router.get("/url", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL query parameter is required",
      });
    }

    const parsedData = await parseResumeFromUrl(url);
    const formattedData = formatParsedResumeData(parsedData);

    res.json({
      success: true,
      data: {
        raw: parsedData,
        formatted: formattedData,
      },
    });
  } catch (error) {
    console.error("Error parsing resume from URL:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to parse resume from URL",
    });
  }
});

export default router;
