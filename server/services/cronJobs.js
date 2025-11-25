import cron from "node-cron";
import BolnaCall from "../bolna/model.js";
import { sendEmail, verifyEmailConfig } from "./emailService.js";

const SENDER_EMAIL = process.env.SENDER_EMAIL || "admin@gmail.com";
const CRON_INTERVAL = process.env.EMAIL_CRON_INTERVAL || "*/1 * * * *"; // Every minute by default

/**
 * Process scheduled calls and send emails
 */
async function processScheduledCalls() {
  try {
    const now = new Date();
    // Check for calls scheduled in the current minute (with 1 minute window)
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);

    // Find calls that are scheduled to be sent now
    // We'll add an emailSent flag to track which emails have been sent
    const callsToProcess = await BolnaCall.find({
      callScheduledAt: {
        $gte: oneMinuteAgo,
        $lte: oneMinuteFromNow,
      },
      emailSent: { $ne: true }, // Only process calls that haven't been emailed yet
      userScheduledAt: { $ne: null }, // Only send if userScheduledAt is available
    }).populate("candidateId", "email name");

    if (callsToProcess.length === 0) {
      return;
    }

    console.log(
      `📧 Processing ${callsToProcess.length} scheduled call(s) for email sending...`
    );

    for (const call of callsToProcess) {
      try {
        const candidate = call.candidateId;

        if (!candidate || !candidate.email) {
          console.error(`❌ No candidate email found for call ${call._id}`);
          continue;
        }

        // Send email
        await sendEmail(candidate.email, SENDER_EMAIL, call.userScheduledAt);

        // Mark email as sent
        call.emailSent = true;
        call.emailSentAt = new Date();
        await call.save();

        console.log(
          `✅ Email sent successfully to ${candidate.email} for call ${call._id}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to send email for call ${call._id}:`,
          error.message
        );
        // Don't mark as sent if there was an error, so it can be retried
      }
    }
  } catch (error) {
    console.error("❌ Error in processScheduledCalls:", error);
  }
}

/**
 * Initialize and start cron jobs
 */
export async function startCronJobs() {
  console.log("🕐 Starting cron jobs...");

  // Verify email configuration
  await verifyEmailConfig();

  // Schedule email sending job
  // Runs every minute to check for calls that need emails
  cron.schedule(CRON_INTERVAL, async () => {
    console.log(`⏰ Running email scheduler at ${new Date().toISOString()}`);
    await processScheduledCalls();
  });

  console.log(`✅ Email cron job scheduled (interval: ${CRON_INTERVAL})`);
}

/**
 * Manually trigger email processing (for testing)
 */
export async function triggerEmailProcessing() {
  console.log("🔔 Manually triggering email processing...");
  await processScheduledCalls();
}
