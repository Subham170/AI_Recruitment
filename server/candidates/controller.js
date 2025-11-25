import { generateCandidateEmbedding } from "../services/embeddingService.js";
import { updateCandidateMatches } from "../services/matchingService.js";
import Candidate from "./model.js";

// Helper function to create candidate (used by both API and seed function)
export const createCandidateData = async (candidateData) => {
  const {
    name,
    email,
    phone_no,
    image,
    skills,
    experience,
    resume_url,
    role,
    bio,
    is_active,
    social_links,
  } = candidateData;

  // Validate required fields
  if (!name || !email) {
    throw new Error("Name and email are required fields");
  }

  // Check if candidate already exists
  const existingCandidate = await Candidate.findOne({ email });
  if (existingCandidate) {
    throw new Error("Candidate already exists with this email");
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
      throw new Error(
        `Invalid role(s): ${invalidRoles.join(
          ", "
        )}. Must be one of: ${validRoles.join(", ")}`
      );
    }
  }

  // Create candidate
  const candidate = await Candidate.create({
    name,
    email,
    phone_no,
    image,
    skills: skills || [],
    experience: experience || 0,
    resume_url,
    role: role || [],
    bio,
    is_active: is_active !== undefined ? is_active : true,
    social_links: social_links || {},
  });

  // Generate embedding and update candidate
  try {
    const embedding = await generateCandidateEmbedding(candidate);
    candidate.vector = embedding;
    await candidate.save();

    // Trigger matching process asynchronously (don't wait for it)
    updateCandidateMatches(candidate._id.toString()).catch((matchError) => {
      console.error("Error updating candidate matches:", matchError);
      // Don't throw - matching can be done later via API
    });
  } catch (embeddingError) {
    // Log error but don't fail the candidate creation
    console.error("Error generating embedding for candidate:", embeddingError);
    // Continue without embedding - it can be generated later
  }

  return candidate;
};

// Create a new candidate
export const createCandidate = async (req, res) => {
  try {
    const {
      name,
      email,
      phone_no,
      image,
      skills,
      experience,
      resume_url,
      role,
      bio,
      is_active,
      social_links,
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        message: "Please provide name and email (required fields)",
      });
    }

    // Use helper function to create candidate
    const candidate = await createCandidateData({
      name,
      email,
      phone_no,
      image,
      skills,
      experience,
      resume_url,
      role,
      bio,
      is_active,
      social_links,
    });

    res.status(201).json({
      message: "Candidate created successfully",
      candidate,
    });
  } catch (error) {
    // Handle duplicate key error (email unique constraint)
    if (error.code === 11000 || error.message.includes("already exists")) {
      return res.status(400).json({
        message: "Candidate already exists with this email",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Import seed function from separate file
export { seedCandidates } from "./seedCandidates.js";

// Get all candidates
export const getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find({ is_active: { $ne: false } });

    res.status(200).json({
      count: candidates.length,
      candidates,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get candidate by ID or email (find one)
export const getCandidateByIdOrEmail = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Check if identifier is a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);

    let candidate;
    if (isObjectId) {
      // Try to find by ID first
      candidate = await Candidate.findById(identifier);
    }

    // If not found by ID or not an ObjectId, try email
    if (!candidate) {
      candidate = await Candidate.findOne({ email: identifier });
    }

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found with the provided ID or email",
      });
    }

    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get candidates by role
export const getCandidatesByRole = async (req, res) => {
  try {
    const { role } = req.params;

    // Validate role
    const validRoles = [
      "SDET",
      "QA",
      "DevOps",
      "Frontend",
      "Backend",
      "Full-stack",
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    // Find candidates with the specified role
    // Since role is an array, we use $in operator to match
    const candidates = await Candidate.find({
      role: { $in: [role] },
      is_active: { $ne: false },
    });

    res.status(200).json({
      count: candidates.length,
      role,
      candidates,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
