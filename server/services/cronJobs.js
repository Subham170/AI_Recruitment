import cron from "node-cron";
import { screeningTranscript } from "../bolna/controller.js";
import BolnaCall from "../bolna/model.js";
import RecruiterAvailability from "../recruiter_availability/model.js";
import JobPosting from "../job_posting/model.js";

// Email-related constants removed - emails are now sent manually via API

// Import Bolna API configuration for fetching execution data
const BOLNA_EXECUTIONS_URL =
  process.env.BOLNA_EXECUTIONS_URL || "https://api.bolna.ai/executions";
const BOLNA_API_KEY = process.env.BOLNA_API_KEY;

// Helper function to fetch execution data from Bolna API
async function fetchBolnaExecution(executionId) {
  const response = await fetch(`${BOLNA_EXECUTIONS_URL}/${executionId}`, {
    headers: {
      Authorization: `Bearer ${BOLNA_API_KEY}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Bolna execution fetch failed with status ${response.status}`
    );
  }

  return data;
}

/**
 * Get all available recruiters (primary and secondary) for a job at a specific time
 * @param {string} jobId - Job ID
 * @param {Date|string} userScheduleAt - Scheduled time to check availability for
 * @returns {Promise<Array>} - Array of recruiter IDs who are available at the specified time
 */
async function getAvailableRecruitersForJob(jobId, userScheduleAt) {
  try {
    // Convert userScheduleAt to Date if it's a string
    const scheduleDate = userScheduleAt instanceof Date 
      ? userScheduleAt 
      : new Date(userScheduleAt);

    if (isNaN(scheduleDate.getTime())) {
      console.error(`Invalid userScheduleAt date: ${userScheduleAt}`);
      return [];
    }

    // Extract date and time components
    const scheduleDateStr = scheduleDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const scheduleTime = scheduleDate.toTimeString().slice(0, 5); // HH:MM
    const scheduleTimeMinutes = scheduleTime.split(':').reduce((h, m) => h * 60 + parseInt(m), 0);

    // Fetch all availabilities for this job
    const availabilities = await RecruiterAvailability.find({
      job_id: jobId,
    }).select("recruiter_id availability_slots");

    if (!availabilities || availabilities.length === 0) {
      return [];
    }

    // Filter recruiters who have availability at the scheduled time
    const availableRecruiterIds = [];

    for (const availability of availabilities) {
      if (!availability.availability_slots || availability.availability_slots.length === 0) {
        continue;
      }

      // Check if any slot matches the scheduled date and time
      const hasMatchingSlot = availability.availability_slots.some((slot) => {
        // Check if slot is available
        if (slot.is_available === false) {
          return false;
        }

        // Check if date matches (compare date strings to ignore time component)
        const slotDateStr = new Date(slot.date).toISOString().split('T')[0];
        if (slotDateStr !== scheduleDateStr) {
          return false;
        }

        // Check if scheduled time falls within the slot's time range
        const slotStartMinutes = slot.start_time.split(':').reduce((h, m) => h * 60 + parseInt(m), 0);
        const slotEndMinutes = slot.end_time.split(':').reduce((h, m) => h * 60 + parseInt(m), 0);

        // Time should be >= start_time and < end_time
        if (scheduleTimeMinutes >= slotStartMinutes && scheduleTimeMinutes < slotEndMinutes) {
          return true;
        }

        return false;
      });

      if (hasMatchingSlot) {
        availableRecruiterIds.push(availability.recruiter_id);
      }
    }

    return availableRecruiterIds;
  } catch (error) {
    console.error(`Error fetching recruiters for job ${jobId}:`, error);
    return [];
  }
}

/**
 * Assign a recruiter using round robin algorithm
 * Falls back to primary recruiter if no recruiters are available at scheduled time
 * @param {string} jobId - Job ID
 * @param {Date|string} userScheduleAt - Scheduled time to check availability for
 * @returns {Promise<string|null>} - Assigned recruiter ID or null if no recruiters available
 */
async function assignRecruiterRoundRobin(jobId, userScheduleAt) {
  try {
    // Get all available recruiters for this job at the scheduled time
    const availableRecruiters = await getAvailableRecruitersForJob(jobId, userScheduleAt);

    if (availableRecruiters.length === 0) {
      console.warn(`No recruiters available for job ${jobId} at scheduled time. Falling back to primary recruiter...`);
      
      // Fallback to primary recruiter
      try {
        const jobPosting = await JobPosting.findById(jobId).select("primary_recruiter_id");
        
        if (jobPosting && jobPosting.primary_recruiter_id) {
          const primaryRecruiterId = jobPosting.primary_recruiter_id;
          console.log(`✅ [Job ${jobId}] Using primary recruiter as fallback: ${primaryRecruiterId}`);
          return primaryRecruiterId;
        } else {
          console.warn(`⚠️ [Job ${jobId}] No primary recruiter found for this job`);
          return null;
        }
      } catch (fallbackError) {
        console.error(`❌ [Job ${jobId}] Error fetching primary recruiter:`, fallbackError.message);
        return null;
      }
    }

    // Count existing assignments for each recruiter for this job
    const assignmentCounts = await BolnaCall.aggregate([
      {
        $match: {
          jobId: jobId,
          assignRecruiter: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$assignRecruiter",
          count: { $sum: 1 },
        },
      },
    ]);

    // Create a map of recruiter ID to assignment count
    const countMap = new Map();
    assignmentCounts.forEach((item) => {
      countMap.set(item._id.toString(), item.count);
    });

    // Find recruiter with minimum assignments (round robin)
    let selectedRecruiter = null;
    let minCount = Infinity;

    for (const recruiterId of availableRecruiters) {
      const recruiterIdStr = recruiterId.toString();
      const count = countMap.get(recruiterIdStr) || 0;

      if (count < minCount) {
        minCount = count;
        selectedRecruiter = recruiterId;
      }
    }

    return selectedRecruiter;
  } catch (error) {
    console.error(`Error assigning recruiter for job ${jobId}:`, error);
    
    // Try fallback to primary recruiter even on error
    try {
      const jobPosting = await JobPosting.findById(jobId).select("primary_recruiter_id");
      if (jobPosting && jobPosting.primary_recruiter_id) {
        console.log(`✅ [Job ${jobId}] Using primary recruiter as fallback after error: ${jobPosting.primary_recruiter_id}`);
        return jobPosting.primary_recruiter_id;
      }
    } catch (fallbackError) {
      console.error(`❌ [Job ${jobId}] Error in fallback to primary recruiter:`, fallbackError.message);
    }
    
    return null;
  }
}

// processSingleCall and processScheduledCalls functions removed - emails are now sent manually via API
// Helper functions (getAvailableRecruitersForJob, assignRecruiterRoundRobin) are kept as they may be useful elsewhere

/**
 * Initialize and start cron jobs
 */
export async function startCronJobs() {
  console.log("🕐 Starting cron jobs...");

  // Email sending cron job removed - emails are now sent manually via API
  // Recruiters select slots and send emails through POST /api/bolna/send-email

  // Screening trigger cron job - runs every minute to check for calls that need screening
  console.log("📅 Setting up screening cron job (pattern: */1 * * * *)...");
  const screeningCronJob = cron.schedule("*/1 * * * *", async () => {
    const runTime = new Date().toISOString();
    console.log(`🔍 [${runTime}] Screening cron job triggered`);
    try {
      const now = new Date();
      // Check for calls that were completed at least 10 minutes ago
      // We want calls that are at least 10 minutes old but not more than 1 hour old (to avoid processing very old calls)
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Find calls that:
      // 1. Have status "completed" (call was completed)
      // 2. Have screeningStatus "pending" (not yet screened)
      // 3. Were updated (completed) at least 10 minutes ago (but not more than 1 hour ago to avoid old calls)
      // 4. Don't have a transcript yet (or have null/empty transcript)
      const callsToProcess = await BolnaCall.find({
        status: "completed",
        screeningStatus: "pending",
        $or: [
          { transcript: { $exists: false } },
          { transcript: null },
          { transcript: "" },
        ],
        updatedAt: {
          $gte: oneHourAgo, // Not more than 1 hour old (upper bound to avoid very old calls)
          $lte: tenMinutesAgo, // At least 10 minutes old (lower bound)
        },
      });

      if (callsToProcess.length > 0) {
        console.log(
          `🔍 Found ${callsToProcess.length} call(s) ready for processing (completed at least 10 minutes ago)`
        );
        console.log(
          `   Current time: ${now.toISOString()}`
        );
        console.log(
          `   Time range: ${oneHourAgo.toISOString()} to ${tenMinutesAgo.toISOString()}`
        );
        callsToProcess.forEach(call => {
          console.log(
            `   - Call ${call.executionId}: updatedAt=${call.updatedAt.toISOString()}, status=${call.status}, screeningStatus=${call.screeningStatus}`
          );
        });
      } else {
        console.log(`ℹ️ No calls found in the 10-minute window (${tenMinutesAgo.toISOString()} to ${oneHourAgo.toISOString()})`);
        // Debug: Check if there are any completed calls with pending screening
        const allPendingCalls = await BolnaCall.find({
          status: "completed",
          screeningStatus: "pending",
        }).limit(5);
        if (allPendingCalls.length > 0) {
          console.log(
            `ℹ️ Found ${allPendingCalls.length} completed calls with pending screening, but none in the 10-minute window`
          );
          allPendingCalls.forEach(call => {
            const minutesAgo = Math.round((now.getTime() - call.updatedAt.getTime()) / (60 * 1000));
            console.log(
              `   - Call ${call.executionId}: updatedAt=${call.updatedAt.toISOString()} (${minutesAgo} minutes ago)`
            );
          });
        } else {
          console.log(`ℹ️ No pending screening calls found at all`);
        }
      }

      if (callsToProcess.length > 0) {
        console.log(
          `🔍 Found ${callsToProcess.length} call(s) ready for processing`
        );

        for (const call of callsToProcess) {
          try {
            // Step 1: Fetch transcript from Bolna API
            console.log(
              `📥 Fetching transcript for executionId: ${call.executionId}`
            );
            let executionData = null;
            let transcript = null;

            try {
              executionData = await fetchBolnaExecution(call.executionId);
              transcript = executionData?.transcript || null;

              // Step 2: Update BolnaCall collection with transcript
              if (transcript && transcript.trim().length > 0) {
                call.transcript = transcript;
                call.status = executionData.status || call.status;
                await call.save();
                console.log(
                  `✅ Transcript updated for executionId: ${call.executionId}`
                );
              } else {
                console.log(
                  `⚠️ No transcript available yet for executionId: ${call.executionId}`
                );
                // Skip screening if no transcript
                continue;
              }
            } catch (fetchError) {
              console.error(
                `❌ Error fetching transcript for ${call.executionId}:`,
                fetchError.message
              );
              // Continue to next call if transcript fetch fails
              continue;
            }

            // Step 3: Trigger screening with the updated transcript
            console.log(
              `📞 Triggering screening for executionId: ${call.executionId}`
            );
            await screeningTranscript(call.executionId);
            console.log(
              `✅ Screening completed for executionId: ${call.executionId}`
            );
          } catch (error) {
            console.error(
              `❌ Error processing call ${call.executionId}:`,
              error.message
            );
            // Continue with other calls even if one fails
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in screening cron job:", error);
      console.error("Error stack:", error.stack);
      // Don't let cron job crash - log and continue
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Explicitly start the cron job (though it should start automatically with scheduled: true)
  if (screeningCronJob) {
    screeningCronJob.start();
    console.log("✅ Screening cron job started and will run every minute");
  } else {
    console.error("❌ Failed to create screening cron job");
  }

  console.log(
    `✅ Cron jobs initialized (email sending removed - use manual API endpoint, screening enabled)`
  );
}
