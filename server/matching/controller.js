import {
  updateCandidateMatches,
  updateJobMatches,
} from "../services/matchingService.js";
import { CandidateMatches, JobMatches } from "./model.js";

/**
 * Get matching candidates for a job posting
 * GET /api/matching/job/:jobId/candidates
 */
export const getJobMatches = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { search, status } = req.query; // Add status filter

    // Validate ObjectId format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(jobId);
    if (!isObjectId) {
      return res.status(400).json({
        message: "Invalid job ID format",
      });
    }

    const jobMatches = await JobMatches.findOne({
      jobId: jobId,
    }).populate(
      "matches.candidateId",
      "name email phone_no skills experience bio role"
    );

    if (!jobMatches) {
      return res.status(200).json({
        jobId,
        matches: [],
        totalMatches: 0,
        message: "No matches found for this job posting",
      });
    }

    let matches = jobMatches.matches || [];

    // Apply status filter if provided
    if (status) {
      matches = matches.filter((match) => {
        const matchStatus = match.status || "pending";
        return matchStatus === status;
      });
    }

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      matches = matches.filter((match) => {
        const candidate = match.candidateId;
        if (!candidate) return false;

        const nameMatch = candidate.name?.toLowerCase().includes(searchLower);
        const emailMatch = candidate.email?.toLowerCase().includes(searchLower);
        const skillsMatch = candidate.skills?.some((skill) =>
          skill.toLowerCase().includes(searchLower)
        );

        return nameMatch || emailMatch || skillsMatch;
      });
    }

    res.status(200).json({
      jobId: jobMatches.jobId,
      matches: matches,
      totalMatches: matches.length,
      lastUpdated: jobMatches.lastUpdated,
    });
  } catch (error) {
    console.error("Error getting job matches:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mark a candidate as applied for a job
 * POST /api/matching/job/:jobId/candidate/:candidateId/apply
 */
export const markCandidateAsApplied = async (req, res) => {
  try {
    const { jobId, candidateId } = req.params;

    // Validate ObjectId format
    const isJobIdValid = /^[0-9a-fA-F]{24}$/.test(jobId);
    const isCandidateIdValid = /^[0-9a-fA-F]{24}$/.test(candidateId);

    if (!isJobIdValid || !isCandidateIdValid) {
      return res.status(400).json({
        message: "Invalid job ID or candidate ID format",
      });
    }

    const jobMatches = await JobMatches.findOne({ jobId });

    if (!jobMatches) {
      return res.status(404).json({
        message: "Job matches not found",
      });
    }

    // Find the candidate match and update status
    const matchIndex = jobMatches.matches.findIndex(
      (match) => match.candidateId.toString() === candidateId
    );

    if (matchIndex === -1) {
      return res.status(404).json({
        message: "Candidate match not found for this job",
      });
    }

    // Update status to applied
    jobMatches.matches[matchIndex].status = "applied";
    jobMatches.lastUpdated = new Date();
    await jobMatches.save();

    res.status(200).json({
      message: "Candidate marked as applied successfully",
      jobId: jobMatches.jobId,
      candidateId,
      status: "applied",
    });
  } catch (error) {
    console.error("Error marking candidate as applied:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get matching jobs for a candidate
 * GET /api/matching/candidate/:candidateId/jobs
 */
export const getCandidateMatches = async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Validate ObjectId format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(candidateId);
    if (!isObjectId) {
      return res.status(400).json({
        message: "Invalid candidate ID format",
      });
    }

    const candidateMatches = await CandidateMatches.findOne({
      candidateId: candidateId,
    }).populate(
      "matches.jobId",
      "title description company role skills exp_req ctc"
    );

    if (!candidateMatches) {
      return res.status(200).json({
        candidateId,
        matches: [],
        totalMatches: 0,
        message: "No matches found for this candidate",
      });
    }

    res.status(200).json({
      candidateId: candidateMatches.candidateId,
      matches: candidateMatches.matches,
      totalMatches: candidateMatches.matches.length,
      lastUpdated: candidateMatches.lastUpdated,
    });
  } catch (error) {
    console.error("Error getting candidate matches:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Manually refresh matches for a job posting
 * POST /api/matching/job/:jobId/refresh
 */
export const refreshJobMatches = async (req, res) => {
  try {
    const { jobId } = req.params;
    const filters = req.body.filters || {}; // Optional filters from request body

    // Validate ObjectId format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(jobId);
    if (!isObjectId) {
      return res.status(400).json({
        message: "Invalid job ID format",
      });
    }

    // Update matches
    const jobMatches = await updateJobMatches(jobId, filters);

    res.status(200).json({
      message: "Job matches refreshed successfully",
      jobId: jobMatches.jobId,
      totalMatches: jobMatches.matches.length,
      lastUpdated: jobMatches.lastUpdated,
    });
  } catch (error) {
    console.error("Error refreshing job matches:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Manually refresh matches for a candidate
 * POST /api/matching/candidate/:candidateId/refresh
 */
export const refreshCandidateMatches = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const filters = req.body.filters || {}; // Optional filters from request body

    // Validate ObjectId format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(candidateId);
    if (!isObjectId) {
      return res.status(400).json({
        message: "Invalid candidate ID format",
      });
    }

    // Update matches
    const candidateMatches = await updateCandidateMatches(candidateId, filters);

    res.status(200).json({
      message: "Candidate matches refreshed successfully",
      candidateId: candidateMatches.candidateId,
      totalMatches: candidateMatches.matches.length,
      lastUpdated: candidateMatches.lastUpdated,
    });
  } catch (error) {
    console.error("Error refreshing candidate matches:", error);
    res.status(500).json({ message: error.message });
  }
};
