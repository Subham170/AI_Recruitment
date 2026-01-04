import mongoose from "mongoose";
import Candidate from "../candidates/model.js";
import JobPosting from "../job_posting/model.js";
import { CandidateMatches, JobMatches } from "../matching/model.js";

// Configuration for vector search
const VECTOR_SEARCH_INDEX_CANDIDATE = "candidate_job_posting_index";
const VECTOR_SEARCH_INDEX_JOB = "vector_index";
const VECTOR_SEARCH_LIMIT = 20; // Get top 20 matches for AI Match tab
const MIN_MATCH_SCORE = 0.3; // Minimum similarity score to consider a match
const MAX_MATCHES_TO_STORE = 20; // Maximum matches to store per job/candidate (for AI Match tab)

/**
 * Calculate cosine similarity between two vectors using MongoDB aggregation
 * This works with self-hosted MongoDB (not just Atlas)
 * Formula: cosine_similarity = dotProduct(A, B) / (magnitude(A) * magnitude(B))
 */
function buildCosineSimilarityPipeline(queryVector, vectorField = "vector") {
  // Calculate magnitude of query vector (constant)
  const queryMagnitude = Math.sqrt(
    queryVector.reduce((sum, val) => sum + val * val, 0)
  );

  // Build the dot product calculation by creating an array of products
  // and summing them: sum(vector[i] * queryVector[i] for all i)
  const productExpressions = queryVector.map((val, idx) => ({
    $multiply: [{ $arrayElemAt: [`$${vectorField}`, idx] }, val],
  }));

  return [
    {
      $match: {
        [vectorField]: { $exists: true, $ne: null, $type: "array" },
        $expr: { $eq: [{ $size: `$${vectorField}` }, queryVector.length] },
      },
    },
    {
      $addFields: {
        // Calculate dot product by summing element-wise products
        dotProduct: {
          $sum: productExpressions,
        },
        // Calculate magnitude of document vector
        docMagnitude: {
          $sqrt: {
            $reduce: {
              input: `$${vectorField}`,
              initialValue: 0,
              in: { $add: ["$$value", { $multiply: ["$$this", "$$this"] }] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        // Calculate cosine similarity
        score: {
          $cond: {
            if: { $gt: ["$docMagnitude", 0] },
            then: {
              $divide: ["$dotProduct", { $multiply: [queryMagnitude, "$docMagnitude"] }],
            },
            else: 0,
          },
        },
      },
    },
    {
      $match: {
        score: { $gte: MIN_MATCH_SCORE },
      },
    },
    {
      $sort: { score: -1 },
    },
  ];
}

/**
 * Find matching candidates for a job posting using vector search
 * @param {string} jobPostingId - MongoDB ObjectId of the job posting
 * @param {Object} filters - Optional filters (experience, role, etc.)
 * @returns {Promise<Array>} - Array of { candidateId, matchScore } objects
 */
export async function findMatchingCandidates(jobPostingId, filters = {}) {
  try {
    // Get job posting with vector
    const jobPosting = await JobPosting.findById(jobPostingId).select(
      "+vector"
    );

    if (!jobPosting) {
      throw new Error("Job posting not found");
    }

    if (!jobPosting.vector || jobPosting.vector.length === 0) {
      console.warn(`Job posting ${jobPostingId} has no vector embedding`);
      return [];
    }

    // Get native MongoDB collection for vector search
    const db = mongoose.connection.db;
    const candidatesCollection = db.collection("candidates");

    // Build match filter
    const matchFilter = {};
    if (filters.experience) {
      matchFilter.experience = { $gte: filters.experience };
    }
    if (filters.role && filters.role.length > 0) {
      matchFilter.role = { $in: filters.role };
    }
    if (filters.is_active !== undefined) {
      matchFilter.is_active = filters.is_active;
    }

    // Build cosine similarity pipeline (works with self-hosted MongoDB)
    const pipeline = [
      ...buildCosineSimilarityPipeline(jobPosting.vector, "vector"),
      // Apply additional filters
      {
        $match: matchFilter,
      },
      {
        $project: {
          _id: 1,
          score: 1,
        },
      },
      {
        $limit: VECTOR_SEARCH_LIMIT,
      },
    ];

    // Perform vector search using cosine similarity
    const results = await candidatesCollection.aggregate(pipeline).toArray();

    // Format results and limit to top 10
    return results
      .filter((result) => result.score >= MIN_MATCH_SCORE)
      .slice(0, VECTOR_SEARCH_LIMIT) // Ensure we only return top 10
      .map((result) => ({
        candidateId: result._id,
        matchScore: result.score,
      }));
  } catch (error) {
    console.error("Error finding matching candidates:", error);
    throw error;
  }
}

/**
 * Find matching jobs for a candidate using vector search
 * @param {string} candidateId - MongoDB ObjectId of the candidate
 * @param {Object} filters - Optional filters (exp_req, role, etc.)
 * @returns {Promise<Array>} - Array of { jobId, matchScore } objects
 */
export async function findMatchingJobs(candidateId, filters = {}) {
  try {
    // Get candidate with vector
    const candidate = await Candidate.findById(candidateId).select("+vector");

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    if (!candidate.vector || candidate.vector.length === 0) {
      console.warn(`Candidate ${candidateId} has no vector embedding`);
      return [];
    }

    // Get native MongoDB collection for vector search
    // Use the model's collection name to ensure consistency
    const db = mongoose.connection.db;
    const jobPostingsCollection = db.collection(JobPosting.collection.name);

    // Build match filter
    const matchFilter = {};
    if (filters.exp_req !== undefined) {
      matchFilter.exp_req = { $lte: candidate.experience || 0 };
    }
    if (filters.role && filters.role.length > 0) {
      matchFilter.role = { $in: filters.role };
    }

    // Build cosine similarity pipeline (works with self-hosted MongoDB)
    const pipeline = [
      ...buildCosineSimilarityPipeline(candidate.vector, "vector"),
      // Apply additional filters
      {
        $match: matchFilter,
      },
      {
        $project: {
          _id: 1,
          score: 1,
        },
      },
      {
        $limit: VECTOR_SEARCH_LIMIT,
      },
    ];

    // Perform vector search using cosine similarity
    const results = await jobPostingsCollection.aggregate(pipeline).toArray();

    // Format results and limit to top 10
    return results
      .filter((result) => result.score >= MIN_MATCH_SCORE)
      .slice(0, VECTOR_SEARCH_LIMIT) // Ensure we only return top 10
      .map((result) => ({
        jobId: result._id,
        matchScore: result.score,
      }));
  } catch (error) {
    console.error("Error finding matching jobs:", error);
    throw error;
  }
}

/**
 * Update job matches - finds matching candidates and stores in both collections
 * @param {string} jobPostingId - MongoDB ObjectId of the job posting
 * @param {Object} filters - Optional filters for matching
 * @returns {Promise<Object>} - Updated job matches document
 */
export async function updateJobMatches(jobPostingId, filters = {}) {
  try {
    // Find matching candidates
    const matches = await findMatchingCandidates(jobPostingId, filters);

    // Get existing job matches to preserve status
    const existingJobMatches = await JobMatches.findOne({
      jobId: new mongoose.Types.ObjectId(jobPostingId),
    });

    // Create a map of existing candidate statuses
    const existingStatusMap = new Map();
    if (existingJobMatches && existingJobMatches.matches) {
      existingJobMatches.matches.forEach((match) => {
        const candidateIdStr = match.candidateId.toString();
        existingStatusMap.set(candidateIdStr, match.status || "pending");
      });
    }

    // Format matches for storage and limit to top 20 (for AI Match tab)
    const matchesToStore = matches
      .slice(0, 20) // Top 20 for AI Match tab
      .map((match) => {
        const candidateIdStr = match.candidateId.toString();
        const existingStatus = existingStatusMap.get(candidateIdStr);
        return {
          candidateId: new mongoose.Types.ObjectId(match.candidateId),
          matchScore: match.matchScore,
          matchedAt: new Date(),
          status: existingStatus || "pending", // Preserve existing status or default to pending
        };
      });

    // Update or create job_matches document
    const jobMatches = await JobMatches.findOneAndUpdate(
      { jobId: new mongoose.Types.ObjectId(jobPostingId) },
      {
        jobId: new mongoose.Types.ObjectId(jobPostingId),
        matches: matchesToStore,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update reverse mapping in candidate_matches
    for (const match of matches) {
      const candidateId = match.candidateId;

      // Get existing candidate matches or create new
      let candidateMatches = await CandidateMatches.findOne({
        candidateId: new mongoose.Types.ObjectId(candidateId),
      });

      if (!candidateMatches) {
        candidateMatches = new CandidateMatches({
          candidateId: new mongoose.Types.ObjectId(candidateId),
          matches: [],
        });
      }

      // Add or update this job in candidate's matches
      const existingMatchIndex = candidateMatches.matches.findIndex(
        (m) => m.jobId.toString() === jobPostingId.toString()
      );

      const jobMatch = {
        jobId: new mongoose.Types.ObjectId(jobPostingId),
        matchScore: match.matchScore,
        matchedAt: new Date(),
      };

      if (existingMatchIndex >= 0) {
        candidateMatches.matches[existingMatchIndex] = jobMatch;
      } else {
        candidateMatches.matches.push(jobMatch);
      }

      // Sort by score and limit
      candidateMatches.matches.sort((a, b) => b.matchScore - a.matchScore);
      candidateMatches.matches = candidateMatches.matches.slice(
        0,
        MAX_MATCHES_TO_STORE
      );
      candidateMatches.lastUpdated = new Date();

      await candidateMatches.save();
    }

    return jobMatches;
  } catch (error) {
    console.error("Error updating job matches:", error);
    throw error;
  }
}

/**
 * Update candidate matches - finds matching jobs and stores in both collections
 * @param {string} candidateId - MongoDB ObjectId of the candidate
 * @param {Object} filters - Optional filters for matching
 * @returns {Promise<Object>} - Updated candidate matches document
 */
export async function updateCandidateMatches(candidateId, filters = {}) {
  try {
    // Find matching jobs
    const matches = await findMatchingJobs(candidateId, filters);

    // Format matches for storage
    const matchesToStore = matches.map((match) => ({
      jobId: new mongoose.Types.ObjectId(match.jobId),
      matchScore: match.matchScore,
      matchedAt: new Date(),
    }));

    // Update or create candidate_matches document
    const candidateMatches = await CandidateMatches.findOneAndUpdate(
      { candidateId: new mongoose.Types.ObjectId(candidateId) },
      {
        candidateId: new mongoose.Types.ObjectId(candidateId),
        matches: matchesToStore,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update reverse mapping in job_matches
    for (const match of matches) {
      const jobId = match.jobId;

      // Get existing job matches or create new
      let jobMatches = await JobMatches.findOne({
        jobId: new mongoose.Types.ObjectId(jobId),
      });

      if (!jobMatches) {
        jobMatches = new JobMatches({
          jobId: new mongoose.Types.ObjectId(jobId),
          matches: [],
        });
      }

      // Add or update this candidate in job's matches
      const existingMatchIndex = jobMatches.matches.findIndex(
        (m) => m.candidateId.toString() === candidateId.toString()
      );

      // Preserve existing status if match already exists, otherwise default to "pending"
      const existingStatus =
        existingMatchIndex >= 0
          ? jobMatches.matches[existingMatchIndex].status || "pending"
          : "pending";

      const candidateMatch = {
        candidateId: new mongoose.Types.ObjectId(candidateId),
        matchScore: match.matchScore,
        matchedAt:
          existingMatchIndex >= 0
            ? jobMatches.matches[existingMatchIndex].matchedAt || new Date()
            : new Date(),
        status: existingStatus, // Preserve existing status
      };

      if (existingMatchIndex >= 0) {
        // Preserve the existing status when updating
        jobMatches.matches[existingMatchIndex] = {
          ...jobMatches.matches[existingMatchIndex],
          ...candidateMatch,
          status: existingStatus, // Ensure status is preserved
        };
      } else {
        jobMatches.matches.push(candidateMatch);
      }

      // Sort by score and limit to top 10
      jobMatches.matches.sort((a, b) => b.matchScore - a.matchScore);
      jobMatches.matches = jobMatches.matches.slice(0, VECTOR_SEARCH_LIMIT);
      jobMatches.lastUpdated = new Date();

      await jobMatches.save();
    }

    return candidateMatches;
  } catch (error) {
    console.error("Error updating candidate matches:", error);
    throw error;
  }
}
