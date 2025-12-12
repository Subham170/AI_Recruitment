import cron from "node-cron";
import { syncBolnaCall } from "../bolna/controller.js";
import BolnaCall from "../bolna/model.js";
import Candidate from "../candidates/model.js";
import RecruiterAvailability from "../recruiter_availability/model.js";
import RecruiterTask from "../recruiter_tasks/model.js";
import { sendEmail, verifyEmailConfig } from "./emailService.js";
import { formatDateTimeWithAMPM, convert24To12Hour } from "../utils/timeFormatter.js";

const SENDER_EMAIL = process.env.SENDER_EMAIL || "admin@gmail.com";
const CRON_INTERVAL = process.env.EMAIL_CRON_INTERVAL || "*/1 * * * *"; // Every minute by default
const EMAIL_WINDOW_MINUTES = parseInt(
  process.env.EMAIL_WINDOW_MINUTES || "2",
  10
); // 2 minute window by default
const MAX_RETRY_ATTEMPTS = parseInt(
  process.env.MAX_EMAIL_RETRY_ATTEMPTS || "3",
  10
);
// Note: PROCESSING_LOCK_TIMEOUT removed - using fresh DB check instead

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
 * @param {string} jobId - Job ID
 * @param {Date|string} userScheduleAt - Scheduled time to check availability for
 * @returns {Promise<string|null>} - Assigned recruiter ID or null if no recruiters available
 */
async function assignRecruiterRoundRobin(jobId, userScheduleAt) {
  try {
    // Get all available recruiters for this job at the scheduled time
    const availableRecruiters = await getAvailableRecruitersForJob(jobId, userScheduleAt);

    if (availableRecruiters.length === 0) {
      console.warn(`No recruiters available for job ${jobId}`);
      return null;
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
    return null;
  }
}

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
        `❌ [Call ${callId}] Missing required fields: ${missingFields.join(
          ", "
        )}`
      );
      return {
        success: false,
        error: `Missing fields: ${missingFields.join(", ")}`,
      };
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

    // Fetch recruiter info if assigned
    let recruiterName = null;
    let recruiterEmail = null;
    const freshCallForRecruiter = await BolnaCall.findById(callId)
      .populate("assignRecruiter", "name email")
      .lean();
    
    if (freshCallForRecruiter?.assignRecruiter) {
      const recruiter = freshCallForRecruiter.assignRecruiter;
      recruiterName = recruiter.name || "Recruiter";
      recruiterEmail = recruiter.email;
      console.log(
        `ℹ️ [Call ${callId}] Recruiter info: ${recruiterName} (${recruiterEmail})`
      );
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

      // Assign recruiter using round robin when userScheduledAt is available
      // Only assign if not already assigned
      const freshCall = await BolnaCall.findById(callId);
      if (!freshCall.assignRecruiter) {
        const assignedRecruiter = await assignRecruiterRoundRobin(jobId, userScheduledAt);
        
        if (assignedRecruiter) {
          // Update assignRecruiter (userScheduledAt is already updated by syncBolnaCall)
          await BolnaCall.findByIdAndUpdate(callId, {
            assignRecruiter: assignedRecruiter,
          });
          console.log(
            `✅ [Call ${callId}] Assigned recruiter ${assignedRecruiter} using round robin`
          );

          // Create or update recruiter task record
          try {
            const taskData = {
              recruiter_id: assignedRecruiter,
              candidate_id: candidateId,
              job_id: jobId,
              bolna_call_id: callId,
              interview_time: userScheduledAt,
              call_scheduled_at: freshCall.callScheduledAt,
              status: "scheduled",
              email_sent: false,
            };

            await RecruiterTask.findOneAndUpdate(
              { bolna_call_id: callId },
              taskData,
              { upsert: true, new: true }
            );
            console.log(
              `✅ [Call ${callId}] Created/updated recruiter task record`
            );
          } catch (taskError) {
            console.error(
              `⚠️ [Call ${callId}] Failed to create task record:`,
              taskError.message
            );
            // Don't fail the whole process if task creation fails
          }
        } else {
          console.warn(
            `⚠️ [Call ${callId}] No recruiter available for assignment`
          );
        }
      } else {
        console.log(
          `ℹ️ [Call ${callId}] Recruiter already assigned: ${freshCall.assignRecruiter}`
        );
      }
    } catch (syncError) {
      console.error(
        `❌ [Call ${callId}] Failed to sync with Bolna API:`,
        syncError.message
      );
      return { success: false, error: `Sync failed: ${syncError.message}` };
    }

      // Check if meet link was already generated to avoid regenerating
      const callBeforeEmail = await BolnaCall.findById(callId);
      const meetLinkAlreadyGenerated = callBeforeEmail?.meetLinkGenerated || false;
      const existingMeetLink = callBeforeEmail?.meetLink || null;

      // Send email
      try {
        // Get the meet link from the email response
        const emailResult = await sendEmail(
          candidate.email,
          SENDER_EMAIL,
          userScheduledAt,
          recruiterName,
          recruiterEmail,
          meetLinkAlreadyGenerated,
          existingMeetLink
        );

        const generatedMeetLink = emailResult.meetLink || existingMeetLink;

        // Mark email as sent atomically and save meet link if generated
        await BolnaCall.findByIdAndUpdate(callId, {
          emailSent: true,
          emailSentAt: new Date(),
          emailRetryCount: 0, // Reset retry count on success
          ...(generatedMeetLink && !meetLinkAlreadyGenerated && {
            meetLink: generatedMeetLink,
            meetLinkGenerated: true,
            meetLinkGeneratedAt: new Date(),
          }),
        });

        // Update task record with email sent status
        try {
          await RecruiterTask.findOneAndUpdate(
            { bolna_call_id: callId },
            {
              email_sent: true,
              email_sent_at: new Date(),
            }
          );
        } catch (taskError) {
          console.error(
            `⚠️ [Call ${callId}] Failed to update task email status:`,
            taskError.message
          );
        }

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
    const windowStart = new Date(
      now.getTime() - EMAIL_WINDOW_MINUTES * 60 * 1000
    );
    const windowEnd = new Date(
      now.getTime() + EMAIL_WINDOW_MINUTES * 60 * 1000
    );

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
    const runTime = formatDateTimeWithAMPM(new Date(), { includeWeekday: true });
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
