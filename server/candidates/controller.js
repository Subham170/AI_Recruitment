import { generateCandidateEmbedding } from "../services/embeddingService.js";
import { updateCandidateMatches } from "../services/matchingService.js";
import Candidate from "./model.js";
import RecruiterTask from "../recruiter_tasks/model.js";

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

  // Role validation removed - now accepts any role values

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
    const vector = await generateCandidateEmbedding(candidate);
    candidate.vector = vector;
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

    let finalResumeUrl = resume_url;

    // If a file was uploaded, upload it to Cloudinary
    if (req.file) {
      try {
        const { uploadToCloudinary } = await import("../services/cloudinaryService.js");
        finalResumeUrl = await uploadToCloudinary(
          req.file.buffer,
          req.file.originalname,
          "resumes"
        );
      } catch (uploadError) {
        console.error("Error uploading resume to Cloudinary:", uploadError);
        return res.status(500).json({
          message: `Failed to upload resume: ${uploadError.message}`,
        });
      }
    }

    // Parse skills and role if they are strings
    let parsedSkills = skills;
    let parsedRole = role;

    if (typeof skills === "string") {
      parsedSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
    }

    if (typeof role === "string") {
      parsedRole = role.split(",").map((r) => r.trim()).filter(Boolean);
    }

    // Use helper function to create candidate
    const candidate = await createCandidateData({
      name,
      email,
      phone_no,
      image,
      skills: parsedSkills,
      experience: experience ? parseInt(experience) : undefined,
      resume_url: finalResumeUrl,
      role: parsedRole,
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

// Get all candidates with pagination
export const getCandidates = async (req, res) => {
  try {
    // Pagination parameters - parse at the start
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default 20 per page
    const skip = (page - 1) * limit;

    // Search parameter
    const { search } = req.query;

    // Build filter query
    const filterQuery = { is_active: { $ne: false } };

    // Search filter (name, email, skills) - general search
    if (search) {
      filterQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { skills: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Get total count for pagination metadata (before pagination)
    const totalCount = await Candidate.countDocuments(filterQuery);

    // Get paginated candidates
    const candidates = await Candidate.find(filterQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get last interview date for each candidate from RecruiterTask (only for current page)
    const candidateIds = candidates.map((c) => c._id);
    
    // Only aggregate if we have candidates in this page
    let lastInterviewMap = {};
    if (candidateIds.length > 0) {
      // Aggregate to get the most recent interview_time for each candidate
      const lastInterviewDates = await RecruiterTask.aggregate([
        {
          $match: {
            candidate_id: { $in: candidateIds },
            status: { $in: ["scheduled", "completed"] }, // Only count scheduled or completed interviews
          },
        },
        {
          $sort: { interview_time: -1 }, // Sort by interview_time descending
        },
        {
          $group: {
            _id: "$candidate_id",
            lastInterviewDate: { $first: "$interview_time" },
          },
        },
      ]);

      // Create a map of candidate_id to lastInterviewDate
      lastInterviewDates.forEach((item) => {
        lastInterviewMap[item._id.toString()] = item.lastInterviewDate;
      });
    }

    // Add lastInterviewDate to each candidate
    const candidatesWithLastInterview = candidates.map((candidate) => ({
      ...candidate,
      lastInterviewDate: lastInterviewMap[candidate._id.toString()] || null,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      candidates: candidatesWithLastInterview,
      pagination: {
        currentPage: page,
        limit: limit,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
      },
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

// Update an existing candidate
export const updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
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
      currentCTC,
      expectedCTC,
      location,
      lookingForJobChange,
      availabilityForInterview,
      joinDate,
      overallNote,
    } = req.body;

    // Find the candidate
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found",
      });
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== candidate.email) {
      const existingCandidate = await Candidate.findOne({ email });
      if (existingCandidate) {
        return res.status(400).json({
          message: "Another candidate already exists with this email",
        });
      }
    }

    // Update candidate fields (only update provided fields)
    if (name !== undefined) candidate.name = name;
    if (email !== undefined) candidate.email = email;
    if (phone_no !== undefined) candidate.phone_no = phone_no;
    if (image !== undefined) candidate.image = image;
    if (skills !== undefined) candidate.skills = skills;
    if (experience !== undefined) candidate.experience = experience;
    if (resume_url !== undefined) candidate.resume_url = resume_url;
    if (role !== undefined) candidate.role = role;
    if (bio !== undefined) candidate.bio = bio;
    if (is_active !== undefined) candidate.is_active = is_active;
    if (social_links !== undefined) candidate.social_links = social_links;
    if (currentCTC !== undefined) candidate.currentCTC = currentCTC;
    if (expectedCTC !== undefined) candidate.expectedCTC = expectedCTC;
    if (location !== undefined) candidate.location = location;
    if (lookingForJobChange !== undefined) candidate.lookingForJobChange = lookingForJobChange;
    if (availabilityForInterview !== undefined) candidate.availabilityForInterview = availabilityForInterview;
    if (joinDate !== undefined) candidate.joinDate = joinDate;
    if (overallNote !== undefined) candidate.overallNote = overallNote;

    // Save the updated candidate
    await candidate.save();

    // Regenerate embedding if relevant fields changed
    const fieldsThatAffectEmbedding = [
      "name",
      "email",
      "skills",
      "experience",
      "role",
      "bio",
    ];
    const hasEmbeddingRelevantChanges = fieldsThatAffectEmbedding.some(
      (field) => req.body[field] !== undefined
    );

    if (hasEmbeddingRelevantChanges) {
      try {
        const vector = await generateCandidateEmbedding(candidate);
        candidate.vector = vector;
        await candidate.save();

        // Trigger matching process asynchronously
        updateCandidateMatches(candidate._id.toString()).catch((matchError) => {
          console.error("Error updating candidate matches:", matchError);
        });
      } catch (embeddingError) {
        console.error(
          "Error regenerating embedding for candidate:",
          embeddingError
        );
        // Continue without updating embedding - it can be regenerated later
      }
    }

    res.status(200).json({
      message: "Candidate updated successfully",
      candidate,
    });
  } catch (error) {
    // Handle duplicate key error (email unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Another candidate already exists with this email",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Delete a candidate
export const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the candidate
    const candidate = await Candidate.findByIdAndDelete(id);

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found",
      });
    }

    res.status(200).json({
      message: "Candidate deleted successfully",
      candidate: {
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
