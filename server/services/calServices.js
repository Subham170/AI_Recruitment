import axios from "axios";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file in the server root directory
dotenv.config({ path: join(__dirname, "../.env") });

export async function createMeetLinkBackend(dateTimeISO, name, email) {
  try {
    // Validate required environment variables
    if (!process.env.CAL_EVENT_ID) {
      throw new Error("CAL_EVENT_ID environment variable is not set");
    }
    if (!process.env.CAL_SECRET_KEY) {
      throw new Error("CAL_SECRET_KEY environment variable is not set");
    }

    // Validate input parameters
    if (!dateTimeISO || !name || !email) {
      throw new Error("dateTimeISO, name, and email are required");
    }

    // Ensure dateTimeISO is in the correct format (ISO 8601)
    // If timezone is missing, interpret as Asia/Kolkata (IST) timezone
    let dateTime;

    // Check if the date string includes timezone info (has 'Z' or '+/-HH:mm')
    const hasTimezone =
      dateTimeISO.includes("Z") || /[+-]\d{2}:\d{2}$/.test(dateTimeISO);

    if (!hasTimezone) {
      // If no timezone, interpret as IST (UTC+5:30)
      // Append '+05:30' to the date string to explicitly set IST timezone
      const istDateTimeString = dateTimeISO.endsWith("Z")
        ? dateTimeISO.replace("Z", "+05:30")
        : dateTimeISO + "+05:30";
      dateTime = new Date(istDateTimeString);
    } else {
      dateTime = new Date(dateTimeISO);
    }

    if (isNaN(dateTime.getTime())) {
      throw new Error(
        `Invalid date format: ${dateTimeISO}. Use ISO 8601 format (e.g., 2025-11-26T02:45:00 or 2025-11-26T02:45:00+05:30)`
      );
    }

    // Check if the booking time is in the future using Date.now() for accurate comparison
    const now = Date.now();
    const bookingTime = dateTime.getTime();
    const minBookingTime = now + 5 * 60 * 1000; // 5 minutes from now (minimum advance booking)

    if (bookingTime < minBookingTime) {
      const minutesAway = Math.round((bookingTime - now) / 60000);
      throw new Error(
        `Booking time must be at least 5 minutes in the future. Provided time: ${dateTimeISO}, Current time: ${new Date(
          now
        ).toISOString()}, Time difference: ${minutesAway} minutes`
      );
    }

    // Format the dateTimeISO to ensure it's in the correct timezone format
    // Cal.com expects ISO 8601 format with timezone
    const formattedDateTime = dateTime.toISOString();

    // Try both string and number for eventTypeId (Cal.com API can accept either)
    const eventTypeId = process.env.CAL_EVENT_ID;
    const eventTypeIdNum = parseInt(eventTypeId);
    const isNumeric =
      !isNaN(eventTypeIdNum) && eventTypeIdNum.toString() === eventTypeId;

    const requestBody = {
      eventTypeId: isNumeric ? eventTypeIdNum : eventTypeId, // Use number if numeric, else string
      start: formattedDateTime, // Cal.com v2 API expects 'start' not 'startTime'
      language: "en", // Required field - language code
      metadata: {}, // Required field - can be empty object
      responses: {
        name: name,
        email: email,
      },
      timeZone: "Asia/Kolkata", // Add timezone
    };

    console.log("📤 Sending request to Cal.com API:", {
      url: "https://api.cal.com/v2/bookings",
      eventTypeId: requestBody.eventTypeId,
      start: requestBody.start,
      language: requestBody.language,
      hasSecretKey: !!process.env.CAL_SECRET_KEY,
    });

    const response = await axios.post(
      "https://api.cal.com/v2/bookings",
      requestBody,
      {
        headers: {
          "x-cal-secret-key": process.env.CAL_SECRET_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // Extract meet link from response
    // The structure might vary, so we'll check multiple possible paths
    const meetLink =
      response.data?.data?.metadata?.conferencing?.url ||
      response.data?.data?.conferenceData?.entryPoints?.[0]?.uri ||
      response.data?.data?.location ||
      null;

    if (!meetLink) {
      console.warn(
        "⚠️ No meet link found in response:",
        JSON.stringify(response.data, null, 2)
      );
    }

    return {
      meetLink,
      bookingId: response.data?.data?.id || response.data?.id,
      fullResponse: response.data,
    };
  } catch (error) {
    // Enhanced error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("❌ Cal.com API Error Response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        errors:
          error.response.data?.error?.details?.errors ||
          error.response.data?.errors,
      });

      // Extract more specific error message
      const errorDetails = error.response.data?.error?.details?.errors || [];
      const errorMessages = errorDetails
        .map((e) => {
          const constraints = e.constraints || {};
          const constraintMessages = Object.values(constraints).join(", ");
          return `${e.property}: ${constraintMessages || "validation failed"}`;
        })
        .join("; ");

      throw new Error(
        `Cal.com API Error (${error.response.status}): ${
          error.response.data?.error?.message ||
          errorMessages ||
          "Unknown error"
        }`
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error("❌ No response from Cal.com API:", error.request);
      throw new Error(
        "No response from Cal.com API. Check your network connection."
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("❌ Error setting up request:", error.message);
      throw error;
    }
  }
}

// Test call with a future time (5 minutes from now)
// Calculate a time 5 minutes from now using Date.now() to ensure it's valid
const now = Date.now();
const futureTimeMs = now + 5 * 60 * 1000; // 5 minutes from now in milliseconds
const futureTime = new Date(futureTimeMs);
futureTime.setSeconds(0);
futureTime.setMilliseconds(0);

// Format in IST timezone (Asia/Kolkata, UTC+5:30) for testing
// Format: YYYY-MM-DDTHH:mm (without timezone, will be interpreted as IST by our function)
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const parts = formatter.formatToParts(futureTime);
const futureTimeISO = `${parts.find((p) => p.type === "year").value}-${
  parts.find((p) => p.type === "month").value
}-${parts.find((p) => p.type === "day").value}T${
  parts.find((p) => p.type === "hour").value
}:${parts.find((p) => p.type === "minute").value}`;

// Get current IST time for display
const nowParts = formatter.formatToParts(new Date(now));
const nowTimeISO = `${nowParts.find((p) => p.type === "year").value}-${
  nowParts.find((p) => p.type === "month").value
}-${nowParts.find((p) => p.type === "day").value}T${
  nowParts.find((p) => p.type === "hour").value
}:${nowParts.find((p) => p.type === "minute").value}`;

console.log("futureTimeISO (IST format, no timezone):", futureTimeISO);
console.log("Current time (IST):", nowTimeISO);

console.log(
  `🕐 Scheduling booking for: ${futureTimeISO} IST (${futureTime.toLocaleString(
    "en-IN",
    { timeZone: "Asia/Kolkata" }
  )})`
);

const futureTimeISO2 = new Date(Date.now() + 10 * 60 * 1000).toISOString();

const result = await createMeetLinkBackend(futureTimeISO2, "Subham Dey", "22je0094@iitism.ac.in");
console.log("✅ Booking created successfully:", result);
