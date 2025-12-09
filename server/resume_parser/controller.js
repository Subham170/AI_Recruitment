import axios from "axios";

const RESUME_PARSER_API_KEY = process.env.RESUME_PARSER_API_KEY || "jfTxobr1s6kj6YCUBo4onqCTNmBHnI1l";
const RESUME_PARSER_BASE_URL = "https://api.apilayer.com/resume_parser";

/**
 * Parse resume from a URL
 * @param {string} url - Publicly reachable URL to the resume file
 * @returns {Promise<Object>} Parsed resume data
 */
export const parseResumeFromUrl = async (url) => {
  if (!RESUME_PARSER_API_KEY) {
    throw new Error("Resume Parser API key is not configured");
  }

  if (!url) {
    throw new Error("URL is required");
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    throw new Error("Invalid URL format");
  }

  try {
    const response = await axios.get(`${RESUME_PARSER_BASE_URL}/url`, {
      params: { url },
      headers: {
        apikey: RESUME_PARSER_API_KEY,
      },
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      // API returned an error response
      throw new Error(
        error.response.data?.message ||
          error.response.data?.error ||
          `Resume parser API error: ${error.response.status}`
      );
    } else if (error.request) {
      // Request was made but no response received
      throw new Error("No response from resume parser service");
    } else {
      // Error in setting up the request
      throw new Error(`Failed to parse resume: ${error.message}`);
    }
  }
};

/**
 * Parse resume from uploaded file
 * @param {Buffer} fileBuffer - File buffer data
 * @param {string} fileName - Original file name
 * @returns {Promise<Object>} Parsed resume data
 */
export const parseResumeFromFile = async (fileBuffer, fileName) => {
  if (!RESUME_PARSER_API_KEY) {
    throw new Error("Resume Parser API key is not configured");
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("File buffer is required");
  }

  // Validate file extension
  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const fileExtension = fileName
    ? fileName.toLowerCase().substring(fileName.lastIndexOf("."))
    : "";

  if (!allowedExtensions.includes(fileExtension)) {
    throw new Error(
      `Invalid file type. Supported formats: ${allowedExtensions.join(", ")}`
    );
  }

  // Validate file size (max 10MB for API)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileBuffer.length > maxSize) {
    throw new Error("File size exceeds 10MB limit");
  }

  try {
    const response = await axios.post(
      `${RESUME_PARSER_BASE_URL}/upload`,
      fileBuffer,
      {
        headers: {
          apikey: RESUME_PARSER_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      // API returned an error response
      throw new Error(
        error.response.data?.message ||
          error.response.data?.error ||
          `Resume parser API error: ${error.response.status}`
      );
    } else if (error.request) {
      // Request was made but no response received
      throw new Error("No response from resume parser service");
    } else {
      // Error in setting up the request
      throw new Error(`Failed to parse resume: ${error.message}`);
    }
  }
};

/**
 * Format parsed resume data to match our candidate schema
 * @param {Object} parsedData - Raw parsed data from API
 * @returns {Object} Formatted candidate data
 */
export const formatParsedResumeData = (parsedData) => {
  const formatted = {
    name: parsedData.name || "",
    email: parsedData.email || "",
    phone_no: parsedData.phone || parsedData.phone_no || "",
    skills: parsedData.skills || [],
    experience: 0,
    bio: "",
  };

  // Calculate experience from experience array
  if (parsedData.experience && Array.isArray(parsedData.experience)) {
    // Try to extract years from dates
    const dates = parsedData.experience.map((exp) => exp.dates).filter(Boolean);
    if (dates.length > 0) {
      // Simple calculation: assume current year if no end date
      const currentYear = new Date().getFullYear();
      const years = dates.map((date) => {
        const year = parseInt(date.toString().substring(0, 4));
        return isNaN(year) ? 0 : currentYear - year;
      });
      formatted.experience = Math.max(...years, 0);
    }
  }

  // Format education into bio if available
  if (parsedData.education && Array.isArray(parsedData.education)) {
    const educationText = parsedData.education
      .map((edu) => `${edu.name}${edu.dates ? ` (${edu.dates})` : ""}`)
      .join(", ");
    formatted.bio = educationText;
  }

  return formatted;
};
