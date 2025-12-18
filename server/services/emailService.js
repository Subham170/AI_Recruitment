import axios from "axios";
import nodemailer from "nodemailer";
import {
  formatFullDateTimeWithAMPM,
  formatDateTimeWithAMPM,
} from "../utils/timeFormatter.js";
import CalcomCredentials from "../calcom_credentials/model.js";

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || process.env.SENDER_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

// Cal.com API configuration
const CAL_SECRET_KEY = process.env.CAL_SECRET_KEY || "cal_live_84badd816a1975088ad5af350287c21c";
const CAL_API_VERSION = process.env.CAL_API_VERSION || "2024-08-13";
// Convert EVENT_TYPE_ID to integer (Cal.com API requires integer, not string)
const EVENT_TYPE_ID = process.env.CAL_EVENT_ID 
  ? parseInt(process.env.CAL_EVENT_ID, 10) 
  : 4025819;

// Create reusable transporter with timeout configuration
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  connectionTimeout: 30000, // 30 seconds connection timeout
  greetingTimeout: 30000, // 30 seconds greeting timeout
  socketTimeout: 30000, // 30 seconds socket timeout
  // Retry configuration
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

/**
 * Generate Google Meet link with scheduled time using Cal.com API
 * @param {Date|string} scheduledTime - The scheduled time for the meeting
 * @param {string} candidateName - Candidate name for the booking
 * @param {string} candidateEmail - Candidate email for the booking
 * @param {string} recruiterId - Recruiter ID to use recruiter-specific Cal.com credentials (optional)
 * @returns {Promise<{meetLink: string, startTime: Date, endTime: Date, bookingUid: string}>} - Object containing Google Meet link, start time, end time, and booking UID
 */
