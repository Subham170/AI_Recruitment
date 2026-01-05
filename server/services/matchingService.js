import mongoose from "mongoose";
import Candidate from "../candidates/model.js";
import JobPosting from "../job_posting/model.js";
import { CandidateMatches, JobMatches } from "../matching/model.js";

// Configuration for vector search
const VECTOR_SEARCH_INDEX_CANDIDATE = "candidate_job_posting_index";
const VECTOR_SEARCH_INDEX_JOB = "vector_index";
const VECTOR_SEARCH_LIMIT = 20; // Get top 20 matches for AI Match tab
const MIN_MATCH_SCORE = 0.002; // Minimum similarity score to consider a match (using absolute value for filtering)
// Note: Cosine similarity ranges from -1 (opposite) to 1 (identical)
// Negative scores indicate vectors pointing in opposite directions (very different content)
// We use absolute value for threshold comparison, so both positive and negative scores
// above the threshold (in absolute terms) are included
const MAX_MATCHES_TO_STORE = 20; // Maximum matches to store per job/candidate (for AI Match tab)

/**
 * Calculate cosine similarity between two vectors using MongoDB aggregation
 * This works with self-hosted MongoDB (not just Atlas)
 * Formula: cosine_similarity = dotProduct(A, B) / (magnitude(A) * magnitude(B))
 */
