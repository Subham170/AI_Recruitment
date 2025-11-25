import { pipeline } from "@xenova/transformers";

// Singleton pattern to ensure we only load the model once
let extractor = null;

/**
 * Get embedding vector for a given text
 * @param {string} text - The text to generate embedding for
 * @returns {Promise<Array<number>>} - Array of 384 numbers representing the embedding vector
 */
export async function getEmbedding(text) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Text must be a non-empty string");
  }

  // Initialize the model on first use
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }

  // Generate embedding
  const output = await extractor(text, { pooling: "mean", normalize: true });
  // Convert Float32Array to standard JS Array
  return Array.from(output.data);
}

/**
 * Generate embedding text from candidate data
 * @param {Object} candidate - Candidate object with name, bio, skills
 * @returns {string} - Formatted text for embedding
 */
export function generateCandidateEmbeddingText(candidate) {
  const { name = "", bio = "", skills = [] } = candidate;
  const skillsText = Array.isArray(skills) ? skills.join(", ") : "";
  return `${name}. ${bio}. Skills: ${skillsText}`.trim();
}

/**
 * Generate embedding text from job posting data
 * @param {Object} jobPosting - Job posting object with title, description, skills, exp_req
 * @returns {string} - Formatted text for embedding
 */
export function generateJobEmbeddingText(jobPosting) {
  const { title = "", description = "", skills = [], exp_req = 0 } = jobPosting;
  const skillsText = Array.isArray(skills) ? skills.join(", ") : "";
  const expText = exp_req > 0 ? `Experience required: ${exp_req} years.` : "";
  return `${title}. ${description}. ${expText} Skills: ${skillsText}`.trim();
}

/**
 * Generate embedding vector for a candidate
 * @param {Object} candidate - Candidate object
 * @returns {Promise<Array<number>>} - Embedding vector
 */
export async function generateCandidateEmbedding(candidate) {
  const text = generateCandidateEmbeddingText(candidate);
  return await getEmbedding(text);
}

/**
 * Generate embedding vector for a job posting
 * @param {Object} jobPosting - Job posting object
 * @returns {Promise<Array<number>>} - Embedding vector
 */
export async function generateJobEmbedding(jobPosting) {
  const text = generateJobEmbeddingText(jobPosting);
  return await getEmbedding(text);
}
