import { generateJobEmbedding } from "../services/embeddingService.js";
import { updateJobMatches } from "../services/matchingService.js";
import JobPosting from "./model.js";

// Create a new job posting
export const createJobPosting = async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      company,
      role,
      ctc,
      exp_req,
      job_type,
      skills,
      secondary_recruiter_id,
    } = req.body;

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

    // Get current user ID from auth middleware
    const currentUserId = req.user?.id;

    // Validate secondary_recruiter_id if provided
    let validSecondaryRecruiters = [];
    if (secondary_recruiter_id && Array.isArray(secondary_recruiter_id)) {
      const invalidIds = secondary_recruiter_id.filter(
        (recId) => !/^[0-9a-fA-F]{24}$/.test(recId)
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({
          message: `Invalid recruiter ID format(s): ${invalidIds.join(", ")}`,
        });
      }
      // Remove current user from secondary recruiters if they added themselves
      validSecondaryRecruiters = secondary_recruiter_id.filter(
        (recId) => recId.toString() !== currentUserId?.toString()
      );
    }

    // Build the job posting data object - ALWAYS include status
    const jobPostingData = {
      id,
      title,
      description,
      company,
      role: role || [],
      ctc: ctc || undefined,
      exp_req: exp_req || 0,
      job_type: job_type || "Full time",
      skills: skills || [],
      primary_recruiter_id: currentUserId || null,
      secondary_recruiter_id: validSecondaryRecruiters,
      status: "draft", // ALWAYS set status to draft when creating
    };

    // Create job posting - status will be saved because it's in the data object
    const jobPosting = await JobPosting.create(jobPostingData);

    // Verify status was saved
    if (!jobPosting.status) {
      // If status is missing, update it directly in the database
      await JobPosting.findByIdAndUpdate(
        jobPosting._id,
        { $set: { status: "draft" } },
        { new: false }
      );
      jobPosting.status = "draft";
    }

    // Generate embedding and update job posting
    try {
      const embedding = await generateJobEmbedding(jobPosting);
      // Use findByIdAndUpdate to ensure status is preserved when updating vector
      await JobPosting.findByIdAndUpdate(
        jobPosting._id,
        { $set: { vector: embedding } },
        { new: false }
      );

      // Trigger matching process asynchronously (don't wait for it)
      updateJobMatches(jobPosting._id.toString()).catch((matchError) => {
        console.error("Error updating job matches:", matchError);
      });
    } catch (embeddingError) {
      // Log error but don't fail the job posting creation
      console.error(
        "Error generating embedding for job posting:",
        embeddingError
      );
    }

    // Fetch fresh from database to ensure we have all fields including status
    const savedJobPosting = await JobPosting.findById(jobPosting._id)
      .populate("primary_recruiter_id", "name email")
      .populate("secondary_recruiter_id", "name email")
      .lean(); // Use lean() to get plain object

    // Ensure status is present in response
    if (!savedJobPosting.status) {
      savedJobPosting.status = "draft";
    }

    res.status(201).json({
      message: "Job posting created successfully",
      jobPosting: savedJobPosting,
    });
  } catch (error) {
    // Handle duplicate key error (id unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Job posting already exists with this id",
      });
    }
    console.error("Error creating job posting:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all job postings
export const getJobPostings = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    // Extract filter parameters from query
    const {
      search,
      job_type,
      role,
      min_exp,
      max_exp,
      min_ctc,
      max_ctc,
      company,
      skills,
      date_from,
      date_to,
    } = req.query;

    // Build filter query
    const filterQuery = {};

    // Search filter (title, description, company)
    if (search) {
      filterQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    // Job type filter
    if (job_type) {
      filterQuery.job_type = job_type;
    }

    // Role filter (array contains)
    if (role) {
      const roleArray = Array.isArray(role) ? role : [role];
      filterQuery.role = { $in: roleArray };
    }

    // Experience filter
    if (min_exp !== undefined || max_exp !== undefined) {
      filterQuery.exp_req = {};
      if (min_exp !== undefined) {
        filterQuery.exp_req.$gte = parseFloat(min_exp);
      }
      if (max_exp !== undefined) {
        filterQuery.exp_req.$lte = parseFloat(max_exp);
      }
    }

    // Company filter
    if (company) {
      filterQuery.company = { $regex: company, $options: "i" };
    }

    // Skills filter (array contains any of the provided skills)
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filterQuery.skills = {
        $in: skillsArray.map(
          (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        ),
      };
    }

    // Date range filter
    if (date_from || date_to) {
      filterQuery.createdAt = {};
      if (date_from) {
        filterQuery.createdAt.$gte = new Date(date_from);
      }
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        filterQuery.createdAt.$lte = endDate;
      }
    }

    // If user is a recruiter, categorize jobs
    if (userRole === "recruiter" && currentUserId) {
      let allJobPostings = await JobPosting.find(filterQuery)
        .populate("primary_recruiter_id", "name email")
        .populate("secondary_recruiter_id", "name email")
        .sort({ createdAt: -1 })
        .lean();

      // Apply CTC filter in JavaScript if needed
      if (min_ctc !== undefined || max_ctc !== undefined) {
        allJobPostings = allJobPostings.filter((job) => {
          if (!job.ctc) return false;
          const ctcMatch = job.ctc.match(/(\d+\.?\d*)/);
          if (!ctcMatch) return false;
          const ctcValue = parseFloat(ctcMatch[1]);
          if (min_ctc !== undefined && ctcValue < parseFloat(min_ctc))
            return false;
          if (max_ctc !== undefined && ctcValue > parseFloat(max_ctc))
            return false;
          return true;
        });
      }

      // Ensure all jobs have status field
      allJobPostings.forEach((job) => {
        if (!job.status) {
          job.status = "draft";
        }
      });

      const userIdStr = currentUserId.toString();

      // Categorize jobs
      const myJobPostings = allJobPostings.filter(
        (job) =>
          job.primary_recruiter_id &&
          (job.primary_recruiter_id._id?.toString() === userIdStr ||
            job.primary_recruiter_id.toString() === userIdStr)
      );

      const secondaryJobPostings = allJobPostings.filter(
        (job) =>
          job.secondary_recruiter_id &&
          Array.isArray(job.secondary_recruiter_id) &&
          job.secondary_recruiter_id.some(
            (recruiter) =>
              recruiter._id?.toString() === userIdStr ||
              recruiter.toString() === userIdStr
          )
      );

      const remainingJobPostings = allJobPostings.filter((job) => {
        const isPrimary =
          job.primary_recruiter_id &&
          (job.primary_recruiter_id._id?.toString() === userIdStr ||
            job.primary_recruiter_id.toString() === userIdStr);
        const isSecondary =
          job.secondary_recruiter_id &&
          Array.isArray(job.secondary_recruiter_id) &&
          job.secondary_recruiter_id.some(
            (recruiter) =>
              recruiter._id?.toString() === userIdStr ||
              recruiter.toString() === userIdStr
          );
        return !isPrimary && !isSecondary;
      });

      return res.status(200).json({
        count: allJobPostings.length,
        myJobPostings,
        secondaryJobPostings,
        remainingJobPostings,
        allJobPostings,
      });
    }

    // For admin, manager, or unauthenticated users, return all jobs
    let jobPostings = await JobPosting.find(filterQuery)
      .populate("primary_recruiter_id", "name email")
      .populate("secondary_recruiter_id", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Apply CTC filter in JavaScript if needed
    if (min_ctc !== undefined || max_ctc !== undefined) {
      jobPostings = jobPostings.filter((job) => {
        if (!job.ctc) return false;
        const ctcMatch = job.ctc.match(/(\d+\.?\d*)/);
        if (!ctcMatch) return false;
        const ctcValue = parseFloat(ctcMatch[1]);
        if (min_ctc !== undefined && ctcValue < parseFloat(min_ctc))
          return false;
        if (max_ctc !== undefined && ctcValue > parseFloat(max_ctc))
          return false;
        return true;
      });
    }

    // Ensure all jobs have status field
    jobPostings.forEach((job) => {
      if (!job.status) {
        job.status = "draft";
      }
    });

    res.status(200).json({
      count: jobPostings.length,
      jobPostings,
    });
  } catch (error) {
    console.error("Error getting job postings:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get job posting by ID
export const getJobPostingById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isObjectId) {
      return res.status(400).json({
        message: "Invalid job posting ID format",
      });
    }

    const jobPosting = await JobPosting.findById(id)
      .populate("primary_recruiter_id", "name email")
      .populate("secondary_recruiter_id", "name email")
      .lean(); // Use lean() to get plain object

    if (!jobPosting) {
      return res.status(404).json({
        message: "Job posting not found",
      });
    }

    // Ensure status is always present (default to draft if missing)
    if (!jobPosting.status) {
      // Update the database to add missing status
      await JobPosting.findByIdAndUpdate(
        id,
        { $set: { status: "draft" } },
        { new: false }
      );
      jobPosting.status = "draft";
    }

    res.status(200).json(jobPosting);
  } catch (error) {
    console.error("Error getting job posting by ID:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update a job posting
export const updateJobPosting = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      company,
      role,
      ctc,
      exp_req,
      job_type,
      skills,
      secondary_recruiter_id,
      status,
    } = req.body;

    // Check if id is a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isObjectId) {
      return res.status(400).json({
        message: "Invalid job posting ID format",
      });
    }

    // Find the job posting
    const jobPosting = await JobPosting.findById(id);
    if (!jobPosting) {
      return res.status(404).json({
        message: "Job posting not found",
      });
    }

    // Verify that the current user has permission to update
    // Admin and Manager can update any job posting
    // Recruiters can only update their own (primary or secondary)
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;
    const currentUserIdStr = currentUserId?.toString();

    // Admin and Manager have full access
    if (userRole !== "admin" && userRole !== "manager") {
      // For recruiters, check if they are primary or secondary recruiter
      if (
        jobPosting.primary_recruiter_id ||
        jobPosting.secondary_recruiter_id?.length > 0
      ) {
        const primaryRecruiterId = jobPosting.primary_recruiter_id?.toString();
        const isPrimary = primaryRecruiterId === currentUserIdStr;

        const isSecondary = jobPosting.secondary_recruiter_id?.some(
          (recruiterId) => {
            const recruiterIdStr =
              recruiterId._id?.toString() || recruiterId.toString();
            return recruiterIdStr === currentUserIdStr;
          }
        );

        if (!isPrimary && !isSecondary) {
          return res.status(403).json({
            message:
              "Only the primary or secondary recruiter can update this job posting",
          });
        }
      }
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

    // Validate status if provided
    if (status !== undefined && status !== null && status !== "") {
      const validStatuses = ["draft", "open", "closed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        });
      }
    }

    // Validate and process secondary_recruiter_id if provided
    let processedSecondaryRecruiters = undefined;
    if (secondary_recruiter_id !== undefined) {
      if (Array.isArray(secondary_recruiter_id)) {
        const invalidIds = secondary_recruiter_id.filter(
          (recId) => !/^[0-9a-fA-F]{24}$/.test(recId)
        );
        if (invalidIds.length > 0) {
          return res.status(400).json({
            message: `Invalid recruiter ID format(s): ${invalidIds.join(", ")}`,
          });
        }
        // Remove primary recruiter and current user from secondary recruiters
        const primaryId = jobPosting.primary_recruiter_id?.toString();
        processedSecondaryRecruiters = secondary_recruiter_id.filter(
          (recId) =>
            recId.toString() !== primaryId &&
            recId.toString() !== currentUserId?.toString()
        );
      } else {
        return res.status(400).json({
          message: "secondary_recruiter_id must be an array",
        });
      }
    }

    // Build update object - only include fields that are being updated
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (company !== undefined) updateData.company = company;
    if (role !== undefined) updateData.role = role;
    if (ctc !== undefined) updateData.ctc = ctc;
    if (exp_req !== undefined) updateData.exp_req = exp_req;
    if (job_type !== undefined) updateData.job_type = job_type;
    if (skills !== undefined) updateData.skills = skills;
    if (processedSecondaryRecruiters !== undefined)
      updateData.secondary_recruiter_id = processedSecondaryRecruiters;

    // CRITICAL: Always update status if provided, or ensure it exists
    if (status !== undefined && status !== null && status !== "") {
      updateData.status = status;
    } else if (!jobPosting.status) {
      // If status is missing from existing job, set it to draft
      updateData.status = "draft";
    }

    // Update using findByIdAndUpdate to ensure atomic update
    const updatedJobPosting = await JobPosting.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("primary_recruiter_id", "name email")
      .populate("secondary_recruiter_id", "name email");

    if (!updatedJobPosting) {
      return res.status(404).json({
        message: "Job posting not found after update",
      });
    }

    // Regenerate embedding if job details changed (only if non-status fields changed)
    if (
      title !== undefined ||
      description !== undefined ||
      company !== undefined ||
      role !== undefined ||
      skills !== undefined
    ) {
      try {
        const embedding = await generateJobEmbedding(updatedJobPosting);
        // Update vector without affecting status
        await JobPosting.findByIdAndUpdate(
          id,
          { $set: { vector: embedding } },
          { new: false }
        );

        // Trigger matching process asynchronously
        updateJobMatches(updatedJobPosting._id.toString()).catch(
          (matchError) => {
            console.error("Error updating job matches:", matchError);
          }
        );
      } catch (embeddingError) {
        console.error(
          "Error generating embedding for job posting:",
          embeddingError
        );
      }
    }

    // Fetch fresh from database to ensure we have the latest data
    const finalJobPosting = await JobPosting.findById(id)
      .populate("primary_recruiter_id", "name email")
      .populate("secondary_recruiter_id", "name email")
      .lean(); // Use lean() to get plain object

    // Ensure status is in the response
    if (!finalJobPosting.status) {
      finalJobPosting.status = status || "draft";
    }

    res.status(200).json({
      message: "Job posting updated successfully",
      jobPosting: finalJobPosting,
    });
  } catch (error) {
    console.error("Error updating job posting:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a job posting (permanent deletion)
export const deleteJobPosting = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isObjectId) {
      return res.status(400).json({
        message: "Invalid job posting ID format",
      });
    }

    // Find the job posting
    const jobPosting = await JobPosting.findById(id);
    if (!jobPosting) {
      return res.status(404).json({
        message: "Job posting not found",
      });
    }

    // Verify that the current user has permission to delete
    // Admin and Manager can delete any job posting
    // Only primary recruiter can delete their own job postings
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;
    const currentUserIdStr = currentUserId?.toString();

    // Admin and Manager have full access to delete
    if (userRole !== "admin" && userRole !== "manager") {
      // For recruiters, only primary recruiter can delete
      if (jobPosting.primary_recruiter_id) {
        const primaryRecruiterId = jobPosting.primary_recruiter_id.toString();
        if (primaryRecruiterId !== currentUserIdStr) {
          return res.status(403).json({
            message: "Only the primary recruiter can delete this job posting",
          });
        }
      }
    }

    // Delete the job posting
    await JobPosting.findByIdAndDelete(id);

    res.status(200).json({
      message: "Job posting deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting job posting:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add recruiters to a job posting (only primary recruiter can add)
export const addRecruitersToJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { recruiter_ids } = req.body;
    const currentUserId = req.user?.id;

    // Validate input
    if (
      !recruiter_ids ||
      !Array.isArray(recruiter_ids) ||
      recruiter_ids.length === 0
    ) {
      return res.status(400).json({
        message: "Please provide recruiter_ids as a non-empty array",
      });
    }

    // Check if id is a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isObjectId) {
      return res.status(400).json({
        message: "Invalid job posting ID format",
      });
    }

    // Find the job posting
    const jobPosting = await JobPosting.findById(id);
    if (!jobPosting) {
      return res.status(404).json({
        message: "Job posting not found",
      });
    }

    // Verify that the current user is the primary recruiter
    if (!jobPosting.primary_recruiter_id) {
      return res.status(400).json({
        message: "This job posting does not have a primary recruiter assigned",
      });
    }

    const primaryRecruiterId = jobPosting.primary_recruiter_id.toString();
    const currentUserIdStr = currentUserId?.toString();

    if (primaryRecruiterId !== currentUserIdStr) {
      return res.status(403).json({
        message:
          "Only the primary recruiter can add other recruiters to this job posting",
      });
    }

    // Validate all recruiter IDs are valid ObjectIds
    const invalidIds = recruiter_ids.filter(
      (recId) => !/^[0-9a-fA-F]{24}$/.test(recId)
    );
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: `Invalid recruiter ID format(s): ${invalidIds.join(", ")}`,
      });
    }

    // Check if any recruiter ID is the same as primary recruiter
    const isPrimaryRecruiter = recruiter_ids.some(
      (recId) => recId.toString() === primaryRecruiterId
    );
    if (isPrimaryRecruiter) {
      return res.status(400).json({
        message: "Cannot add primary recruiter to secondary recruiters list",
      });
    }

    // Add new recruiters to secondary_recruiter_id array (avoid duplicates)
    const existingSecondaryRecruiters = jobPosting.secondary_recruiter_id.map(
      (id) => id.toString()
    );
    const newRecruiters = recruiter_ids.filter(
      (recId) => !existingSecondaryRecruiters.includes(recId.toString())
    );

    if (newRecruiters.length === 0) {
      return res.status(400).json({
        message:
          "All provided recruiters are already added to this job posting",
      });
    }

    // Add new recruiters using findByIdAndUpdate
    await JobPosting.findByIdAndUpdate(
      id,
      { $push: { secondary_recruiter_id: { $each: newRecruiters } } },
      { new: false }
    );

    // Fetch updated job posting with populated fields
    const updatedJobPosting = await JobPosting.findById(id)
      .populate("primary_recruiter_id", "name email")
      .populate("secondary_recruiter_id", "name email")
      .lean();

    res.status(200).json({
      message: `Successfully added ${newRecruiters.length} recruiter(s) to the job posting`,
      jobPosting: updatedJobPosting,
      addedRecruiters: newRecruiters,
      skippedRecruiters: recruiter_ids.length - newRecruiters.length,
    });
  } catch (error) {
    console.error("Error adding recruiters to job post:", error);
    res.status(500).json({ message: error.message });
  }
};
