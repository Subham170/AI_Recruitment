import { format } from "date-fns";

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
  } = options;

  if (includeDate && includeTime && includeWeekday) {
    return format(dateObj, "EEEE, MMMM d, yyyy 'at' h:mm a");
  } else if (includeDate && includeTime) {
    return format(dateObj, "MMMM d, yyyy 'at' h:mm a");
  } else if (includeDate && includeWeekday) {
    return format(dateObj, "EEEE, MMMM d, yyyy");
  } else if (includeDate) {
    return format(dateObj, "MMMM d, yyyy");
  } else if (includeTime) {
    return format(dateObj, "h:mm a");
  }

  return format(dateObj, "MMMM d, yyyy 'at' h:mm a");
}

/**
 * Format time only with AM/PM
 * @param {Date|string} date - Date to extract time from
 * @returns {string} - Formatted time string (e.g., "2:30 PM")
 */
export function formatTimeWithAMPM(date) {
  if (!date) return "TBD";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Time";
  }

  return format(dateObj, "h:mm a");
}

/**
 * Format date only (no time)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDateOnly(date) {
  if (!date) return "TBD";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  return format(dateObj, "EEEE, MMMM d, yyyy");
}

/**
 * Format full date and time with AM/PM for emails and user-facing content
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted string (e.g., "Monday, December 15, 2024 at 2:30 PM")
 */
export function formatFullDateTimeWithAMPM(date) {
  if (!date) return "TBD";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  return format(dateObj, "EEEE, MMMM d, yyyy 'at' h:mm a");
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
 * Format date and time for display in lists/cards
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted string (e.g., "Dec 15, 2024 at 2:30 PM")
 */
export function formatDateTimeShort(date) {
  if (!date) return "TBD";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  return format(dateObj, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Format date only in short format (no time)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted string (e.g., "Dec 15, 2024")
 */
export function formatDateShort(date) {
  if (!date) return "TBD";

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  return format(dateObj, "MMM dd, yyyy");
}

