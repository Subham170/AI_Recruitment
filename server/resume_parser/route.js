import express from "express";
import { createCandidateData } from "../candidates/controller.js";
import {
  formatParsedResumeData,
  parseResumeFromFile,
  parseResumeFromUrl,
} from "./controller.js";

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
 * - Content-Type: application/octet-stream (raw binary)
 * - Content-Type: multipart/form-data (FormData with 'file' field)
 * - Content-Type: application/json (base64 encoded file)
 */
router.post("/upload", async (req, res) => {
  try {
    let fileBuffer;
    let fileName;

    // Handle multipart/form-data (FormData)
    if (req.headers["content-type"]?.includes("multipart/form-data")) {
      // This will be handled by multer if added, or by express.json() with proper parsing
      // For now, we'll expect the file to be sent as raw binary with filename in header
      return res.status(400).json({
        success: false,
        message:
          "Please send file as application/octet-stream with x-file-name header, or use base64 in JSON body",
      });
    }

    let saveToDatabase = false;

    // Handle application/json with base64
    if (req.headers["content-type"]?.includes("application/json")) {
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
