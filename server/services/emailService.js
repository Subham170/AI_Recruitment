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
const EVENT_TYPE_ID = process.env.CAL_EVENT_TYPE_ID;

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
    // Convert scheduledTime to ISO string if it's a Date object
    const startTimeISO =
      scheduledTime instanceof Date
        ? scheduledTime.toISOString()
        : scheduledTime;

    if (!startTimeISO) {
      throw new Error("Scheduled time is required");
    }

    console.log("Creating Cal.com booking for:", startTimeISO);

    // Create booking request body
    const requestBody = {
      eventTypeId: EVENT_TYPE_ID,
      start: startTimeISO,
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

    // Extract meeting link from booking data
    const meetLink =
      bookingData.meetingUrl ||
      bookingData.location?.url ||
      bookingData.metadata?.videoCallUrl ||
      null;

    if (!meetLink) {
      console.warn("⚠️ Meeting link not found in booking response");
      return "No link generated";
    }

    console.log("✓ Google Meet link generated:", meetLink);
    return meetLink;
  } catch (error) {
    console.error("❌ Error generating Google Meet link:", error.message);

    // Log detailed error if available
    if (error.response?.data) {
      console.error(
        "API Error Details:",
        JSON.stringify(error.response.data, null, 2)
      );
    }

    // Return error message on error
    console.warn("⚠️ Unable to generate Google Meet link due to error");
    return "Unable to generate link";
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

    const meetLink = await generateGoogleMeetLink(
      userScheduledAt,
      "Candidate",
      candidateEmail
    );
    const formattedDate = formatDateForEmail(userScheduledAt);

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
              
              <div style="text-align: center;">
                <a href="${meetLink}" class="meet-button">Join Google Meet</a>
              </div>
              
              <p style="margin-top: 20px;">
                <strong>Meeting Link:</strong><br>
                <a href="${meetLink}" style="color: #4285F4; word-break: break-all;">${meetLink}</a>
              </p>
              
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
        
        Please join the interview using the Google Meet link:
        ${meetLink}
        
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
