import { pipeline } from "@xenova/transformers";
import OpenAI from "openai";

// Singleton pattern to ensure we only load the model once
let extractor = null;
let openaiClient = null;

/**
 * Initialize OpenAI client if API key is available
 */
function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Get embedding vector for a given text using OpenAI (1536 dimensions)
 * Falls back to local model (384 dimensions) if OpenAI is not configured
 * @param {string} text - The text to generate embedding for
 * @returns {Promise<Array<number>>} - Array of 1536 numbers (or 384 if using local model)
 */
export async function getEmbedding(text) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Text must be a non-empty string");
  }

  // Try to use OpenAI first (1536 dimensions)
  const client = getOpenAIClient();
  if (client) {
    try {
      const response = await client.embeddings.create({
        model: "text-embedding-3-large",
        input: text,
        dimensions: 1536, // Use 1536 dimensions
      });
      return response.data[0].embedding;
    } catch (error) {
      console.warn(
        "OpenAI embedding failed, falling back to local model:",
        error.message
      );
      // Fall through to local model
    }
  }

  // Fallback to local model (384 dimensions) if OpenAI is not available
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }

  // Generate embedding
  const output = await extractor(text, { pooling: "mean", normalize: true });
  // Convert Float32Array to standard JS Array
  return Array.from(output.data);
}

/**
 * Generate embedding text from candidate data with proper weightage
 * Skills and role are heavily weighted as they are most important for matching
 * @param {Object} candidate - Candidate object with name, bio, skills, experience, role
 * @returns {string} - Formatted text for embedding with proper emphasis
 */
export function generateCandidateEmbeddingText(candidate) {
  const { name = "", bio = "", skills = [], experience = 0, role = [] } = candidate;
  
  // Format role (array) into text
  const roleText = Array.isArray(role) ? role.join(", ") : (role || "");
  
  // Format skills (array) - repeat them for emphasis (embedding models weight repeated terms)
  const skillsArray = Array.isArray(skills) ? skills : [];
  const skillsText = skillsArray.join(", ");
  // Repeat skills with different phrasing for better matching
  const skillsEmphasized = skillsArray.length > 0 
    ? `Skills: ${skillsText}. Expertise in: ${skillsText}. Proficient with: ${skillsText}`
    : "";
  
  // Experience text
  const expText = experience > 0 
    ? `Experience: ${experience} years. ${experience} years of professional experience.`
    : "";
  
  // Build structured text with proper weightage:
  // 1. Role (most important - appears first and multiple times)
  // 2. Skills (very important - repeated multiple times)
  // 3. Experience (important - mentioned clearly)
  // 4. Bio (contextual - included but not dominant)
  // 5. Name (minimal - just for context)
  
  const parts = [];
  
  if (roleText) {
    parts.push(`Role: ${roleText}. Position: ${roleText}.`);
  }
  
  if (skillsEmphasized) {
    parts.push(skillsEmphasized);
  }
  
  if (expText) {
    parts.push(expText);
  }
  
  if (bio) {
    parts.push(`Background: ${bio}`);
  }
  
  if (name) {
    parts.push(`Name: ${name}`);
  }
  
  return parts.join(" ").trim();
}

/**
 * Generate embedding text from job posting data with proper weightage
 * Skills and requirements are heavily weighted as they are most important for matching
 * @param {Object} jobPosting - Job posting object with title, description, skills, exp_req, role
 * @returns {string} - Formatted text for embedding with proper emphasis
 */
export function generateJobEmbeddingText(jobPosting) {
  const { title = "", description = "", skills = [], exp_req = 0, role = [] } = jobPosting;
  
  // Format role (array) into text
  const roleText = Array.isArray(role) ? role.join(", ") : (role || "");
  
  // Format skills (array) - repeat them for emphasis
  const skillsArray = Array.isArray(skills) ? skills : [];
  const skillsText = skillsArray.join(", ");
  // Repeat skills with different phrasing for better matching
  const skillsEmphasized = skillsArray.length > 0 
    ? `Required Skills: ${skillsText}. Must have expertise in: ${skillsText}. Required proficiency with: ${skillsText}`
    : "";
  
  // Experience requirement text - emphasize
  const expText = exp_req > 0 
    ? `Experience Required: ${exp_req} years. Minimum ${exp_req} years of experience needed.`
    : "";
  
  // Extract key requirements from description (first 500 chars to avoid dilution)
  // Focus on requirements section if present
  const descriptionSummary = description 
    ? (description.length > 500 
        ? description.substring(0, 500) + "..."
        : description)
    : "";
  
  // Build structured text with proper weightage:
  // 1. Title and Role (most important - appears first)
  // 2. Skills (very important - repeated multiple times)
  // 3. Experience requirement (important - mentioned clearly)
  // 4. Description summary (contextual - truncated to avoid dilution)
  
  const parts = [];
  
  if (title) {
    parts.push(`Job Title: ${title}. Position: ${title}.`);
  }
  
  if (roleText) {
    parts.push(`Required Role: ${roleText}. Position Type: ${roleText}.`);
  }
  
  if (skillsEmphasized) {
    parts.push(skillsEmphasized);
  }
  
  if (expText) {
    parts.push(expText);
  }
  
  if (descriptionSummary) {
    parts.push(`Job Description: ${descriptionSummary}`);
  }
  
  return parts.join(" ").trim();
}

/**
 * Generate embedding vector for a candidate
 * @param {Object} candidate - Candidate object
 * @returns {Promise<Array<number>>} - Embedding vector (1536 dimensions if OpenAI is configured, 384 otherwise)
 */
export async function generateCandidateEmbedding(candidate) {
  const text = generateCandidateEmbeddingText(candidate);
  return await getEmbedding(text);
}

/**
 * Generate embedding vector for a job posting
 * @param {Object} jobPosting - Job posting object
 * @returns {Promise<Array<number>>} - Embedding vector (1536 dimensions if OpenAI is configured, 384 otherwise)
 */
export async function generateJobEmbedding(jobPosting) {
  const text = generateJobEmbeddingText(jobPosting);
  return await getEmbedding(text);
}