export async function generateGoogleMeetLink(
  scheduledTime,
  candidateName,
  candidateEmail,
  recruiterId = null
) {
  try {
    let apiSecretKey = CAL_SECRET_KEY;
    let eventTypeId = EVENT_TYPE_ID;

    // If recruiterId is provided, use recruiter-specific credentials
    if (recruiterId) {
      const credentials = await CalcomCredentials.findOne({ 
        recruiterId,
        isActive: true 
      });

      if (!credentials) {
        throw new Error(
          "Cal.com credentials not found for this recruiter. Please configure your Cal.com API secret key and event type."
        );
      }

      if (!credentials.apiSecretKey) {
        throw new Error("Cal.com API secret key not configured for this recruiter");
      }

      if (!credentials.eventTypeId) {
        throw new Error("Cal.com event type ID not configured for this recruiter");
      }

      apiSecretKey = credentials.apiSecretKey;
      eventTypeId = credentials.eventTypeId;
    }

    // Validate credentials
    if (!apiSecretKey) {
      throw new Error("Cal.com API secret key is not configured");
    }
    if (!CAL_API_VERSION) {
      throw new Error("CAL_API_VERSION environment variable is not set");
    }
    if (!eventTypeId) {
      throw new Error("Cal.com event type ID is not configured");
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
        `⚠️ Scheduled time ${formatDateTimeWithAMPM(scheduledDate)} is too soon or in the past. ` +
          `Cal.com requires bookings to be at least 5 minutes in the future. ` +
          `Adjusting to ${formatDateTimeWithAMPM(minFutureTime)}`
      );
      scheduledDate = minFutureTime;
    }

    console.log("Fetching available slots for event type:", eventTypeId);
    console.log("Requested time:", formatDateTimeWithAMPM(scheduledDate, { includeWeekday: true }));
    console.log("Candidate:", candidateName, candidateEmail);
    if (recruiterId) {
      console.log("Using recruiter-specific Cal.com credentials");
    }

    // Step 1: Fetch available slots (Cal.com requires this)
    const slotsStartTime = now.toISOString();
    const slotsEndTime = new Date(
      scheduledDate.getTime() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(); // 7 days ahead

    // Retry logic for network issues (DNS/connection problems)
    let slotsResp;
    let slotsRetries = 3;
    let slotsLastError;
    
    while (slotsRetries > 0) {
      try {
        slotsResp = await axios.get(
          "https://api.cal.com/v2/slots/available",
          {
            params: {
              startTime: slotsStartTime,
              endTime: slotsEndTime,
              eventTypeId: parseInt(eventTypeId, 10), // Ensure it's an integer
            },
            headers: {
              Authorization: `Bearer ${apiSecretKey}`,
              "cal-api-version": CAL_API_VERSION,
            },
            timeout: 30000, // 30 seconds timeout
          }
        );
        break; // Success, exit retry loop
      } catch (error) {
        slotsLastError = error;
        slotsRetries--;
        
        if (slotsRetries > 0 && (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT')) {
          const waitTime = (4 - slotsRetries) * 2000; // 2s, 4s, 6s delays
          console.warn(`⚠️ Network error (${error.code}) fetching slots, retrying in ${waitTime/1000}s... (${slotsRetries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw error; // Re-throw if not a retryable error or out of retries
        }
      }
    }
    
    if (!slotsResp) {
      throw slotsLastError || new Error("Failed to fetch slots after retries");
    }

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
    // Cal.com v2 API - primary attendee is the candidate
    // The Cal.com account owner (event organizer) will automatically receive notifications
    // Since we're using recruiter-specific credentials, the recruiter automatically receives the email
    const requestBody = {
      eventTypeId: parseInt(eventTypeId, 10), // Cal.com API requires integer, not string
      start: selectedSlot,
      location: "integrations:google_meet",
      attendee: {
        name: candidateName,
        email: candidateEmail,
        timeZone: "Asia/Kolkata",
        language: "en",
      },
    };

    // Create booking via Cal.com API with retry logic
    let createResp;
    let createRetries = 3;
    let createLastError;
    
    while (createRetries > 0) {
      try {
        createResp = await axios.post(
          "https://api.cal.com/v2/bookings",
          requestBody,
          {
            headers: {
              Authorization: `Bearer ${apiSecretKey}`,
              "cal-api-version": CAL_API_VERSION,
              "Content-Type": "application/json",
            },
            timeout: 30000, // 30 seconds timeout
          }
        );
        break; // Success, exit retry loop
      } catch (error) {
        createLastError = error;
        createRetries--;
        
        if (createRetries > 0 && (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT')) {
          const waitTime = (4 - createRetries) * 2000; // 2s, 4s, 6s delays
          console.warn(`⚠️ Network error (${error.code}) creating booking, retrying in ${waitTime/1000}s... (${createRetries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw error; // Re-throw if not a retryable error or out of retries
        }
      }
    }
    
    if (!createResp) {
      throw createLastError || new Error("Failed to create booking after retries");
    }

    const bookingUid = createResp.data.data.uid;
    console.log("✓ Booking Created. UID:", bookingUid);

    // Check if the creation response already contains the meeting link
    const creationData = createResp.data.data;
    console.log("creationData--->", createResp.data);
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

    // If we got the link from creation, return it immediately with start and end times
    if (meetLinkFromCreation) {
      try {
        new URL(meetLinkFromCreation); // Validate it's a URL
        console.log("✓ Google Meet link generated from creation response!");
        console.log("📎 Meeting Link:", meetLinkFromCreation);
        
        // Extract start and end times from creation response
        const startTime = creationData.start ? new Date(creationData.start) : null;
        const endTime = creationData.end ? new Date(creationData.end) : null;
        
        if (startTime && endTime) {
          console.log("📅 Start Time:", startTime.toISOString());
          console.log("📅 End Time:", endTime.toISOString());
        }
        
        return {
          meetLink: meetLinkFromCreation,
          startTime: startTime || scheduledDate,
          endTime: endTime || new Date(scheduledDate.getTime() + 30 * 60 * 1000), // Default 30 min if not provided
          bookingUid: bookingUid, // Return booking UID for cancellation
        };
      } catch (urlError) {
        console.warn(
          "⚠️ Link from creation response is not a valid URL, fetching booking details..."
        );
      }
    }

    // Wait a moment for the booking to be fully processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get booking details to retrieve the meeting link with retry logic
    let getBookingResp;
    let fetchRetries = 3;
    let fetchLastError;
    
    while (fetchRetries > 0) {
      try {
        getBookingResp = await axios.get(
          `https://api.cal.com/v2/bookings/${bookingUid}`,
          {
            headers: {
              Authorization: `Bearer ${apiSecretKey}`,
              "cal-api-version": CAL_API_VERSION,
            },
            timeout: 30000, // 30 seconds timeout
          }
        );
        break; // Success, exit retry loop
      } catch (error) {
        fetchLastError = error;
        fetchRetries--;
        
        if (fetchRetries > 0 && (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT')) {
          const waitTime = (4 - fetchRetries) * 2000; // 2s, 4s, 6s delays
          console.warn(`⚠️ Network error (${error.code}) fetching booking, retrying in ${waitTime/1000}s... (${fetchRetries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw error; // Re-throw if not a retryable error or out of retries
        }
      }
    }
    
    if (!getBookingResp) {
      throw fetchLastError || new Error("Failed to fetch booking details after retries");
    }

    const bookingData = getBookingResp.data.data;

    console.log("bookingData--->", bookingData);

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
    
    // Extract start and end times from booking data
    const startTime = bookingData.start ? new Date(bookingData.start) : scheduledDate;
    const endTime = bookingData.end ? new Date(bookingData.end) : new Date(scheduledDate.getTime() + 30 * 60 * 1000); // Default 30 min if not provided
    
    if (startTime && endTime) {
      console.log("📅 Start Time:", startTime.toISOString());
      console.log("📅 End Time:", endTime.toISOString());
    }
    
    return {
      meetLink: meetLink,
      startTime: startTime,
      endTime: endTime,
      bookingUid: bookingUid, // Return booking UID for cancellation
    };
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
 * Cancel a Cal.com booking by booking UID
 * @param {string} bookingUid - The Cal.com booking UID
 * @param {string} recruiterId - Recruiter ID to use recruiter-specific credentials (optional)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function cancelCalBooking(bookingUid, recruiterId = null) {
  try {
    let apiSecretKey = CAL_SECRET_KEY;

    // If recruiterId is provided, use recruiter-specific credentials
    if (recruiterId) {
      const credentials = await CalcomCredentials.findOne({ 
        recruiterId,
        isActive: true 
      });

      if (credentials && credentials.apiSecretKey) {
        apiSecretKey = credentials.apiSecretKey;
      }
    }

    if (!apiSecretKey) {
      throw new Error("Cal.com API secret key is not configured");
    }

    if (!bookingUid) {
      throw new Error("Booking UID is required to cancel the booking");
    }

    console.log(`🗑️ Cancelling Cal.com booking: ${bookingUid}`);

    // Cal.com API - Try multiple endpoint formats and authentication methods
    let response;
    let bookingId = null;
    
    // First, try to get the booking details to get the numeric ID (if needed)
    try {
      console.log("🔄 Fetching booking details to get booking ID...");
      const getBookingResp = await axios.get(
        `https://api.cal.com/v2/bookings/${bookingUid}`,
        {
          headers: {
            "x-cal-secret-key": apiSecretKey,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
      bookingId = getBookingResp.data?.data?.id || getBookingResp.data?.id;
      console.log(`✓ Found booking ID: ${bookingId} for UID: ${bookingUid}`);
    } catch (getError) {
      console.log(`⚠️ Could not fetch booking details: ${getError.response?.status || getError.message}`);
      // Continue anyway, we'll try with UID
    }
    
    // Method 1: DELETE with x-cal-secret-key using UID
    try {
      console.log("🔄 Trying DELETE with x-cal-secret-key header (using UID)...");
      response = await axios.delete(
        `https://api.cal.com/v2/bookings/${bookingUid}`,
        {
          headers: {
            "x-cal-secret-key": apiSecretKey,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
      console.log("✓ Success with x-cal-secret-key header (UID)");
    } catch (error) {
      console.log(`⚠️ Method 1 failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      
      // Method 2: DELETE with x-cal-secret-key using numeric ID (if available)
      if (bookingId && error.response?.status === 404) {
        try {
          console.log("🔄 Trying DELETE with x-cal-secret-key header (using ID)...");
          response = await axios.delete(
            `https://api.cal.com/v2/bookings/${bookingId}`,
            {
              headers: {
                "x-cal-secret-key": apiSecretKey,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );
          console.log("✓ Success with x-cal-secret-key header (ID)");
        } catch (idError) {
          console.log(`⚠️ Method 2 failed: ${idError.response?.status} - ${idError.response?.data?.message || idError.message}`);
          
          // Method 3: POST with cancellation in body
          try {
            console.log("🔄 Trying POST with cancellation in body...");
            response = await axios.post(
              `https://api.cal.com/v2/bookings/${bookingUid}/cancel`,
              {},
              {
                headers: {
                  "x-cal-secret-key": apiSecretKey,
                  "Content-Type": "application/json",
                },
                timeout: 30000,
              }
            );
            console.log("✓ Success with POST cancel endpoint");
          } catch (postError) {
            console.log(`⚠️ Method 3 failed: ${postError.response?.status} - ${postError.response?.data?.message || postError.message}`);
            
            // Method 4: Try v1 API endpoint (if v2 doesn't support DELETE)
            try {
              console.log("🔄 Trying v1 API endpoint...");
              response = await axios.delete(
                `https://api.cal.com/v1/bookings/${bookingUid}`,
                {
                  headers: {
                    "x-cal-secret-key": apiSecretKey,
                    "Content-Type": "application/json",
                  },
                  timeout: 30000,
                }
              );
              console.log("✓ Success with v1 API");
            } catch (v1Error) {
              console.log(`⚠️ Method 4 (v1) failed: ${v1Error.response?.status} - ${v1Error.response?.data?.message || v1Error.message}`);
              
              // Method 5: DELETE with Authorization Bearer header
              try {
                console.log("🔄 Trying DELETE with Authorization Bearer header...");
                response = await axios.delete(
                  `https://api.cal.com/v2/bookings/${bookingUid}`,
                  {
                    headers: {
                      Authorization: `Bearer ${apiSecretKey}`,
                      "cal-api-version": CAL_API_VERSION,
                      "Content-Type": "application/json",
                    },
                    timeout: 30000,
                  }
                );
                console.log("✓ Success with Authorization Bearer header");
              } catch (bearerError) {
                console.log(`⚠️ Method 5 failed: ${bearerError.response?.status} - ${bearerError.response?.data?.message || bearerError.message}`);
                throw bearerError;
              }
            }
          }
        }
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        // Try Authorization Bearer if auth error
        try {
          console.log("🔄 Trying DELETE with Authorization Bearer header...");
          response = await axios.delete(
            `https://api.cal.com/v2/bookings/${bookingUid}`,
            {
              headers: {
                Authorization: `Bearer ${apiSecretKey}`,
                "cal-api-version": CAL_API_VERSION,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );
          console.log("✓ Success with Authorization Bearer header");
        } catch (bearerError) {
          throw bearerError;
        }
      } else {
        throw error;
      }
    }

    console.log("✓ Booking cancelled successfully:", bookingUid);
    
    return {
      success: true,
      message: "Booking cancelled successfully",
      data: response.data,
    };
  } catch (error) {
    console.error("❌ Error cancelling Cal.com booking:", error.message);
    
    if (error.response) {
      const errorData = error.response.data;
      console.error("API Error Details:", JSON.stringify(errorData, null, 2));
      console.error("API Status:", error.response.status);
      console.error("API Headers:", JSON.stringify(error.response.headers, null, 2));
      
      // If booking not found, it might already be cancelled
      if (error.response.status === 404) {
        console.log("ℹ️ Booking returned 404 - may already be cancelled or endpoint not found");
        return {
          success: true,
          message: "Booking not found (may already be cancelled)",
          details: errorData,
        };
      }
      
      // Log full error for debugging
      console.error("Full error response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: errorData,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });
    } else if (error.request) {
      console.error("❌ No response received from Cal.com API");
      console.error("Request details:", {
        url: error.config?.url,
        method: error.config?.method,
      });
    }

    throw error;
  }
}

// call cancel calBooking fxn

// const res = await cancelCalBooking("1x1uFVg7GU3hihV8JYXJFq");

// console.log("res--->", res);

// Guard to prevent multiple executions
let isSampleFunctionRunning = false;

const genSampleGoogleMeetLink = async () => {
  // Prevent multiple simultaneous executions
  if (isSampleFunctionRunning) {
    console.warn("⚠️ genSampleGoogleMeetLink is already running, skipping duplicate call");
    return null;
  }

  isSampleFunctionRunning = true;
  const startTime = Date.now();
  console.log("🚀 Starting genSampleGoogleMeetLink at", new Date().toISOString());

  try {
    const result = await generateGoogleMeetLink(
      new Date("2025-12-27T10:00:00Z"),
      "Subham Dey1",
      "22je0094@iitism.ac.in",
      "6924d3e788d5dea358af8a08"
    );
    const duration = Date.now() - startTime;
    console.log(`✅ genSampleGoogleMeetLink completed in ${duration}ms`);
    // Handle both old format (string) and new format (object)
    if (typeof result === 'string') {
      console.log("meetLink--->", result);
      return result;
    } else {
      console.log("meetLink--->", result.meetLink);
      console.log("startTime--->", result.startTime);
      console.log("endTime--->", result.endTime);
      return result;
    }
  }
  catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ genSampleGoogleMeetLink failed after ${duration}ms`);
    console.error("Error generating sample Google Meet link:", error.message);
    console.error("Error stack:", error.stack);
    return null;
  }
  finally {
    // Reset the flag after a delay to allow the function to complete
    setTimeout(() => {
      isSampleFunctionRunning = false;
    }, 5000); // 5 second cooldown
  }
}

// Commented out to prevent automatic execution
// Uncomment only when testing manually, and make sure to comment it back after testing
// genSampleGoogleMeetLink();

/**
 * Format date for email display with AM/PM
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string with AM/PM
 */
function formatDateForEmail(date) {
  return formatFullDateTimeWithAMPM(date, "Asia/Kolkata");
}

/**
 * Send email to candidate with Google Meet link
 * @param {string} candidateEmail - Recipient email address
 * @param {string} senderEmail - Sender email address (default: admin@gmail.com)
 * @param {Date} userScheduledAt - Scheduled meeting time
 * @param {string} recruiterName - Recruiter name (optional)
 * @param {string} recruiterEmail - Recruiter email (optional)
 * @param {boolean} meetLinkAlreadyGenerated - Whether meet link was already generated
 * @param {string} existingMeetLink - Existing meet link if already generated
 * @returns {Promise<Object>} - Email send result
 */
export async function sendEmail(
  candidateEmail,
  senderEmail = "subhamdey1114@gmail.com",
  userScheduledAt,
  recruiterName = null,
  recruiterEmail = null,
  meetLinkAlreadyGenerated = false,
  existingMeetLink = null
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
    // Only generate if not already generated
    let meetLink = existingMeetLink;
    let meetLinkError = null;
    let meetingStartTime = null;
    let meetingEndTime = null;
    
    if (!meetLinkAlreadyGenerated || !meetLink) {
      try {
        console.log("🔄 Generating new meet link...");
        const meetLinkResult = await generateGoogleMeetLink(
          userScheduledAt,
          "Candidate",
          candidateEmail
        );
        // Handle both old format (string) and new format (object)
        if (typeof meetLinkResult === 'string') {
          meetLink = meetLinkResult;
        } else {
          meetLink = meetLinkResult.meetLink;
          meetingStartTime = meetLinkResult.startTime;
          meetingEndTime = meetLinkResult.endTime;
        }
        console.log("✓ Meet link generated successfully:", meetLink);
      } catch (error) {
        console.error("Failed to generate Google Meet link:", error.message);
        meetLinkError = error.message;
        meetLink = null; // Set to null so we can handle it in the email template
      }
    } else {
      console.log("✓ Using existing meet link (already generated):", meetLink);
    }

    const formattedDate = formatDateForEmail(userScheduledAt);

    // Determine what to show for the meeting link
    const meetingLinkDisplay = meetLink || "Link will be sent separately";
    const meetingLinkHref = meetLink || "#";
    const showLinkError = meetLinkError ? ` (Error: ${meetLinkError})` : "";

    // Build recipient list - include recruiter if provided
    const recipients = [candidateEmail];
    if (recruiterEmail) {
      recipients.push(recruiterEmail);
    }

    const mailOptions = {
      from: `"AI Recruitment Team" <${senderEmail}>`,
      to: recipients.join(", "), // Send to both candidate and recruiter
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
              
              ${
                recruiterName
                  ? `
              <div class="info-box">
                <strong>👤 Interviewer:</strong><br>
                ${recruiterName}${recruiterEmail ? ` (${recruiterEmail})` : ""}
              </div>
              `
                  : ""
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
      `Email sent successfully to ${recipients.join(", ")}:`,
      info.messageId
    );

    return {
      success: true,
      messageId: info.messageId,
      recipients: recipients,
      meetLink: meetLink, // Return the meet link so it can be saved
      startTime: meetingStartTime, // Return start time if available
      endTime: meetingEndTime, // Return end time if available
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