function buildCosineSimilarityPipeline(queryVector, vectorField = "vector") {
  // All vectors are now 1536 dimensions (OpenAI text-embedding-3-large)
  // Calculate magnitude of query vector (constant) - should be 1536 dimensions
  const queryMagnitude = Math.sqrt(
    queryVector.reduce((sum, val) => sum + val * val, 0)
  );

  // Build the dot product calculation
  // Split into smaller chunks to avoid MongoDB expression/complexity limits
  // This prevents the aggregation from failing or only processing the first document
  const CHUNK_SIZE = 50; // Smaller chunks for better compatibility
  const chunks = [];
  for (let i = 0; i < queryVector.length; i += CHUNK_SIZE) {
    const chunk = [];
    for (let j = i; j < Math.min(i + CHUNK_SIZE, queryVector.length); j++) {
      chunk.push({
        $multiply: [
          { $arrayElemAt: [`$${vectorField}`, j] },
          queryVector[j], // Embed the actual value
        ],
      });
    }
    chunks.push({ $sum: chunk });
  }

  return [
    {
      $match: {
        [vectorField]: { $exists: true, $ne: null, $type: "array" },
        // Require vectors to have at least 1536 dimensions (queryVector.length)
        // This ensures we can safely access all indices in the dot product calculation
        $expr: { $gte: [{ $size: `$${vectorField}` }, queryVector.length] },
      },
    },
    {
      $addFields: {
        // Calculate dot product by summing chunks (more efficient than 1536 expressions)
        dotProduct: {
          $sum: chunks,
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
        // Cosine similarity ranges from -1 (opposite) to 1 (identical)
        // Negative values indicate vectors pointing in opposite directions
        rawScore: {
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
      $addFields: {
        // For embeddings, negative scores typically indicate very different content
        // Strategy: Use absolute value for threshold comparison, but prefer positive scores
        // This allows us to catch near-orthogonal vectors (small negatives close to 0)
        // while still filtering out strongly negative scores (very different content)
        absScore: { $abs: "$rawScore" },
        // Keep the original score for display
        // For display purposes, we can clamp negatives to 0 if desired, but keeping raw score
        // allows users to see the true similarity (negative = opposite direction)
        score: "$rawScore",
      },
    },
    {
      $match: {
        // Filter using absolute value for threshold comparison
        // This includes both:
        // - Positive scores >= MIN_MATCH_SCORE (similar content, pointing in same direction)
        // - Negative scores with abs >= MIN_MATCH_SCORE (near-orthogonal, might be somewhat relevant)
        // 
        // Note: For embeddings, negative scores typically indicate very different content.
        // A score of -0.0045 (abs = 0.0045) is very close to 0 (orthogonal/unrelated).
        // If you want to include such small negatives, lower MIN_MATCH_SCORE (e.g., to 0.005).
        // Alternatively, you can filter out all negatives by changing this to: { score: { $gte: MIN_MATCH_SCORE } }
        absScore: { $gte: MIN_MATCH_SCORE },
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

    // Generate vector if missing
    if (!jobPosting.vector || jobPosting.vector.length === 0) {
      console.log(`[findMatchingCandidates] Job posting ${jobPostingId} has no vector, generating...`);
      try {
        const { generateJobEmbedding } = await import("../services/embeddingService.js");
        const embedding = await generateJobEmbedding(jobPosting);
        jobPosting.vector = embedding;
        await JobPosting.findByIdAndUpdate(jobPostingId, { $set: { vector: embedding } });
        console.log(`[findMatchingCandidates] Generated vector for job ${jobPostingId} (${embedding.length} dimensions)`);
      } catch (embedError) {
        console.error(`[findMatchingCandidates] Failed to generate vector for job ${jobPostingId}:`, embedError);
        return [];
      }
    }

    // Get native MongoDB collection for vector search
    const db = mongoose.connection.db;
    const candidatesCollection = db.collection("candidates");

    // Check and regenerate candidate vectors that don't have 1536 dimensions
    const EXPECTED_VECTOR_DIMENSION = 1536;
    const candidatesWithWrongDimensions = await candidatesCollection.find({
      vector: { $exists: true, $ne: null, $type: "array" },
      $expr: { $ne: [{ $size: "$vector" }, EXPECTED_VECTOR_DIMENSION] },
    }).limit(10).toArray(); // Limit to 10 at a time to avoid performance issues
    
    if (candidatesWithWrongDimensions.length > 0) {
      console.log(`[findMatchingCandidates] Found ${candidatesWithWrongDimensions.length} candidates with incorrect vector dimensions. Regenerating...`);
      const { generateCandidateEmbedding } = await import("../services/embeddingService.js");
      
      for (const candidate of candidatesWithWrongDimensions) {
        try {
          const candidateDoc = await Candidate.findById(candidate._id);
          if (candidateDoc) {
            const embedding = await generateCandidateEmbedding(candidateDoc);
            await Candidate.findByIdAndUpdate(candidate._id, { $set: { vector: embedding } });
            console.log(`[findMatchingCandidates] Regenerated vector for candidate ${candidate._id} (${embedding.length} dimensions)`);
          }
        } catch (embedError) {
          console.error(`[findMatchingCandidates] Failed to regenerate vector for candidate ${candidate._id}:`, embedError);
        }
      }
    }

    // Check how many candidates have vectors
    const totalCandidates = await candidatesCollection.countDocuments({});
    const candidatesWithVectors = await candidatesCollection.countDocuments({
      vector: { $exists: true, $ne: null, $type: "array" },
    });
    console.log(`[findMatchingCandidates] Total candidates: ${totalCandidates}, With vectors: ${candidatesWithVectors}`);

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

    // Debug: Test each stage of the pipeline
    console.log(`[findMatchingCandidates] Testing pipeline stages...`);
    
    // Stage 1: Check if candidates pass the initial $match (vector exists and has correct size)
    const stage1Results = await candidatesCollection.aggregate([
      {
        $match: {
          vector: { $exists: true, $ne: null, $type: "array" },
          $expr: { $gte: [{ $size: "$vector" }, jobPosting.vector.length] },
        },
      },
      { $project: { _id: 1, name: 1, vectorSize: { $size: "$vector" } } },
      { $limit: 10 },
    ]).toArray();
    console.log(`[findMatchingCandidates] Stage 1 (size check): ${stage1Results.length} candidates passed`);
    if (stage1Results.length > 0) {
      console.log(`[findMatchingCandidates] Sample candidate vector sizes:`, stage1Results.map(r => ({ id: r._id, name: r.name, size: r.vectorSize })));
    }

    // Build cosine similarity pipeline (works with self-hosted MongoDB)
    const basePipeline = buildCosineSimilarityPipeline(jobPosting.vector, "vector");
    
    // Create a debug pipeline without score filtering to see all calculated scores
    const debugPipeline = [
      ...basePipeline.slice(0, -2), // Remove the score filter and sort (last 2 stages)
      {
        $sort: { score: -1 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          score: 1,
          dotProduct: 1,
          docMagnitude: 1,
        },
      },
      { $limit: 10 },
    ];
    
    // Run debug pipeline first to see all scores
    console.log(`[findMatchingCandidates] Running debug pipeline (without score filter)...`);
    const debugResults = await candidatesCollection.aggregate(debugPipeline).toArray();
    console.log(`[findMatchingCandidates] DEBUG - All scores (before threshold):`, debugResults.map(r => ({ 
      id: r._id, 
      name: r.name,
      score: r.score,
      dotProduct: r.dotProduct,
      docMagnitude: r.docMagnitude 
    })));

    // Now run the actual pipeline with score filter
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
        $limit: VECTOR_SEARCH_LIMIT * 2, // Get more results before final filtering
      },
    ];

    // Debug: Check pipeline stages
    console.log(`[findMatchingCandidates] Pipeline stages: ${pipeline.length}`);
    console.log(`[findMatchingCandidates] Match filter:`, JSON.stringify(matchFilter));
    console.log(`[findMatchingCandidates] MIN_MATCH_SCORE: ${MIN_MATCH_SCORE}`);

    // Perform vector search using cosine similarity
    const results = await candidatesCollection.aggregate(pipeline).toArray();

    console.log(`[findMatchingCandidates] Found ${results.length} candidates with vectors for job ${jobPostingId}`);
    console.log(`[findMatchingCandidates] Query vector dimension: ${jobPosting.vector.length}`);
    
    // Debug: Log all results with scores (even if below threshold)
    if (results.length > 0) {
      console.log(`[findMatchingCandidates] Raw results with scores:`, results.map(r => ({ id: r._id, score: r.score })));
    } else {
      console.log(`[findMatchingCandidates] WARNING: No results found after pipeline. Check debug pipeline results above.`);
    }

    // Format results and limit to top matches
    const formattedResults = results
      .filter((result) => result.score >= MIN_MATCH_SCORE)
      .slice(0, VECTOR_SEARCH_LIMIT)
      .map((result) => ({
        candidateId: result._id,
        matchScore: result.score,
      }));

    console.log(`[findMatchingCandidates] Returning ${formattedResults.length} matches after filtering (min score: ${MIN_MATCH_SCORE})`);
    return formattedResults;
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

    // Generate vector if missing
    if (!candidate.vector || candidate.vector.length === 0) {
      console.log(`[findMatchingJobs] Candidate ${candidateId} has no vector, generating...`);
      try {
        const { generateCandidateEmbedding } = await import("../services/embeddingService.js");
        const embedding = await generateCandidateEmbedding(candidate);
        candidate.vector = embedding;
        await Candidate.findByIdAndUpdate(candidateId, { $set: { vector: embedding } });
        console.log(`[findMatchingJobs] Generated vector for candidate ${candidateId} (${embedding.length} dimensions)`);
      } catch (embedError) {
        console.error(`[findMatchingJobs] Failed to generate vector for candidate ${candidateId}:`, embedError);
        return [];
      }
    }

    // Get native MongoDB collection for vector search
    // Use the model's collection name to ensure consistency
    const db = mongoose.connection.db;
    const jobPostingsCollection = db.collection(JobPosting.collection.name);

    // Check how many jobs have vectors
    const totalJobs = await jobPostingsCollection.countDocuments({});
    const jobsWithVectors = await jobPostingsCollection.countDocuments({
      vector: { $exists: true, $ne: null, $type: "array" },
    });
    console.log(`[findMatchingJobs] Total jobs: ${totalJobs}, With vectors: ${jobsWithVectors}`);

    // Build match filter
    const matchFilter = {};
    if (filters.exp_req !== undefined) {
      matchFilter.exp_req = { $lte: candidate.experience || 0 };
    }
    if (filters.role && filters.role.length > 0) {
      matchFilter.role = { $in: filters.role };
    }

    // Check and regenerate job vectors that don't have 1536 dimensions
    const EXPECTED_VECTOR_DIMENSION = 1536;
    const jobsWithWrongDimensions = await jobPostingsCollection.find({
      vector: { $exists: true, $ne: null, $type: "array" },
      $expr: { $ne: [{ $size: "$vector" }, EXPECTED_VECTOR_DIMENSION] },
    }).toArray();
    
    if (jobsWithWrongDimensions.length > 0) {
      console.log(`[findMatchingJobs] Found ${jobsWithWrongDimensions.length} jobs with incorrect vector dimensions. Regenerating...`);
      const { generateJobEmbedding } = await import("../services/embeddingService.js");
      
      for (const job of jobsWithWrongDimensions) {
        try {
          const jobDoc = await JobPosting.findById(job._id);
          if (jobDoc) {
            const embedding = await generateJobEmbedding(jobDoc);
            await JobPosting.findByIdAndUpdate(job._id, { $set: { vector: embedding } });
            console.log(`[findMatchingJobs] Regenerated vector for job ${job._id} (${embedding.length} dimensions)`);
          }
        } catch (embedError) {
          console.error(`[findMatchingJobs] Failed to regenerate vector for job ${job._id}:`, embedError);
        }
      }
    }

    // Debug: Check job vector dimensions before aggregation
    const sampleJob = await jobPostingsCollection.findOne({ vector: { $exists: true, $ne: null, $type: "array" } });
    if (sampleJob) {
      console.log(`[findMatchingJobs] Sample job vector dimension: ${sampleJob.vector?.length || 'N/A'}`);
      console.log(`[findMatchingJobs] Candidate vector dimension: ${candidate.vector.length}`);
    }

    // Debug: Test each stage of the pipeline
    console.log(`[findMatchingJobs] Testing pipeline stages...`);
    
    // Stage 1: Check if jobs pass the initial $match (vector exists and has correct size)
    const stage1Results = await jobPostingsCollection.aggregate([
      {
        $match: {
          vector: { $exists: true, $ne: null, $type: "array" },
          $expr: { $gte: [{ $size: "$vector" }, candidate.vector.length] },
        },
      },
      { $project: { _id: 1, vectorSize: { $size: "$vector" } } },
      { $limit: 5 },
    ]).toArray();
    console.log(`[findMatchingJobs] Stage 1 (size check): ${stage1Results.length} jobs passed`);
    if (stage1Results.length > 0) {
      console.log(`[findMatchingJobs] Sample job vector sizes:`, stage1Results.map(r => ({ id: r._id, size: r.vectorSize })));
    }

    // Build cosine similarity pipeline (works with self-hosted MongoDB)
    const basePipeline = buildCosineSimilarityPipeline(candidate.vector, "vector");
    
    // Create a debug pipeline without score filtering to see all calculated scores
    const debugPipeline = [
      ...basePipeline.slice(0, -2), // Remove the score filter and sort (last 2 stages)
      {
        $sort: { score: -1 },
      },
      {
        $project: {
          _id: 1,
          score: 1,
          dotProduct: 1,
          docMagnitude: 1,
        },
      },
      { $limit: 5 },
    ];
    
    // Run debug pipeline first to see all scores
    console.log(`[findMatchingJobs] Running debug pipeline (without score filter)...`);
    const debugResults = await jobPostingsCollection.aggregate(debugPipeline).toArray();
    console.log(`[findMatchingJobs] DEBUG - All scores (before threshold):`, debugResults.map(r => ({ 
      id: r._id, 
      score: r.score,
      dotProduct: r.dotProduct,
      docMagnitude: r.docMagnitude 
    })));

    // Now run the actual pipeline with score filter
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
        $limit: VECTOR_SEARCH_LIMIT * 2, // Get more results before final filtering
      },
    ];

    // Debug: Check pipeline stages
    console.log(`[findMatchingJobs] Pipeline stages: ${pipeline.length}`);
    console.log(`[findMatchingJobs] Match filter:`, JSON.stringify(matchFilter));
    console.log(`[findMatchingJobs] MIN_MATCH_SCORE: ${MIN_MATCH_SCORE}`);

    // Perform vector search using cosine similarity
    const results = await jobPostingsCollection.aggregate(pipeline).toArray();

    console.log(`[findMatchingJobs] Found ${results.length} jobs with vectors for candidate ${candidateId}`);
    console.log(`[findMatchingJobs] Query vector dimension: ${candidate.vector.length}`);
    
    // Debug: Log all results with scores (even if below threshold)
    if (results.length > 0) {
      console.log(`[findMatchingJobs] Raw results with scores:`, results.map(r => ({ id: r._id, score: r.score })));
    } else {
      // If no results, check what's happening in the pipeline
      // Try a simpler pipeline to see if vectors exist and match size requirement
      const debugPipeline = [
        {
          $match: {
            vector: { $exists: true, $ne: null, $type: "array" },
          },
        },
        {
          $project: {
            _id: 1,
            vectorSize: { $size: "$vector" },
            vector: 1,
          },
        },
        { $limit: 1 },
      ];
      const debugResults = await jobPostingsCollection.aggregate(debugPipeline).toArray();
      if (debugResults.length > 0) {
        console.log(`[findMatchingJobs] DEBUG - Job vector size: ${debugResults[0].vectorSize}, Required: ${candidate.vector.length}`);
        console.log(`[findMatchingJobs] DEBUG - Size match: ${debugResults[0].vectorSize >= candidate.vector.length}`);
      }
    }

    // Format results and limit to top matches
    const formattedResults = results
      .filter((result) => result.score >= MIN_MATCH_SCORE)
      .slice(0, VECTOR_SEARCH_LIMIT)
      .map((result) => ({
        jobId: result._id,
        matchScore: result.score,
      }));

    console.log(`[findMatchingJobs] Returning ${formattedResults.length} matches after filtering (min score: ${MIN_MATCH_SCORE})`);
    return formattedResults;
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
