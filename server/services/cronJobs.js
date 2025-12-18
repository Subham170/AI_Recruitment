import cron from "node-cron";
import { screeningTranscript } from "../bolna/controller.js";
import BolnaCall from "../bolna/model.js";
import { updateProgressFromBolnaCall } from "../candidate_progress/controller.js";

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
      // Find all calls that:
      // 1. Have screeningStatus "pending" (not yet screened)
      // 2. Have an executionId (required to check status via API)
      const pendingCalls = await BolnaCall.find({
        screeningStatus: "pending",
        executionId: { $exists: true, $ne: null },
      });

      if (pendingCalls.length === 0) {
        console.log(`ℹ️ No pending screening calls found`);
        return;
      }

      console.log(
        `🔍 Found ${pendingCalls.length} call(s) with pending screening status`
      );

      // Process each call
      for (const call of pendingCalls) {
        try {
          // Step 1: Check call status via Bolna API using execution-id
          console.log(
            `📡 Checking status for executionId: ${call.executionId}`
          );
          
          let executionData = null;
          try {
            executionData = await fetchBolnaExecution(call.executionId);
          } catch (fetchError) {
            console.error(
              `❌ Error fetching execution data for ${call.executionId}:`,
              fetchError.message
            );
            // Continue to next call if API call fails
            continue;
          }

          // Step 2: Check if status is "completed"
          const apiStatus = executionData?.status;
          console.log(
            `   Status from Bolna API: ${apiStatus} (executionId: ${call.executionId})`
          );

          if (apiStatus !== "completed") {
            console.log(
              `⏭️ Call ${call.executionId} is not completed yet (status: ${apiStatus}), skipping...`
            );
            // Update local status if different
            if (call.status !== apiStatus) {
              call.status = apiStatus;
              await call.save();
            }
            continue;
          }

          // Step 3: Status is "completed", trigger screening
          // The screeningTranscript function will fetch the transcript and process it
          console.log(
            `✅ Call ${call.executionId} is completed. Triggering screening...`
          );
          
          // Get transcript from execution data
          const transcript = executionData?.transcript;
          
          if (transcript && transcript.trim().length > 0) {
            // Update transcript in database before screening
            call.transcript = transcript;
            call.status = "completed";
            await call.save();
            console.log(
              `📝 Transcript updated for executionId: ${call.executionId}`
            );
          }

          // Trigger screening - it will handle fetching transcript and updating progress
          await screeningTranscript(call.executionId);
          console.log(
            `✅ Screening completed for executionId: ${call.executionId}`
          );
          
          // Note: candidate-progress is automatically updated in screeningTranscript function
        } catch (error) {
          console.error(
            `❌ Error processing call ${call.executionId}:`,
            error.message
          );
          // Continue with other calls even if one fails
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
