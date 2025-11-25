import { generateJobEmbedding } from "../services/embeddingService.js";
import { updateJobMatches } from "../services/matchingService.js";
import JobPosting from "./model.js";

// Create a new job posting
export const createJobPosting = async (req, res) => {
  try {
    const { id, title, description, company, role, ctc, exp_req, skills } =
      req.body;

    // Validate required fields
    if (!id || !title || !description || !company) {
      return res.status(400).json({
        message:
          "Please provide id, title, description, and company (required fields)",
      });
    }

    // Check if job posting with this id already exists
    const existingJobPosting = await JobPosting.findOne({ id });
    if (existingJobPosting) {
      return res.status(400).json({
        message: "Job posting already exists with this id",
      });
    }

    // Validate role if provided
    if (role && Array.isArray(role)) {
      const validRoles = [
        "SDET",
        "QA",
        "DevOps",
        "Frontend",
        "Backend",
        "Full-stack",
      ];
      const invalidRoles = role.filter((r) => !validRoles.includes(r));
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          message: `Invalid role(s): ${invalidRoles.join(
            ", "
          )}. Must be one of: ${validRoles.join(", ")}`,
        });
      }
    }

    // Create job posting
    const jobPosting = await JobPosting.create({
      id,
      title,
      description,
      company,
      role: role || [],
      ctc,
      exp_req: exp_req || 0,
      skills: skills || [],
    });

    // Generate embedding and update job posting
    try {
      const embedding = await generateJobEmbedding(jobPosting);
      jobPosting.vector = embedding;
      await jobPosting.save();

      // Trigger matching process asynchronously (don't wait for it)
      updateJobMatches(jobPosting._id.toString()).catch((matchError) => {
        console.error("Error updating job matches:", matchError);
        // Don't throw - matching can be done later via API
      });
    } catch (embeddingError) {
      // Log error but don't fail the job posting creation
      console.error(
        "Error generating embedding for job posting:",
        embeddingError
      );
      // Continue without embedding - it can be generated later
    }

    res.status(201).json({
      message: "Job posting created successfully",
      jobPosting,
    });
  } catch (error) {
    // Handle duplicate key error (id unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Job posting already exists with this id",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Get all job postings
export const getJobPostings = async (req, res) => {
  try {
    const jobPostings = await JobPosting.find();

    res.status(200).json({
      count: jobPostings.length,
      jobPostings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get job posting by ID
export const getJobPostingById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    if (!isObjectId) {
      return res.status(400).json({
        message: "Invalid job posting ID format",
      });
    }

    const jobPosting = await JobPosting.findById(id);

    if (!jobPosting) {
      return res.status(404).json({
        message: "Job posting not found",
      });
    }

    res.status(200).json(jobPosting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
