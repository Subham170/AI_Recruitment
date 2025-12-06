import axios from "axios";
import nodemailer from "nodemailer";

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || process.env.SENDER_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

// Cal.com API configuration
const CAL_SECRET_KEY = process.env.CAL_SECRET_KEY;
const CAL_API_VERSION = process.env.CAL_API_VERSION;
const EVENT_TYPE_ID = process.env.CAL_EVENT_TYPE_ID || 4025819;

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Generate Google Meet link with scheduled time using Cal.com API
 * @param {Date|string} scheduledTime - The scheduled time for the meeting
 * @param {string} candidateName - Candidate name for the booking
 * @param {string} candidateEmail - Candidate email for the booking
 * @returns {Promise<string>} - Google Meet link
 */
async function generateGoogleMeetLink(
  scheduledTime,
  candidateName,
  candidateEmail
) {
  try {
    // Validate environment variables
    if (!CAL_SECRET_KEY) {
      throw new Error("CAL_SECRET_KEY environment variable is not set");
    }
    if (!CAL_API_VERSION) {
      throw new Error("CAL_API_VERSION environment variable is not set");
    }
    if (!EVENT_TYPE_ID) {
      throw new Error("CAL_EVENT_TYPE_ID environment variable is not set");
    }

    // Convert scheduledTime to Date object for validation
    let scheduledDate;
    if (scheduledTime instanceof Date) {
      scheduledDate = scheduledTime;
    } else if (typeof scheduledTime === "string") {
      scheduledDate = new Date(scheduledTime);
    } else {
      throw new Error("Scheduled time must be a Date object or ISO string");
    }

    // Validate that the scheduled time is valid
    if (isNaN(scheduledDate.getTime())) {
      throw new Error("Invalid scheduled time provided");
    }

    // Check if the scheduled time is in the past
    const now = new Date();
    const minFutureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

    if (scheduledDate < minFutureTime) {
      console.warn(
        `⚠️ Scheduled time ${scheduledDate.toISOString()} is too soon or in the past. ` +
          `Cal.com requires bookings to be at least 5 minutes in the future. ` +
          `Adjusting to ${minFutureTime.toISOString()}`
      );
      scheduledDate = minFutureTime;
    }

    console.log("Fetching available slots for event type:", EVENT_TYPE_ID);
    console.log("Requested time:", scheduledDate.toISOString());
    console.log("Candidate:", candidateName, candidateEmail);

    // Step 1: Fetch available slots (Cal.com requires this)
    const slotsStartTime = now.toISOString();
    const slotsEndTime = new Date(
      scheduledDate.getTime() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(); // 7 days ahead

    const slotsResp = await axios.get(
      "https://api.cal.com/v2/slots/available",
      {
        params: {
          startTime: slotsStartTime,
          endTime: slotsEndTime,
          eventTypeId: EVENT_TYPE_ID,
        },
        headers: {
          Authorization: `Bearer ${CAL_SECRET_KEY}`,
          "cal-api-version": CAL_API_VERSION,
        },
      }
    );

    const slots = slotsResp.data.data.slots;
    let selectedSlot = null;

    // Find the closest available slot to the requested time
    const requestedTime = scheduledDate.getTime();
    let closestDiff = Infinity;

    for (const dateKey in slots) {
      if (slots[dateKey] && slots[dateKey].length > 0) {
        for (const slot of slots[dateKey]) {
          const slotTime = new Date(slot.time).getTime();
          const diff = Math.abs(slotTime - requestedTime);

          // Prefer slots that are at or after the requested time
          if (slotTime >= requestedTime && diff < closestDiff) {
            closestDiff = diff;
            selectedSlot = slot.time;
          }
        }
      }
    }

    // If no future slot found, use the first available slot
    if (!selectedSlot) {
      for (const dateKey in slots) {
        if (slots[dateKey] && slots[dateKey].length > 0) {
          selectedSlot = slots[dateKey][0].time;
          console.log(
            `⚠️ No slot found after requested time. Using first available: ${selectedSlot}`
          );
          break;
        }
      }
    }

    if (!selectedSlot) {
      throw new Error(
        "No available slots found for the event type. Please check your Cal.com availability settings."
      );
    }

    console.log(`✓ Selected slot: ${selectedSlot}`);

    // Step 2: Create booking with the selected slot
    const requestBody = {
      eventTypeId: EVENT_TYPE_ID,
      start: selectedSlot,
      location: "integrations:google_meet",
      attendee: {
        name: candidateName,
        email: candidateEmail,
        timeZone: "Asia/Kolkata",
        language: "en",
      },
    };

    // Create booking via Cal.com API
    const createResp = await axios.post(
      "https://api.cal.com/v2/bookings",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${CAL_SECRET_KEY}`,
          "cal-api-version": CAL_API_VERSION,
          "Content-Type": "application/json",
        },
      }
    );

    const bookingUid = createResp.data.data.uid;
    console.log("✓ Booking Created. UID:", bookingUid);

    // Check if the creation response already contains the meeting link
    const creationData = createResp.data.data;
    let meetLinkFromCreation =
      creationData.meetingUrl ||
      creationData.location?.url ||
      (creationData.location &&
      typeof creationData.location === "string" &&
      creationData.location.startsWith("http")
        ? creationData.location
        : null) ||
      creationData.metadata?.videoCallUrl ||
      null;

    // If we got the link from creation, return it immediately
    if (meetLinkFromCreation) {
      try {
        new URL(meetLinkFromCreation); // Validate it's a URL
        console.log("✓ Google Meet link generated from creation response!");
        console.log("📎 Meeting Link:", meetLinkFromCreation);
        return meetLinkFromCreation;
      } catch (urlError) {
        console.warn(
          "⚠️ Link from creation response is not a valid URL, fetching booking details..."
        );
      }
    }

    // Wait a moment for the booking to be fully processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get booking details to retrieve the meeting link
    const getBookingResp = await axios.get(
      `https://api.cal.com/v2/bookings/${bookingUid}`,
      {
        headers: {
          Authorization: `Bearer ${CAL_SECRET_KEY}`,
          "cal-api-version": CAL_API_VERSION,
        },
      }
    );

    const bookingData = getBookingResp.data.data;

    // Log only the relevant booking info, not the entire structure
    console.log("Booking retrieved. Checking for meeting link...");

    // Extract meeting link from booking data - check multiple possible locations
    let meetLink = null;

    // Check meetingUrl first
    if (bookingData.meetingUrl) {
      meetLink = bookingData.meetingUrl;
    }
    // Check location.url (if location is an object)
    else if (bookingData.location?.url) {
      meetLink = bookingData.location.url;
    }
    // Check if location is a direct URL string (starts with http)
    else if (
      bookingData.location &&
      typeof bookingData.location === "string" &&
      bookingData.location.startsWith("http")
    ) {
      meetLink = bookingData.location;
    }
    // Check metadata
    else if (bookingData.metadata?.videoCallUrl) {
      meetLink = bookingData.metadata.videoCallUrl;
    }
    // Check dynamicEventSlugRef
    else if (bookingData.dynamicEventSlugRef?.meetingUrl) {
      meetLink = bookingData.dynamicEventSlugRef.meetingUrl;
    }

    if (!meetLink) {
      console.warn("⚠️ Meeting link not found in booking response");
      console.warn(
        "Full booking data structure:",
        JSON.stringify(bookingData, null, 2)
      );
      throw new Error("Meeting link not found in booking response");
    }

    // Validate that the link is a valid URL
    try {
      new URL(meetLink);
    } catch (urlError) {
      console.error("❌ Generated link is not a valid URL:", meetLink);
      throw new Error("Generated link is not a valid URL");
    }

    console.log("✓ Google Meet link generated successfully!");
    console.log("📎 Meeting Link:", meetLink);
    return meetLink;
  } catch (error) {
    console.error("❌ Error generating Google Meet link:", error.message);
    console.error("Error stack:", error.stack);

    // Log detailed error if available (simplified to avoid huge output)
    if (error.response?.data) {
      const errorData = error.response.data;
      console.error(
        "API Error:",
        errorData.error?.message || errorData.message || "Unknown error"
      );
      console.error("API Status:", error.response.status);

      // Only log full error data if it's a small object
      if (
        errorData &&
        typeof errorData === "object" &&
        Object.keys(errorData).length < 10
      ) {
        console.error("Error Details:", JSON.stringify(errorData, null, 2));
      }
    }

    // Re-throw the error so the caller can handle it appropriately
    throw error;
  }
}

/**
 * Format date for email display
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDateForEmail(date) {
  if (!date) return "TBD";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date));
}

/**
 * Send email to candidate with Google Meet link
 * @param {string} candidateEmail - Recipient email address
 * @param {string} senderEmail - Sender email address (default: admin@gmail.com)
 * @param {Date} userScheduledAt - Scheduled meeting time
 * @returns {Promise<Object>} - Email send result
 */
export async function sendEmail(
  candidateEmail,
  senderEmail = "subhamdey1114@gmail.com",
  userScheduledAt
) {
  try {
    if (!candidateEmail) {
      throw new Error("Candidate email is required");
    }

    if (!SMTP_PASS) {
      console.warn("SMTP_PASS not configured. Email sending will fail.");
      throw new Error(
        "SMTP configuration is missing. Please set SMTP_PASS in environment variables."
      );
    }

    // Generate Google Meet link with error handling
    let meetLink;
    let meetLinkError = null;
    try {
      meetLink = await generateGoogleMeetLink(
        userScheduledAt,
        "Candidate",
        candidateEmail
      );
    } catch (error) {
      console.error("Failed to generate Google Meet link:", error.message);
      meetLinkError = error.message;
      meetLink = null; // Set to null so we can handle it in the email template
    }

    const formattedDate = formatDateForEmail(userScheduledAt);

    // Determine what to show for the meeting link
    const meetingLinkDisplay = meetLink || "Link will be sent separately";
    const meetingLinkHref = meetLink || "#";
    const showLinkError = meetLinkError ? ` (Error: ${meetLinkError})` : "";

    const mailOptions = {
      from: `"AI Recruitment Team" <${senderEmail}>`,
      to: candidateEmail,
      subject: "Interview Scheduled - Google Meet Link",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .meet-button {
              display: inline-block;
              background-color: #4285F4;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .meet-button:hover {
              background-color: #357AE8;
            }
            .info-box {
              background-color: white;
              padding: 15px;
              border-left: 4px solid #4CAF50;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Interview Scheduled</h1>
            </div>
            <div class="content">
              <p>Dear Candidate,</p>
              
              <p>We are pleased to inform you that your interview has been scheduled.</p>
              
              <div class="info-box">
                <strong>📅 Scheduled Time:</strong><br>
                ${formattedDate}
              </div>
              
              <p>Please join the interview using the Google Meet link below:</p>
              
              ${
                meetLink
                  ? `
              <div style="text-align: center;">
                <a href="${meetLink}" class="meet-button">Join Google Meet</a>
              </div>
              
              <p style="margin-top: 20px;">
                <strong>Meeting Link:</strong><br>
                <a href="${meetLink}" style="color: #4285F4; word-break: break-all;">${meetLink}</a>
              </p>
              `
                  : `
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <strong>⚠️ Meeting Link:</strong><br>
                ${meetingLinkDisplay}${showLinkError}
                <br><br>
                <small>We are working on generating your meeting link. You will receive a separate email with the link shortly.</small>
              </div>
              `
              }
              
              <p>Please ensure you are available at the scheduled time. If you need to reschedule, please contact us as soon as possible.</p>
              
              <p>Best regards,<br>
              AI Recruitment Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Interview Scheduled
        
        Dear Candidate,
        
        We are pleased to inform you that your interview has been scheduled.
        
        Scheduled Time: ${formattedDate}
        
        ${
          meetLink
            ? `Please join the interview using the Google Meet link:
        ${meetLink}`
            : `Meeting Link: ${meetingLinkDisplay}${showLinkError}
        
        We are working on generating your meeting link. You will receive a separate email with the link shortly.`
        }
        
        Please ensure you are available at the scheduled time. If you need to reschedule, please contact us as soon as possible.
        
        Best regards,
        AI Recruitment Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(
      `Email sent successfully to ${candidateEmail}:`,
      info.messageId
    );

    return {
      success: true,
      messageId: info.messageId,
      recipient: candidateEmail,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Verify email configuration
 * @returns {Promise<boolean>} - True if configuration is valid
 */
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log("✅ Email server is ready to send messages");
    return true;
  } catch (error) {
    console.error("❌ Email server configuration error:", error);
    return false;
  }
}
