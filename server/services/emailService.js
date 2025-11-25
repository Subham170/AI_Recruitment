import nodemailer from "nodemailer";

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER =
  process.env.SMTP_USER || process.env.SENDER_EMAIL || "admin@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

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
 * Generate Google Meet link with scheduled time
 * @param {Date} scheduledTime - The scheduled time for the meeting
 * @returns {string} - Google Meet link
 */
function generateGoogleMeetLink(scheduledTime) {
  // Format: https://meet.google.com/xxx-xxxx-xxx
  // For now, we'll use a placeholder or generate a unique meeting ID
  // In production, you might want to integrate with Google Calendar API to create actual meetings

  // Simple approach: Use a base meeting link
  // You can replace this with actual Google Meet integration
  const meetingId = `ai-recruitment-${Date.now()}`;
  return `https://meet.google.com/${meetingId}`;

  // Alternative: If you have Google Calendar API integration
  // return await createGoogleCalendarEvent(scheduledTime);
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
  senderEmail = "admin@gmail.com",
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

    const meetLink = generateGoogleMeetLink(userScheduledAt);
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
