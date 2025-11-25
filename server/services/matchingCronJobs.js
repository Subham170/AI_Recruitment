import cron from "node-cron";
import JobPosting from "../job_posting/model.js";
import Candidate from "../candidates/model.js";
import {
  updateJobMatches,
  updateCandidateMatches,
} from "./matchingService.js";

const MATCHING_REFRESH_INTERVAL =
  process.env.MATCHING_REFRESH_INTERVAL || "*/5 * * * *"; // Every 5 minutes by default

/**
 * Refresh matches for a single job posting
 * @param {string} jobId - Job posting ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function refreshSingleJobMatches(jobId) {
  try {
    await updateJobMatches(jobId, {});
    return { success: true };
  } catch (error) {
    console.error(
      `❌ [Job ${jobId}] Failed to refresh matches:`,
      error.message
    );
    return { success: false, error: error.message };
  }
}

/**
 * Refresh matches for a single candidate
 * @param {string} candidateId - Candidate ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function refreshSingleCandidateMatches(candidateId) {
  try {
    await updateCandidateMatches(candidateId, {});
    return { success: true };
  } catch (error) {
    console.error(
      `❌ [Candidate ${candidateId}] Failed to refresh matches:`,
      error.message
    );
    return { success: false, error: error.message };
  }
}

/**
 * Refresh all job matches
 */
async function refreshAllJobMatches() {
  const startTime = Date.now();
  let processedCount = 0;
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  try {
    // Get all job postings that have vector embeddings
    const jobPostings = await JobPosting.find({
      vector: { $exists: true, $ne: null },
    })
      .select("_id")
      .lean();

    if (jobPostings.length === 0) {
      console.log("📋 No job postings with vectors found to refresh");
      return;
    }

    console.log(
      `🔄 Refreshing matches for ${jobPostings.length} job posting(s)...`
    );

    // Process jobs sequentially to avoid overwhelming the system
    for (const job of jobPostings) {
      const jobId = job._id.toString();
      processedCount++;

      const result = await refreshSingleJobMatches(jobId);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        // Skip jobs that don't exist or have no vector
        if (
          result.error?.includes("not found") ||
          result.error?.includes("no vector")
        ) {
          skippedCount++;
        }
      }

      // Small delay to prevent overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const duration = Date.now() - startTime;
    console.log(
      `📊 Job matches refresh completed in ${duration}ms: ` +
        `${successCount} succeeded, ${failureCount} failed, ${skippedCount} skipped, ` +
        `${processedCount} total processed`
    );
  } catch (error) {
    console.error("❌ Critical error in refreshAllJobMatches:", error);
    console.error(error.stack);
  }
}

/**
 * Refresh all candidate matches
 */
async function refreshAllCandidateMatches() {
  const startTime = Date.now();
  let processedCount = 0;
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  try {
    // Get all candidates that have vector embeddings and are active
    const candidates = await Candidate.find({
      vector: { $exists: true, $ne: null },
      is_active: true, // Only refresh active candidates
    })
      .select("_id")
      .lean();

    if (candidates.length === 0) {
      console.log("👤 No active candidates with vectors found to refresh");
      return;
    }

    console.log(
      `🔄 Refreshing matches for ${candidates.length} candidate(s)...`
    );

    // Process candidates sequentially to avoid overwhelming the system
    for (const candidate of candidates) {
      const candidateId = candidate._id.toString();
      processedCount++;

      const result = await refreshSingleCandidateMatches(candidateId);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        // Skip candidates that don't exist or have no vector
        if (
          result.error?.includes("not found") ||
          result.error?.includes("no vector")
        ) {
          skippedCount++;
        }
      }

      // Small delay to prevent overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const duration = Date.now() - startTime;
    console.log(
      `📊 Candidate matches refresh completed in ${duration}ms: ` +
        `${successCount} succeeded, ${failureCount} failed, ${skippedCount} skipped, ` +
        `${processedCount} total processed`
    );
  } catch (error) {
    console.error("❌ Critical error in refreshAllCandidateMatches:", error);
    console.error(error.stack);
  }
}

/**
 * Process matching refresh for all jobs and candidates
 */
async function processMatchingRefresh() {
  const overallStartTime = Date.now();

  try {
    console.log("🔄 Starting matching refresh process...");

    // Refresh job matches first
    await refreshAllJobMatches();

    // Then refresh candidate matches
    await refreshAllCandidateMatches();

    const overallDuration = Date.now() - overallStartTime;
    console.log(
      `✅ Matching refresh process completed in ${overallDuration}ms`
    );
  } catch (error) {
    console.error("❌ Critical error in processMatchingRefresh:", error);
    console.error(error.stack);
  }
}

/**
 * Initialize and start matching refresh cron jobs
 */
export async function startMatchingCronJobs() {
  console.log("🔄 Starting matching refresh cron jobs...");

  // Schedule matching refresh job
  // Runs every 5 minutes to refresh all job and candidate matches
  cron.schedule(MATCHING_REFRESH_INTERVAL, async () => {
    const runTime = new Date().toISOString();
    console.log(`🔄 Running matching refresh scheduler at ${runTime}`);

    try {
      await processMatchingRefresh();
    } catch (error) {
      console.error(
        "❌ Unhandled error in matching refresh cron job:",
        error
      );
      // Don't let cron job crash - log and continue
    }
  });

  console.log(
    `✅ Matching refresh cron job scheduled (interval: ${MATCHING_REFRESH_INTERVAL})`
  );
}

/**
 * Manually trigger matching refresh (for testing)
 */
export async function triggerMatchingRefresh() {
  console.log("🔔 Manually triggering matching refresh...");
  await processMatchingRefresh();
}

