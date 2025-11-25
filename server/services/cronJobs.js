import cron from "node-cron";
import BolnaCall from "../bolna/model.js";
import { sendEmail, verifyEmailConfig } from "./emailService.js";
import Candidate from "../candidates/model.js";
import { syncBolnaCall } from "../bolna/controller.js";

const SENDER_EMAIL = process.env.SENDER_EMAIL || "admin@gmail.com";
const CRON_INTERVAL = process.env.EMAIL_CRON_INTERVAL || "*/1 * * * *"; // Every minute by default
const EMAIL_WINDOW_MINUTES = parseInt(process.env.EMAIL_WINDOW_MINUTES || "2", 10); // 2 minute window by default
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_EMAIL_RETRY_ATTEMPTS || "3", 10);
// Note: PROCESSING_LOCK_TIMEOUT removed - using fresh DB check instead

/**
 * Process a single call and send email
 * @param {Object} call - BolnaCall document
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function processSingleCall(call) {
  const callId = call._id.toString();
  
  try {
    // Validate required fields
    const { candidateId, jobId, executionId } = call;
    
    if (!candidateId || !jobId || !executionId) {
      const missingFields = [];
      if (!candidateId) missingFields.push("candidateId");
      if (!jobId) missingFields.push("jobId");
      if (!executionId) missingFields.push("executionId");
      
      console.error(
        `❌ [Call ${callId}] Missing required fields: ${missingFields.join(", ")}`
      );
      return { success: false, error: `Missing fields: ${missingFields.join(", ")}` };
    }

    // Fetch candidate with error handling
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      console.error(`❌ [Call ${callId}] Candidate not found: ${candidateId}`);
      return { success: false, error: "Candidate not found" };
    }

    if (!candidate.email) {
      console.error(`❌ [Call ${callId}] Candidate has no email address`);
      return { success: false, error: "Candidate email missing" };
    }

    // Sync with Bolna API to get userScheduledAt
    let userScheduledAt;
    try {
      const syncResult = await syncBolnaCall(executionId);
      userScheduledAt = syncResult?.storedRecord?.userScheduledAt;
      
      if (!userScheduledAt) {
        console.warn(
          `⚠️ [Call ${callId}] userScheduledAt not found in transcript. Will retry on next run.`
        );
        return { success: false, error: "userScheduledAt not available yet" };
      }
    } catch (syncError) {
      console.error(
        `❌ [Call ${callId}] Failed to sync with Bolna API:`,
        syncError.message
      );
      return { success: false, error: `Sync failed: ${syncError.message}` };
    }

    // Send email
    try {
      await sendEmail(candidate.email, SENDER_EMAIL, userScheduledAt);
      
      // Mark email as sent atomically
      await BolnaCall.findByIdAndUpdate(callId, {
        emailSent: true,
        emailSentAt: new Date(),
        emailRetryCount: 0, // Reset retry count on success
      });

      console.log(
        `✅ [Call ${callId}] Email sent successfully to ${candidate.email}`
      );
      return { success: true };
    } catch (emailError) {
      // Increment retry count
      const retryCount = (call.emailRetryCount || 0) + 1;
      await BolnaCall.findByIdAndUpdate(callId, {
        emailRetryCount: retryCount,
        lastEmailError: emailError.message,
        lastEmailErrorAt: new Date(),
      });

      console.error(
        `❌ [Call ${callId}] Failed to send email (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}):`,
        emailError.message
      );
      
      // If max retries exceeded, mark as failed permanently
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        await BolnaCall.findByIdAndUpdate(callId, {
          emailFailed: true,
          emailFailedAt: new Date(),
        });
        console.error(
          `🚫 [Call ${callId}] Max retry attempts reached. Email sending permanently failed.`
        );
      }
      
      return { success: false, error: emailError.message };
    }
  } catch (error) {
    console.error(`❌ [Call ${callId}] Unexpected error:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process scheduled calls and send emails
 */
async function processScheduledCalls() {
  const startTime = Date.now();
  let processedCount = 0;
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  try {
    const now = new Date();
    // Extended window to catch calls that might have been missed
    const windowStart = new Date(now.getTime() - EMAIL_WINDOW_MINUTES * 60 * 1000);
    const windowEnd = new Date(now.getTime() + EMAIL_WINDOW_MINUTES * 60 * 1000);

    // Find calls that need email processing
    // Exclude: already sent, failed permanently, or exceeded retry limit
    const callsToProcess = await BolnaCall.find({
      callScheduledAt: {
        $gte: windowStart,
        $lte: windowEnd,
      },
      emailSent: { $ne: true }, // Not already sent
      emailFailed: { $ne: true }, // Not permanently failed
      $or: [
        { emailRetryCount: { $exists: false } }, // Never tried
        { emailRetryCount: { $lt: MAX_RETRY_ATTEMPTS } }, // Under retry limit
      ],
    })
      .populate("candidateId", "email") // Only populate email field for efficiency
      .populate("jobId", "_id") // Minimal populate for jobId
      .lean(); // Use lean for better performance

    if (callsToProcess.length === 0) {
      return;
    }

    console.log(
      `📧 Processing ${callsToProcess.length} scheduled call(s) for email sending...`
    );

    // Process calls sequentially to avoid overwhelming email service
    // and to prevent race conditions
    for (const call of callsToProcess) {
      // Check if email was already sent (race condition protection)
      const freshCall = await BolnaCall.findById(call._id);
      if (!freshCall) {
        skippedCount++;
        console.log(`⏭️ [Call ${call._id}] Call not found, skipping...`);
        continue;
      }
      
      if (freshCall.emailSent) {
        skippedCount++;
        console.log(`⏭️ [Call ${call._id}] Email already sent, skipping...`);
        continue;
      }

      processedCount++;
      const result = await processSingleCall(freshCall);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Small delay to prevent overwhelming external services
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;
    console.log(
      `📊 Email processing completed in ${duration}ms: ` +
      `${successCount} sent, ${failureCount} failed, ${skippedCount} skipped, ` +
      `${processedCount} total processed`
    );
  } catch (error) {
    console.error("❌ Critical error in processScheduledCalls:", error);
    // Log full stack trace for debugging
    console.error(error.stack);
  }
}

/**
 * Initialize and start cron jobs
 */
export async function startCronJobs() {
  console.log("🕐 Starting cron jobs...");

  // Verify email configuration
  const emailConfigValid = await verifyEmailConfig();
  if (!emailConfigValid) {
    console.warn(
      "⚠️ Email configuration verification failed. Cron job will still run but emails may fail."
    );
  }

  // Schedule email sending job
  // Runs every minute to check for calls that need emails
  cron.schedule(CRON_INTERVAL, async () => {
    const runTime = new Date().toISOString();
    console.log(`⏰ Running email scheduler at ${runTime}`);
    
    try {
      await processScheduledCalls();
    } catch (error) {
      console.error("❌ Unhandled error in email cron job:", error);
      // Don't let cron job crash - log and continue
    }
  });

  console.log(
    `✅ Email cron job scheduled (interval: ${CRON_INTERVAL}, window: ±${EMAIL_WINDOW_MINUTES}min, max retries: ${MAX_RETRY_ATTEMPTS})`
  );
}

/**
 * Manually trigger email processing (for testing)
 */
export async function triggerEmailProcessing() {
  console.log("🔔 Manually triggering email processing...");
  await processScheduledCalls();
}
