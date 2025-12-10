import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import axios from "axios";
import dotenv from "dotenv";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Initialize LLM client
const llmClient = OPENAI_API_KEY
  ? new ChatOpenAI({
      apiKey: OPENAI_API_KEY,
      modelName: OPENAI_MODEL,
      temperature: 0,
    })
  : null;

/**
 * Extract text from PDF file
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromPDF = async (fileBuffer) => {
  try {
    // pdf-parse v2.4.5 uses a class-based API
    const parser = new PDFParse({ data: fileBuffer });
    const textResult = await parser.getText();
    // Clean up resources
    await parser.destroy();
    // Return the full text (concatenated from all pages)
    return textResult.text || "";
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

/**
 * Extract text from DOCX file
 * @param {Buffer} fileBuffer - DOCX file buffer
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromDOCX = async (fileBuffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
};

/**
 * Extract text from resume file based on file extension
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name with extension
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromFile = async (fileBuffer, fileName) => {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("File buffer is required");
  }

  const fileExtension = fileName
    ? fileName.toLowerCase().substring(fileName.lastIndexOf("."))
    : "";

  switch (fileExtension) {
    case ".pdf":
      return await extractTextFromPDF(fileBuffer);
    case ".docx":
      return await extractTextFromDOCX(fileBuffer);
    case ".doc":
      // Try DOCX parser first (some DOC files can be read)
      try {
        return await extractTextFromDOCX(fileBuffer);
      } catch (error) {
        throw new Error(
          "DOC format is not fully supported. Please convert to PDF or DOCX format."
        );
      }
    default:
      throw new Error(
        `Unsupported file format: ${fileExtension}. Supported formats: .pdf, .docx, .doc`
      );
  }
};

/**
 * Parse resume text using LLM to extract structured data
 * @param {string} resumeText - Extracted text from resume
 * @returns {Promise<Object>} Parsed resume data
 */
const parseResumeWithLLM = async (resumeText) => {
  if (!llmClient) {
    throw new Error("OpenAI API key is not configured");
  }

  if (!resumeText || resumeText.trim().length === 0) {
    throw new Error("Resume text is empty or invalid");
  }

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert resume parser. Extract structured information from the resume text provided.
      You MUST return ONLY valid JSON, no additional text, no markdown formatting, no code blocks.
      
      Return a JSON object with the following structure:
      {{
        "name": "Full name of the candidate",
        "email": "Email address",
        "phone": "Phone number (or phone_no)",
        "skills": ["array", "of", "skills"],
        "experience": [
          {{
            "company": "Company name",
            "position": "Job title/position",
            "dates": "Date range (e.g., '2020-2023' or 'Jan 2020 - Present')",
            "description": "Job description or responsibilities"
          }}
        ],
        "education": [
          {{
            "name": "Degree/Institution name",
            "dates": "Date range (e.g., '2016-2020')",
            "field": "Field of study (if available)"
          }}
        ],
        "bio": "Brief summary or objective if available"
      }}
      
      If any field is not found, use an empty string for strings, empty array for arrays, or 0 for numbers.
      Be thorough and extract all available information. Return ONLY the JSON object, nothing else.`,
    ],
    ["human", "Parse this resume:\n\n{resumeText}"],
  ]);

  const outputParser = new JsonOutputParser();
  const chain = prompt.pipe(llmClient).pipe(outputParser);

  try {
    const result = await chain.invoke({ resumeText });
    return result;
  } catch (error) {
    throw new Error(`Failed to parse resume with LLM: ${error.message}`);
  }
};

/**
 * Download file from URL
 * @param {string} url - Publicly reachable URL to the file
 * @returns {Promise<{buffer: Buffer, fileName: string}>} File buffer and name
 */
const downloadFileFromUrl = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      maxContentLength: 10 * 1024 * 1024, // 10MB limit
      timeout: 30000, // 30 second timeout
    });

    const buffer = Buffer.from(response.data);
    const fileName =
      response.headers["content-disposition"]?.match(
        /filename="?(.+)"?/
      )?.[1] ||
      url.split("/").pop() ||
      "resume.pdf";

    return { buffer, fileName };
  } catch (error) {
    if (error.response) {
      throw new Error(`Failed to download file: HTTP ${error.response.status}`);
    } else if (error.request) {
      throw new Error("No response from URL");
    } else {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }
};

/**
 * Parse resume from a URL
 * @param {string} url - Publicly reachable URL to the resume file
 * @returns {Promise<Object>} Parsed resume data
 */
export const parseResumeFromUrl = async (url) => {
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
    // Download the file
    const { buffer, fileName } = await downloadFileFromUrl(url);

    // Extract text from the file
    const resumeText = await extractTextFromFile(buffer, fileName);

    // Parse with LLM
    const parsedData = await parseResumeWithLLM(resumeText);

    return parsedData;
  } catch (error) {
    throw new Error(`Failed to parse resume from URL: ${error.message}`);
  }
};

/**
 * Parse resume from uploaded file
 * @param {Buffer} fileBuffer - File buffer data
 * @param {string} fileName - Original file name
 * @returns {Promise<Object>} Parsed resume data
 */
export const parseResumeFromFile = async (fileBuffer, fileName) => {
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

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileBuffer.length > maxSize) {
    throw new Error("File size exceeds 10MB limit");
  }

  try {
    // Extract text from the file
    const resumeText = await extractTextFromFile(fileBuffer, fileName);

    // Parse with LLM
    const parsedData = await parseResumeWithLLM(resumeText);

    return parsedData;
  } catch (error) {
    throw new Error(`Failed to parse resume from file: ${error.message}`);
  }
};

/**
 * Format parsed resume data to match our candidate schema
 * @param {Object} parsedData - Raw parsed data from LLM
 * @returns {Object} Formatted candidate data
 */
export const formatParsedResumeData = (parsedData) => {
  const formatted = {
    name: parsedData.name || "",
    email: parsedData.email || "",
    phone_no: parsedData.phone || parsedData.phone_no || "",
    skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
    experience: 0,
    bio: parsedData.bio || "",
  };

  // Calculate experience from experience array
  if (parsedData.experience && Array.isArray(parsedData.experience)) {
    // Try to extract years from dates
    const dates = parsedData.experience.map((exp) => exp.dates).filter(Boolean);
    if (dates.length > 0) {
      // Simple calculation: extract years from date ranges
      const currentYear = new Date().getFullYear();
      const years = dates.map((date) => {
        const dateStr = date.toString();
        // Try to extract start year (first 4-digit number)
        const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          return isNaN(year) ? 0 : currentYear - year;
        }
        return 0;
      });
      formatted.experience = Math.max(...years, 0);
    }
  }

  // Format education into bio if bio is empty
  if (
    !formatted.bio &&
    parsedData.education &&
    Array.isArray(parsedData.education)
  ) {
    const educationText = parsedData.education
      .map((edu) => {
        const parts = [edu.name || ""];
        if (edu.field) parts.push(`in ${edu.field}`);
        if (edu.dates) parts.push(`(${edu.dates})`);
        return parts.filter(Boolean).join(" ");
      })
      .join(", ");
    if (educationText) {
      formatted.bio = formatted.bio
        ? `${formatted.bio}. Education: ${educationText}`
        : `Education: ${educationText}`;
    }
  }

  return formatted;
};
