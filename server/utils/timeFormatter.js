/**
 * Utility functions for formatting dates and times with AM/PM format
 * This helps LLMs and users better understand time references
 */

/**
 * Format date and time with AM/PM for display
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string with AM/PM
 */
export function formatDateTimeWithAMPM(date, options = {}) {
  if (!date) return "TBD";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  const {
    includeDate = true,
    includeTime = true,
    includeWeekday = false,
    timeZone = "Asia/Kolkata",
  } = options;

  const formatOptions = {
    timeZone,
    hour12: true, // Use AM/PM format
  };

  if (includeWeekday) {
    formatOptions.weekday = "long";
  }

  if (includeDate) {
    formatOptions.year = "numeric";
    formatOptions.month = "long";
    formatOptions.day = "numeric";
  }

  if (includeTime) {
    formatOptions.hour = "numeric";
    formatOptions.minute = "2-digit";
  }

  return new Intl.DateTimeFormat("en-US", formatOptions).format(dateObj);
}

/**
 * Format time only with AM/PM
 * @param {Date|string} date - Date to extract time from
 * @param {string} timeZone - Timezone (default: Asia/Kolkata)
 * @returns {string} - Formatted time string (e.g., "2:30 PM")
 */
export function formatTimeWithAMPM(date, timeZone = "Asia/Kolkata") {
  if (!date) return "TBD";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Time";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true, // AM/PM format
    timeZone,
  }).format(dateObj);
}

/**
 * Format date only (no time)
 * @param {Date|string} date - Date to format
 * @param {string} timeZone - Timezone (default: Asia/Kolkata)
 * @returns {string} - Formatted date string
 */
export function formatDateOnly(date, timeZone = "Asia/Kolkata") {
  if (!date) return "TBD";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(dateObj);
}

/**
 * Format full date and time with AM/PM for emails and user-facing content
 * @param {Date|string} date - Date to format
 * @param {string} timeZone - Timezone (default: Asia/Kolkata)
 * @returns {string} - Formatted string (e.g., "Monday, December 15, 2024 at 2:30 PM IST")
 */
export function formatFullDateTimeWithAMPM(date, timeZone = "Asia/Kolkata") {
  if (!date) return "TBD";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true, // AM/PM format
    timeZoneName: "short",
    timeZone,
  }).format(dateObj);

  return formatted;
}

/**
 * Convert 24-hour time string (HH:MM) to 12-hour with AM/PM
 * @param {string} time24 - Time in 24-hour format (e.g., "14:30")
 * @returns {string} - Time in 12-hour format with AM/PM (e.g., "2:30 PM")
 */
export function convert24To12Hour(time24) {
  if (!time24 || typeof time24 !== "string") {
    return time24;
  }

  const [hours, minutes] = time24.split(":").map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return time24;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format availability slot time range with AM/PM
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {string} - Formatted time range (e.g., "10:00 AM - 2:30 PM")
 */
export function formatTimeRangeWithAMPM(startTime, endTime) {
  const start = convert24To12Hour(startTime);
  const end = convert24To12Hour(endTime);
  return `${start} - ${end}`;
}

/**
 * Format date and time for LLM prompts (more natural language)
 * @param {Date|string} date - Date to format
 * @param {string} timeZone - Timezone (default: Asia/Kolkata)
 * @returns {string} - Natural language format (e.g., "December 15, 2024 at 2:30 PM")
 */
export function formatDateTimeForLLM(date, timeZone = "Asia/Kolkata") {
  if (!date) return "not specified";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "invalid date";
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true, // AM/PM format
    timeZone,
  }).format(dateObj);

  return formatted;
}

/**
 * Get current date and time formatted with AM/PM for LLM prompts
 * @param {string} timeZone - Timezone (default: Asia/Kolkata)
 * @returns {string} - Current date/time formatted (e.g., "December 12, 2024 at 7:35 PM IST")
 */
export function getCurrentDateTimeForLLM(timeZone = "Asia/Kolkata") {
  const now = new Date();
  return formatFullDateTimeWithAMPM(now, timeZone);
}

