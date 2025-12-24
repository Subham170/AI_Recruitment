import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import ResetPassword from "../reset_password/model.js";
import User from "../user/model.js";

// Email configuration from environment variables (same as emailService.js)
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || process.env.SENDER_EMAIL;
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
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

/**
 * Generate a 6-digit OTP
 * @returns {string} - 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP email for password reset
 * @param {string} email - User email address
 * @returns {Promise<Object>} - Result object
 */
export async function sendPasswordResetOTP(email) {
  try {
    if (!email) {
      throw new Error("Email is required");
    }

    // Check if user exists in the database
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // User doesn't exist - don't send OTP
      return {
        success: false,
        message:
          "No account found with this email address. Please check your email and try again.",
      };
    }

    if (!SMTP_PASS) {
      throw new Error(
        "SMTP configuration is missing. Please set SMTP_PASS in environment variables."
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Delete any existing OTP for this email
    await ResetPassword.deleteMany({ email: email.toLowerCase().trim() });

    // Save OTP to database
    await ResetPassword.create({
      email: email.toLowerCase().trim(),
      otp: otp,
      expiresAt: expiresAt,
      verified: false,
      attempts: 0,
    });

    // Send email
    const mailOptions = {
      from: `"AI Recruitment Team" <${SMTP_USER}>`,
      to: email,
      subject: "Password Reset OTP - LEAN IT",
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
            .otp-box {
              background-color: white;
              border: 2px dashed #4CAF50;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              border-radius: 5px;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #4CAF50;
              letter-spacing: 5px;
              font-family: 'Courier New', monospace;
            }
            .info-box {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
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
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Dear ${user.name},</p>
              
              <p>We received a request to reset your password. Use the OTP below to verify your identity:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="info-box">
                <strong>⚠️ Important:</strong><br>
                • This OTP is valid for 5 minutes only<br>
                • After verification, you'll have 10 minutes to reset your password<br>
                • Do not share this OTP with anyone<br>
                • If you didn't request this, please ignore this email
              </div>
              
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
              
              <p>Best regards,<br>
              LEAN IT Recruitment Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        Dear ${user.name},
        
        We received a request to reset your password. Use the OTP below to verify your identity:
        
        OTP: ${otp}
        
        This OTP is valid for 5 minutes only.
        After verification, you'll have 10 minutes to reset your password.
        Do not share this OTP with anyone.
        
        If you didn't request a password reset, you can safely ignore this email.
        
        Best regards,
        LEAN IT Recruitment Team
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`Password reset OTP sent successfully to ${email}`);

    return {
      success: true,
      message: "Password reset OTP has been sent to your email address.",
    };
  } catch (error) {
    console.error("Error sending password reset OTP:", error);
    throw new Error(`Failed to send password reset OTP: ${error.message}`);
  }
}

/**
 * Verify OTP for password reset
 * @param {string} email - User email
 * @param {string} otp - OTP code
 * @returns {Promise<Object>} - Result object
 */
export async function verifyPasswordResetOTP(email, otp) {
  try {
    if (!email || !otp) {
      throw new Error("Email and OTP are required");
    }

    // Find the OTP record
    const resetRecord = await ResetPassword.findOne({
      email: email.toLowerCase().trim(),
      verified: false,
    });

    if (!resetRecord) {
      return {
        success: false,
        message: "Invalid or expired OTP. Please request a new one.",
      };
    }

    // Check if OTP has expired
    if (new Date() > resetRecord.expiresAt) {
      await ResetPassword.deleteOne({ _id: resetRecord._id });
      return {
        success: false,
        message: "OTP has expired. Please request a new one.",
      };
    }

    // Check attempts limit
    if (resetRecord.attempts >= 5) {
      await ResetPassword.deleteOne({ _id: resetRecord._id });
      return {
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      };
    }

    // Verify OTP
    if (resetRecord.otp !== otp) {
      resetRecord.attempts += 1;
      await resetRecord.save();
      return {
        success: false,
        message: `Invalid OTP. ${5 - resetRecord.attempts} attempts remaining.`,
      };
    }

    // Mark OTP as verified and extend expiry time to give user time to reset password
    resetRecord.verified = true;
    resetRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Extend by 10 minutes after verification
    await resetRecord.save();

    return {
      success: true,
      message: "OTP verified successfully",
    };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw new Error(`Failed to verify OTP: ${error.message}`);
  }
}

/**
 * Reset password using verified OTP
 * @param {string} email - User email
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Result object
 */
export async function resetPassword(email, newPassword) {
  try {
    if (!email || !newPassword) {
      throw new Error("Email and new password are required");
    }

    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Find verified OTP record
    const resetRecord = await ResetPassword.findOne({
      email: email.toLowerCase().trim(),
      verified: true,
    });

    if (!resetRecord) {
      return {
        success: false,
        message: "OTP not verified. Please verify your OTP first.",
      };
    }

    // Check if OTP has expired (even if verified)
    if (new Date() > resetRecord.expiresAt) {
      await ResetPassword.deleteOne({ _id: resetRecord._id });
      return {
        success: false,
        message: "OTP has expired. Please request a new one.",
      };
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      await ResetPassword.deleteOne({ _id: resetRecord._id });
      return {
        success: false,
        message: "User not found",
      };
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password in the database using findByIdAndUpdate for explicit update
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { password: hashedPassword },
      { new: true, runValidators: true } // Return updated document and run validators
    );

    // Verify the password was saved successfully
    if (!updatedUser || !updatedUser.password) {
      throw new Error("Failed to save new password to database");
    }

    // Verify the saved password matches the hash we created
    if (updatedUser.password !== hashedPassword) {
      throw new Error("Password was not properly saved to user collection");
    }

    console.log(
      `✅ Password updated in database for user: ${email} (User ID: ${updatedUser._id})`
    );

    // Delete OTP record after successful password reset
    await ResetPassword.deleteOne({ _id: resetRecord._id });

    console.log(
      `✅ Password reset successfully for ${email} (User ID: ${updatedUser._id})`
    );

    return {
      success: true,
      message: "Password reset successfully",
    };
  } catch (error) {
    console.error("Error resetting password:", error);
    throw new Error(`Failed to reset password: ${error.message}`);
  }
}
