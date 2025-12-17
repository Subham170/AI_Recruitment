import cron from "node-cron";
import { syncBolnaCall, screeningTranscript } from "../bolna/controller.js";
import BolnaCall from "../bolna/model.js";
import Candidate from "../candidates/model.js";
import RecruiterAvailability from "../recruiter_availability/model.js";
import RecruiterTask from "../recruiter_tasks/model.js";
import JobPosting from "../job_posting/model.js";
// import { sendEmail, verifyEmailConfig } from "./emailService.js"; // Commented out - emails sent via Cal.com
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

    // Recruiter info will be fetched after assignment (if needed)
    let recruiterName = null;
    let recruiterEmail = null;

    // Get fresh call data
    const freshCall = await BolnaCall.findById(callId);
    if (!freshCall) {
      console.error(`❌ [Call ${callId}] Call not found in database`);
      return { success: false, error: "Call not found" };
    }

    // Sync with Bolna API to get userScheduledAt (but don't fail if it's not available)
    let userScheduledAt = freshCall.userScheduledAt;
    let syncSucceeded = false;
    
    try {
      const syncResult = await syncBolnaCall(executionId);
      userScheduledAt = syncResult?.storedRecord?.userScheduledAt || userScheduledAt;
      syncSucceeded = true;
      
      if (!userScheduledAt) {
        console.warn(
          `⚠️ [Call ${callId}] userScheduledAt not found in transcript. Using callScheduledAt as fallback.`
        );
      }
    } catch (syncError) {
      console.warn(
        `⚠️ [Call ${callId}] Failed to sync with Bolna API (will continue with existing data):`,
        syncError.message
      );
      // Continue processing even if sync fails - use existing data
    }

    // Use callScheduledAt as fallback if userScheduledAt is not available
    const scheduledTimeForEmail = userScheduledAt || freshCall.callScheduledAt;
    if (!scheduledTimeForEmail) {
      console.error(
        `❌ [Call ${callId}] No scheduled time available (neither userScheduledAt nor callScheduledAt)`
      );
      return { success: false, error: "No scheduled time available" };
    }

    // Assign recruiter using round robin
    // Only assign if not already assigned
    if (!freshCall.assignRecruiter) {
      try {
        // Use userScheduledAt if available, otherwise use callScheduledAt for recruiter assignment
        const timeForRecruiterAssignment = userScheduledAt || freshCall.callScheduledAt;
        const assignedRecruiter = await assignRecruiterRoundRobin(jobId, timeForRecruiterAssignment);
        
        if (assignedRecruiter) {
          // Update assignRecruiter
          await BolnaCall.findByIdAndUpdate(callId, {
            assignRecruiter: assignedRecruiter,
          });
          console.log(
            `✅ [Call ${callId}] Assigned recruiter ${assignedRecruiter} using round robin`
          );
        } else {
          console.warn(
            `⚠️ [Call ${callId}] No recruiter available for assignment at scheduled time`
          );
        }
      } catch (assignError) {
        console.error(
          `⚠️ [Call ${callId}] Error during recruiter assignment (will continue):`,
          assignError.message
        );
        // Continue even if recruiter assignment fails
      }
    } else {
      console.log(
        `ℹ️ [Call ${callId}] Recruiter already assigned: ${freshCall.assignRecruiter}`
      );
    }

    // Create or update recruiter task record (even if recruiter is not assigned)
    // This ensures we track the task even if no recruiter is available
    try {
      const freshCallForTask = await BolnaCall.findById(callId);
      const taskData = {
        ...(freshCallForTask.assignRecruiter && {
          recruiter_id: freshCallForTask.assignRecruiter,
        }),
        candidate_id: candidateId,
        job_id: jobId,
        bolna_call_id: callId,
        interview_time: scheduledTimeForEmail,
        call_scheduled_at: freshCallForTask.callScheduledAt,
        status: "scheduled",
        email_sent: false,
      };

      // Only create task if recruiter is assigned (task model requires recruiter_id)
      if (freshCallForTask.assignRecruiter) {
        await RecruiterTask.findOneAndUpdate(
          { bolna_call_id: callId },
          taskData,
          { upsert: true, new: true }
        );
        console.log(
          `✅ [Call ${callId}] Created/updated recruiter task record`
        );
      } else {
        console.warn(
          `⚠️ [Call ${callId}] Task not created - no recruiter assigned (task requires recruiter_id)`
        );
      }
    } catch (taskError) {
      console.error(
        `⚠️ [Call ${callId}] Failed to create task record:`,
        taskError.message
      );
      // Don't fail the whole process if task creation fails
    }

    // Fetch fresh recruiter info right before sending email
    const callBeforeEmail = await BolnaCall.findById(callId)
      .populate("assignRecruiter", "name email")
      .lean();
    
    if (callBeforeEmail?.assignRecruiter) {
      recruiterName = callBeforeEmail.assignRecruiter.name || "Recruiter";
      recruiterEmail = callBeforeEmail.assignRecruiter.email;
      console.log(
        `ℹ️ [Call ${callId}] Using recruiter for email: ${recruiterName} (${recruiterEmail})`
      );
    }

    // Email sending via nodemailer is commented out - emails are sent via Cal.com when generating meet link
    // The meet link generation in emailService.js already sends emails to both candidate and recruiter through Cal.com
    
    const meetLinkAlreadyGenerated = callBeforeEmail?.meetLinkGenerated || false;
    const existingMeetLink = callBeforeEmail?.meetLink || null;

    // Check if meet link needs to be generated
    if (!existingMeetLink && !meetLinkAlreadyGenerated) {
      // Generate meet link (this will also send emails via Cal.com)
      try {
        const { generateGoogleMeetLink } = await import("./emailService.js");
        const generatedMeetLink = await generateGoogleMeetLink(
          scheduledTimeForEmail,
          candidate.name || candidate.email?.split('@')[0] || "Candidate",
          candidate.email,
          recruiterName,
          recruiterEmail
        );

        // Mark email as sent and save meet link
        await BolnaCall.findByIdAndUpdate(callId, {
          emailSent: true,
          emailSentAt: new Date(),
          emailRetryCount: 0,
          meetLink: generatedMeetLink,
          meetLinkGenerated: true,
          meetLinkGeneratedAt: new Date(),
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
          `✅ [Call ${callId}] Meet link generated and emails sent via Cal.com to ${candidate.email}${recruiterEmail ? ` and ${recruiterEmail}` : ''}`
        );
        return { success: true };
      } catch (meetLinkError) {
        console.error(
          `❌ [Call ${callId}] Failed to generate meet link:`,
          meetLinkError.message
        );
        return { success: false, error: meetLinkError.message };
      }
    } else {
      // Meet link already exists, just mark email as sent
      await BolnaCall.findByIdAndUpdate(callId, {
        emailSent: true,
        emailSentAt: new Date(),
        emailRetryCount: 0,
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
        `✅ [Call ${callId}] Email already sent via Cal.com (meet link exists)`
      );
      return { success: true };
    }

    /* COMMENTED OUT - Email sending via nodemailer (emails now sent via Cal.com)
    // Send email (use scheduledTimeForEmail which has fallback logic)
    try {
        // Get the meet link from the email response
        const emailResult = await sendEmail(
          candidate.email,
          SENDER_EMAIL,
          scheduledTimeForEmail, // Use the time with fallback
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
      const errorMessage = emailError.message || "Unknown error";
      
      await BolnaCall.findByIdAndUpdate(callId, {
        emailRetryCount: retryCount,
        lastEmailError: errorMessage,
        lastEmailErrorAt: new Date(),
      });

      // Log detailed error information
      console.error(
        `❌ [Call ${callId}] Failed to send email (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}):`,
        errorMessage
      );
      
      // Log additional error details for debugging
      if (emailError.code) {
        console.error(`   Error code: ${emailError.code}`);
      }
      if (emailError.response) {
        console.error(`   Response status: ${emailError.response.status}`);
      }
      if (emailError.stack && retryCount === 1) {
        // Only log stack trace on first attempt to avoid spam
        console.error(`   Stack trace:`, emailError.stack);
      }

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

      return { success: false, error: errorMessage };
    }
    */
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

  // Email configuration verification commented out - emails sent via Cal.com
  // const emailConfigValid = await verifyEmailConfig();
  // if (!emailConfigValid) {
  //   console.warn(
  //     "⚠️ Email configuration verification failed. Cron job will still run but emails may fail."
  //   );
  // }

  // Email sending job disabled - emails are now sent manually via API
  // Recruiters will select slots and send emails through POST /api/bolna/send-email
  // cron.schedule(CRON_INTERVAL, async () => {
  //   const runTime = formatDateTimeWithAMPM(new Date(), { includeWeekday: true });
  //   console.log(`⏰ Running email scheduler at ${runTime}`);
  //
  //   try {
  //     await processScheduledCalls();
  //   } catch (error) {
  //     console.error("❌ Unhandled error in email cron job:", error);
  //     // Don't let cron job crash - log and continue
  //   }
  // });

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
    `✅ Cron jobs initialized (email sending disabled - use manual API endpoint, screening enabled)`
  );
}

/**
 * Manually trigger email processing (for testing)
 */
export async function triggerEmailProcessing() {
  console.log("🔔 Manually triggering email processing...");
  await processScheduledCalls();
}
