import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import {
  convert24To12Hour,
  getCurrentDateTimeForLLM,
} from "../utils/timeFormatter.js";
import BolnaCall from "./model.js";
import Candidate from "../candidates/model.js";
import User from "../user/model.js";
import { generateGoogleMeetLink } from "../services/emailService.js";

dotenv.config();

const BOLNA_API_URL = process.env.BOLNA_API_URL || "https://api.bolna.ai/call";
const BOLNA_API_KEY = process.env.BOLNA_API_KEY;
const BOLNA_AGENT_ID = process.env.BOLNA_AGENT_ID;
const BOLNA_FROM_PHONE = process.env.BOLNA_FROM_PHONE;
const BOLNA_EXECUTIONS_URL =
  process.env.BOLNA_EXECUTIONS_URL || "https://api.bolna.ai/executions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const CALL_SCHEDULED_DELAY = parseInt(process.env.CALL_SCHEDULED_DELAY) || 5; // 5 minutes default

const llmClient = OPENAI_API_KEY
  ? new ChatOpenAI({
      apiKey: OPENAI_API_KEY,
      modelName: OPENAI_MODEL,
      temperature: 0,
    })
  : null;

function ensureBolnaConfig() {
  if (!BOLNA_API_KEY) {
    throw new Error("BOLNA_API_KEY is not configured");
  }
  if (!BOLNA_AGENT_ID) {
    throw new Error("BOLNA_AGENT_ID is not configured");
  }
  if (!BOLNA_FROM_PHONE) {
    throw new Error("BOLNA_FROM_PHONE is not configured");
  }
}

export const scheduleBolnaCall = async (req, res) => {
  try {
    ensureBolnaConfig();

    const { candidateId, jobId, job_description, ...callData } = req.body;
    const { recipient_phone_number, scheduled_at } = callData;

    if (!candidateId || !jobId) {
      return res.status(400).json({
        message: "candidateId and jobId are required in the request body",
      });
    }

    if (!recipient_phone_number || !scheduled_at) {
      return res.status(400).json({
        message:
          "recipient_phone_number and scheduled_at are required in the request body",
      });
    }

    // Add job description to user_data if provided
    const updatedCallData = { ...callData };
    if (job_description) {
      if (!updatedCallData.user_data) {
        updatedCallData.user_data = {};
      }
      updatedCallData.user_data.job_description = job_description;
    }

    const payload = {
      ...updatedCallData,
      agent_id: BOLNA_AGENT_ID,
      from_phone_number: BOLNA_FROM_PHONE,
    };

    console.log("payload1--->", payload);
    const response = await fetch(BOLNA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BOLNA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to schedule call with Bolna API",
        details: data,
      });
    }

    const executionId =
      data.execution_id || data.executionId || data.id || data?.call_id;

    if (!executionId) {
      return res.status(500).json({
        message: "Bolna API did not return an execution_id",
        bolnaResponse: data,
      });
    }

    // convert scheduled_at to Date
    console.log("scheduled_at", scheduled_at);
    const scheduledAt = new Date(scheduled_at);
    const callScheduledAt = new Date(
      new Date(scheduledAt).getTime() + CALL_SCHEDULED_DELAY * 60 * 1000
    );

    console.log("callScheduledAt", callScheduledAt);

    const bolnaCall = await BolnaCall.create({
      candidateId,
      jobId,
      executionId,
      status: data.status || data.state || "scheduled",
      callScheduledAt: callScheduledAt,
      userScheduledAt: null,
      jobDescription: job_description || null,
      screeningStatus: "pending",
    });

    res.status(200).json({
      message: "Call scheduled successfully",
      bolnaResponse: data,
      record: {
        id: bolnaCall._id,
        candidateId: bolnaCall.candidateId,
        jobId: bolnaCall.jobId,
        executionId: bolnaCall.executionId,
        status: bolnaCall.status,
      },
    });
  } catch (error) {
    console.error("Error scheduling Bolna call:", error);
    res.status(500).json({
      message: error.message || "Failed to schedule call",
    });
  }
};

async function fetchBolnaExecution(executionId) {
  const response = await fetch(`${BOLNA_EXECUTIONS_URL}/${executionId}`, {
    headers: {
      Authorization: `Bearer ${BOLNA_API_KEY}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Bolna execution fetch failed with status ${response.status}`
    );
  }

  return data;
}

// HTTP endpoint wrapper for screening transcript
export const triggerScreening = async (req, res) => {
  try {
    const { executionId } = req.params;

    if (!executionId) {
      return res.status(400).json({
        message: "executionId is required",
      });
    }

    const result = await screeningTranscript(executionId);

    res.status(200).json({
      message: "Screening completed successfully",
      ...result,
    });
  } catch (error) {
    console.error("Error triggering screening:", error);
    res.status(500).json({
      message: error.message || "Failed to trigger screening",
    });
  }
};

// Analyze transcript and calculate screening score using LLM
export async function screeningTranscript(executionId) {
  try {
    if (!executionId) {
      throw new Error("executionId is required");
    }

    // Find the Bolna call record
    const bolnaCall = await BolnaCall.findOne({ executionId });
    if (!bolnaCall) {
      throw new Error("No Bolna call found for the provided executionId");
    }

    // Check if already analyzed
    if (bolnaCall.screeningStatus === "completed") {
      console.log(`Screening already completed for executionId: ${executionId}`);
      return {
        executionId,
        score: bolnaCall.screeningScore,
        status: "already_completed",
      };
    }

    // Fetch execution data from Bolna API to get transcript
    const executionData = await fetchBolnaExecution(executionId);
    const transcript = executionData?.transcript;

    if (!transcript || transcript.trim().length === 0) {
      // Update status to failed if no transcript available
      bolnaCall.screeningStatus = "failed";
      bolnaCall.transcript = null;
      await bolnaCall.save();
      throw new Error("No transcript available for this call");
    }

    // Store transcript in database
    bolnaCall.transcript = transcript;

    // Analyze transcript with LLM if job description is available
    let score = null;
    if (bolnaCall.jobDescription) {
      console.log("🟢 [screeningTranscript] About to call analyzeTranscriptWithLLM...");
      console.log("🟢 [screeningTranscript] transcript exists:", !!transcript);
      console.log("🟢 [screeningTranscript] jobDescription exists:", !!bolnaCall.jobDescription);
      console.log("🟢 [screeningTranscript] Calling analyzeTranscriptWithLLM NOW...");
      try {
        score = await analyzeTranscriptWithLLM(
          transcript,
          bolnaCall.jobDescription
        );
        console.log("🟢 [screeningTranscript] analyzeTranscriptWithLLM returned score:", score);
      } catch (err) {
        console.error("🟢 [screeningTranscript] Error in analyzeTranscriptWithLLM:", err);
        throw err;
      }
    } else {
      // If no job description, analyze based on transcript quality
      console.log("🟡 [screeningTranscript] No job description, using analyzeTranscriptQuality...");
      score = await analyzeTranscriptQuality(transcript);
    }

    // Update Bolna call record with results
    bolnaCall.screeningScore = score;
    bolnaCall.screeningStatus = "completed";
    bolnaCall.screeningAnalyzedAt = new Date();
    await bolnaCall.save();

    console.log(
      `Screening completed for executionId ${executionId}: Score = ${score}%`
    );

    return {
      executionId,
      score,
      transcript: transcript.substring(0, 200) + "...", // Return truncated transcript
      status: "completed",
    };
  } catch (error) {
    console.error("Error in screeningTranscript:", error);

    // Update status to failed if error occurred
    try {
      const bolnaCall = await BolnaCall.findOne({ executionId });
      if (bolnaCall && bolnaCall.screeningStatus !== "completed") {
        bolnaCall.screeningStatus = "failed";
        await bolnaCall.save();
      }
    } catch (updateError) {
      console.error("Error updating screening status:", updateError);
    }

    throw error;
  }
}

// Analyze transcript against job description using LLM
// VERSION: 2025-12-17-FIXED-NO-ANGLE-BRACKETS
async function analyzeTranscriptWithLLM(transcript, jobDescription) {
  if (!llmClient) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  
  // Create system message without any template variables
  const systemMessage = `You are an expert interviewer analyzing a candidate's phone screening interview transcript.

Return ONLY valid JSON with these exact keys:
- score (number 0-100)
- reasoning (string)
- questions_answered (number)
- total_questions (number)
- key_strengths (array of strings)
- key_concerns (array of strings)

Do NOT include markdown, explanations, or extra text.`;

  // Create user message with template variables
  const userMessageTemplate = `Job Description:
"""
{jobDescription}
"""

Interview Transcript:
"""
{transcript}
"""`;

  let prompt;
  try {
    prompt = ChatPromptTemplate.fromMessages([
      ["system", systemMessage],
      ["user", userMessageTemplate],
    ]);
  } catch (promptError) {
    throw promptError;
  }
  

  const chain = prompt.pipe(llmClient).pipe(new StringOutputParser());

  try {
    let content = await chain.invoke({
      jobDescription: jobDescription,
      transcript: transcript,
    });
    // Clean LLM output
    content = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^\uFEFF/, "")
      .trim();

    const parsed = JSON.parse(content);
    return parsed.score || 0;
  } catch (error) {
    console.error("Error parsing LLM response for transcript analysis:", error);
    // Fallback: analyze based on transcript length and quality
    return analyzeTranscriptQuality(transcript);
  }
}

// Fallback analysis when job description is not available
async function analyzeTranscriptQuality(transcript) {
  // Simple heuristic: analyze based on transcript length and structure
  const transcriptLength = transcript.length;
  const hasQuestions = /question|asked|tell me|can you/i.test(transcript);
  const hasAnswers = /answer|responded|said|mentioned/i.test(transcript);
  const hasMultipleExchanges = (transcript.match(/user:|assistant:/gi) || []).length;

  let score = 0;

  // Base score on transcript length (longer = more engagement)
  if (transcriptLength > 1000) score += 30;
  else if (transcriptLength > 500) score += 20;
  else if (transcriptLength > 200) score += 10;

  // Check for question-answer pattern
  if (hasQuestions && hasAnswers) score += 30;
  else if (hasQuestions || hasAnswers) score += 15;

  // Check for multiple exchanges (conversation flow)
  if (hasMultipleExchanges > 10) score += 40;
  else if (hasMultipleExchanges > 5) score += 30;
  else if (hasMultipleExchanges > 2) score += 20;

  return Math.min(100, Math.max(0, score));
}

async function extractUserScheduledAt(transcript) {
  if (!llmClient) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // Get current year to ensure correct year extraction
  const currentYear = new Date().getFullYear();
  const currentDate = new Date();

  const prompt = ChatPromptTemplate.fromMessages([
    {
      role: "system",
      content:
        "You extract follow-up scheduling times from transcripts and respond only with valid JSON. IMPORTANT: If the transcript mentions a date without a year, use the current year ({currentYear}). If the date mentioned is in the past relative to today ({currentDateFormatted}), assume it refers to the next occurrence of that date in the current year or future. Pay attention to time references with AM/PM format (e.g., '2:30 PM', '10:00 AM') and convert them correctly.",
    },
    {
      role: "user",
      content:
        'Transcript:\n"""\n{transcript}\n"""\n\nCurrent date and time: {currentDateFormatted}\nCurrent date (ISO): {currentDateISO}\nCurrent year: {currentYear}\n\nExtract the user-scheduled time from the transcript. Look for time references in natural language (e.g., "2:30 PM", "10:00 AM", "tomorrow at 3 PM", "December 15th at 2:30 PM"). If a date is mentioned without a year, use {currentYear}. If the date appears to be in the past, use the next occurrence of that date.\n\nReturn JSON with field user_scheduled_time (ISO 8601 format, e.g., "2024-12-08T14:30:00" for 2:30 PM) or null if not present.',
    },
  ]);

  const chain = prompt.pipe(llmClient).pipe(new StringOutputParser());

  // Format current date with AM/PM for better LLM understanding
  const currentDateFormatted = getCurrentDateTimeForLLM("Asia/Kolkata");

  let content = await chain.invoke({
    transcript,
    currentYear: currentYear,
    currentDateISO: currentDate.toISOString(),
    currentDateFormatted: currentDateFormatted,
  });

  if (!content) return null;

  // 🧹 Clean LLM output to avoid JSON.parse errors
  content = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^\uFEFF/, "") // remove BOM if present
    .trim();

  try {
    const parsed = JSON.parse(content);
    return parsed.user_scheduled_time || null;
  } catch (error) {
    return null;
  }
}

export const checkCallsScheduled = async (req, res) => {
  try {
    const { jobId, candidateIds } = req.body;

    if (!jobId) {
      return res.status(400).json({
        message: "jobId is required in the request body",
      });
    }

    // Build query to find scheduled calls for this job
    const query = { jobId };

    // If candidateIds array is provided, check only those candidates
    if (
      candidateIds &&
      Array.isArray(candidateIds) &&
      candidateIds.length > 0
    ) {
      query.candidateId = { $in: candidateIds };
    }

    // Find all scheduled calls for this job (and optionally specific candidates)
    const scheduledCalls = await BolnaCall.find(query).select(
      "candidateId callScheduledAt status executionId"
    );

    // Extract unique candidateIds that are already scheduled
    const scheduledCandidateIds = scheduledCalls.map((call) =>
      call.candidateId.toString()
    );

    res.status(200).json({
      message: "Check completed",
      scheduledCandidates: scheduledCandidateIds,
      scheduledCalls: scheduledCalls.map((call) => ({
        candidateId: call.candidateId.toString(),
        callScheduledAt: call.callScheduledAt,
        status: call.status,
        executionId: call.executionId,
      })),
      count: scheduledCandidateIds.length,
    });
  } catch (error) {
    console.error("Error checking scheduled calls:", error);
    res.status(500).json({
      message: error.message || "Failed to check scheduled calls",
    });
  }
};

export const scheduleBolnaCallsBatch = async (req, res) => {
  try {
    ensureBolnaConfig();

    const { jobId, candidates, startTime, job_description } = req.body;

    if (!jobId) {
      return res.status(400).json({
        message: "jobId is required in the request body",
      });
    }

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({
        message: "candidates array is required and must not be empty",
      });
    }

    // Calculate start time (5 minutes from now if not provided)
    const baseTime = startTime ? new Date(startTime) : new Date();
    if (!startTime) {
      baseTime.setMinutes(baseTime.getMinutes() + 5);
    }

    const results = [];
    const CALL_GAP_MINUTES = 0; // 0 minutes gap between each call

    // Check which candidates are already scheduled for this job
    const candidateIds = candidates.map((c) => c.candidateId).filter(Boolean);
    const scheduledCalls = await BolnaCall.find({
      jobId,
      candidateId: { $in: candidateIds },
    }).select("candidateId");

    const scheduledCandidateIds = new Set(
      scheduledCalls.map((call) => call.candidateId.toString())
    );

    // Filter out already scheduled candidates and track them
    const alreadyScheduled = [];
    const candidatesToSchedule = [];

    for (const candidate of candidates) {
      if (!candidate.candidateId || !candidate.recipient_phone_number) {
        results.push({
          candidateId: candidate.candidateId || "unknown",
          success: false,
          error: "Missing candidateId or recipient_phone_number",
        });
        continue;
      }

      if (scheduledCandidateIds.has(candidate.candidateId.toString())) {
        alreadyScheduled.push(candidate.candidateId);
        results.push({
          candidateId: candidate.candidateId,
          success: false,
          error: "Call already scheduled for this candidate and job",
          alreadyScheduled: true,
        });
        continue;
      }

      candidatesToSchedule.push(candidate);
    }

    // Schedule calls for all candidates with 5-minute gaps
    for (let i = 0; i < candidatesToSchedule.length; i++) {
      const candidate = candidatesToSchedule[i];

      // Calculate scheduled time (5 minutes gap between each call)
      const scheduledTime = new Date(baseTime);
      scheduledTime.setMinutes(
        scheduledTime.getMinutes() + i * CALL_GAP_MINUTES
      );

      try {
        // Prepare user_data with job description
        const userData = candidate.user_data || {};
        
        // Add job description to user_data if provided
        if (job_description) {
          userData.job_description = job_description;
        }

        const callData = {
          recipient_phone_number: candidate.recipient_phone_number,
          scheduled_at: scheduledTime.toISOString(),
          ...(Object.keys(userData).length > 0 && { user_data: userData }),
        };

        const payload = {
          ...callData,
          agent_id: BOLNA_AGENT_ID,
          from_phone_number: BOLNA_FROM_PHONE,
        };

        console.log("payload2--->", payload);

        const response = await fetch(BOLNA_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${BOLNA_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          // Extract detailed error message from Bolna API response
          const errorMessage =
            data?.message ||
            data?.error ||
            data?.error_message ||
            data?.detail ||
            `API returned status ${response.status}`;
          const errorCode = data?.code || data?.error_code || response.status;

          results.push({
            candidateId: candidate.candidateId,
            success: false,
            error: errorMessage,
            errorCode: errorCode,
            details: data,
            httpStatus: response.status,
          });
          continue;
        }

        const executionId =
          data.execution_id || data.executionId || data.id || data?.call_id;

        if (!executionId) {
          results.push({
            candidateId: candidate.candidateId,
            success: false,
            error: "Bolna API did not return an execution_id",
            bolnaResponse: data,
          });
          continue;
        }

        // Convert scheduled_at to Date
        const scheduledAt = new Date(scheduledTime);
        const callScheduledAt = new Date(
          scheduledAt.getTime() + CALL_SCHEDULED_DELAY * 60 * 1000
        );

        const bolnaCall = await BolnaCall.create({
          candidateId: candidate.candidateId,
          jobId: jobId,
          executionId,
          status: data.status || data.state || "scheduled",
          callScheduledAt: callScheduledAt,
          userScheduledAt: null,
          jobDescription: job_description || null,
          screeningStatus: "pending",
        });

        results.push({
          candidateId: candidate.candidateId,
          success: true,
          record: {
            id: bolnaCall._id,
            candidateId: bolnaCall.candidateId,
            jobId: bolnaCall.jobId,
            executionId: bolnaCall.executionId,
            status: bolnaCall.status,
          },
          scheduledAt: scheduledTime.toISOString(),
        });
      } catch (error) {
        console.error(
          `Error scheduling call for candidate ${candidate.candidateId}:`,
          error
        );
        results.push({
          candidateId: candidate.candidateId,
          success: false,
          error: error.message || "Failed to schedule call",
          errorCode: error.code || "UNKNOWN_ERROR",
          details: error.response?.data || { message: error.message },
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter(
      (r) => !r.success && !r.alreadyScheduled
    ).length;
    const alreadyScheduledCount = results.filter(
      (r) => r.alreadyScheduled
    ).length;

    res.status(200).json({
      message: `Batch scheduling completed: ${successCount} successful, ${failCount} failed, ${alreadyScheduledCount} already scheduled`,
      results,
      summary: {
        total: candidates.length,
        successful: successCount,
        failed: failCount,
        alreadyScheduled: alreadyScheduledCount,
      },
    });
  } catch (error) {
    console.error("Error scheduling batch Bolna calls:", error);
    res.status(500).json({
      message: error.message || "Failed to schedule batch calls",
    });
  }
};

export const syncBolnaCall = async (executionId) => {
  try {
    if (!executionId) {
      throw new Error("executionId is required");
    }

    const bolnaCall = await BolnaCall.findOne({ executionId });

    if (!bolnaCall) {
      throw new Error("No Bolna call found for the provided executionId");
    }

    const executionData = await fetchBolnaExecution(executionId);

    const transcript = executionData?.transcript;
    let extractedTime = null;

    if (transcript) {
      extractedTime = await extractUserScheduledAt(transcript);
    }

    console.log("extractedTime", extractedTime);

    bolnaCall.status = executionData.status || bolnaCall.status;
    if (extractedTime) {
      // Convert IST to UTC by subtracting 5:30 hours (5 hours 30 minutes = 19800000 milliseconds)
      const istDate = new Date(extractedTime);
      const utcDate = new Date(
        istDate.getTime() - (5 * 60 * 60 * 1000 + 30 * 60 * 1000)
      );
      bolnaCall.userScheduledAt = utcDate;
    }
    await bolnaCall.save();

    return {
      message: "Bolna call synced successfully",
      execution: executionData,
      storedRecord: bolnaCall,
    };
  } catch (error) {
    console.error("Error syncing Bolna call:", error);
    throw new Error(error.message || "Failed to sync Bolna call");
  }
};

// Stop a single call by executionId
export const stopBolnaCall = async (req, res) => {
  try {
    ensureBolnaConfig();

    const { executionId } = req.params;

    if (!executionId) {
      return res.status(400).json({
        message: "executionId is required",
      });
    }

    // Find the call in database
    const bolnaCall = await BolnaCall.findOne({ executionId });

    if (!bolnaCall) {
      return res.status(404).json({
        message: "Call not found",
      });
    }

    // Check if call can be stopped (not past scheduled time)
    const now = new Date();
    if (bolnaCall.callScheduledAt && now > bolnaCall.callScheduledAt) {
      return res.status(400).json({
        message: "Cannot stop call: scheduled time has already passed",
        callScheduledAt: bolnaCall.callScheduledAt,
      });
    }

    // Call Bolna API to stop the call
    const response = await fetch(
      `https://api.bolna.ai/call/${executionId}/stop`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BOLNA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to stop call with Bolna API",
        details: data,
      });
    }

    // Update status in database
    bolnaCall.status = data.status || "stopped" || "cancelled";
    await bolnaCall.save();

    res.status(200).json({
      message: "Call stopped successfully",
      bolnaResponse: data,
      call: {
        id: bolnaCall._id,
        executionId: bolnaCall.executionId,
        status: bolnaCall.status,
      },
    });
  } catch (error) {
    console.error("Error stopping Bolna call:", error);
    res.status(500).json({
      message: error.message || "Failed to stop call",
    });
  }
};

// Stop all calls for a job
export const stopAllBolnaCalls = async (req, res) => {
  try {
    ensureBolnaConfig();

    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        message: "jobId is required",
      });
    }

    // Find all calls for this job that haven't passed scheduled time
    const now = new Date();
    const calls = await BolnaCall.find({
      jobId,
      callScheduledAt: { $gt: now }, // Only calls that haven't passed scheduled time
    });

    if (calls.length === 0) {
      return res.status(200).json({
        message: "No calls found that can be stopped",
        stoppedCount: 0,
      });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Stop each call
    for (const call of calls) {
      try {
        const response = await fetch(
          `https://api.bolna.ai/call/${call.executionId}/stop`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${BOLNA_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          call.status = data.status || "stopped" || "cancelled";
          await call.save();
          successCount++;
          results.push({
            executionId: call.executionId,
            candidateId: call.candidateId,
            success: true,
          });
        } else {
          failCount++;
          results.push({
            executionId: call.executionId,
            candidateId: call.candidateId,
            success: false,
            error: data.message || data.error || "Failed to stop call",
          });
        }
      } catch (error) {
        failCount++;
        results.push({
          executionId: call.executionId,
          candidateId: call.candidateId,
          success: false,
          error: error.message || "Failed to stop call",
        });
      }
    }

    res.status(200).json({
      message: `Stopped ${successCount} call(s), ${failCount} failed`,
      stoppedCount: successCount,
      failedCount: failCount,
      totalCalls: calls.length,
      results,
    });
  } catch (error) {
    console.error("Error stopping all Bolna calls:", error);
    res.status(500).json({
      message: error.message || "Failed to stop calls",
    });
  }
};

// Get call status/details by executionId
export const getBolnaCallStatus = async (req, res) => {
  try {
    const { executionId } = req.params;

    if (!executionId) {
      return res.status(400).json({
        message: "executionId is required",
      });
    }

    // Find call in database
    const bolnaCall = await BolnaCall.findOne({ executionId })
      .populate("candidateId", "name email phone")
      .populate("jobId", "title company");

    if (!bolnaCall) {
      return res.status(404).json({
        message: "Call not found",
      });
    }

    // Fetch latest status from Bolna API
    let executionData = null;
    try {
      executionData = await fetchBolnaExecution(executionId);
      // Update status in database
      bolnaCall.status = executionData.status || bolnaCall.status;
      await bolnaCall.save();
    } catch (error) {
      console.error("Error fetching execution data:", error);
      // Continue with database data if API fails
    }

    // Check if call can be stopped
    const now = new Date();
    const canStop =
      bolnaCall.callScheduledAt && now < bolnaCall.callScheduledAt;

    res.status(200).json({
      call: {
        id: bolnaCall._id,
        executionId: bolnaCall.executionId,
        candidateId: bolnaCall.candidateId,
        jobId: bolnaCall.jobId,
        status: bolnaCall.status,
        callScheduledAt: bolnaCall.callScheduledAt,
        userScheduledAt: bolnaCall.userScheduledAt,
        canStop,
        transcript: bolnaCall.transcript, // Include transcript from database
        createdAt: bolnaCall.createdAt,
        updatedAt: bolnaCall.updatedAt,
      },
      execution: executionData,
    });
  } catch (error) {
    console.error("Error getting call status:", error);
    res.status(500).json({
      message: error.message || "Failed to get call status",
    });
  }
};

// Get all calls for a job with status
export const getBolnaCallsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        message: "jobId is required",
      });
    }

    const calls = await BolnaCall.find({ jobId })
      .populate("candidateId", "name email phone")
      .populate("jobId", "title company")
      .sort({ callScheduledAt: 1 });

    const now = new Date();

    const callsWithStatus = calls.map((call) => {
      const canStop = call.callScheduledAt && now < call.callScheduledAt;
      // Extract candidateId as string for easier frontend mapping
      const candidateIdStr =
        call.candidateId?._id?.toString() || call.candidateId?.toString();
      return {
        id: call._id,
        executionId: call.executionId,
        candidateId: candidateIdStr,
        candidateIdObj: call.candidateId, // Keep populated object for reference
        jobId: call.jobId,
        status: call.status,
        callScheduledAt: call.callScheduledAt,
        userScheduledAt: call.userScheduledAt,
        canStop,
        createdAt: call.createdAt,
        updatedAt: call.updatedAt,
      };
    });

    res.status(200).json({
      count: callsWithStatus.length,
      calls: callsWithStatus,
    });
  } catch (error) {
    console.error("Error getting calls by job:", error);
    res.status(500).json({
      message: error.message || "Failed to get calls",
    });
  }
};

// Get screenings for a job with scores
export const getJobScreenings = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        message: "jobId is required",
      });
    }

    // Get all calls for this job that have completed screening
    const screenings = await BolnaCall.find({
      jobId,
      screeningStatus: "completed",
    })
      .populate("candidateId", "name email phone_no role experience skills bio")
      .populate("jobId", "title company")
      .populate("assignRecruiter", "name email")
      .sort({ screeningAnalyzedAt: -1 })
      .lean();

    const transformedScreenings = screenings.map((screening) => ({
      _id: screening._id,
      candidateId: screening.candidateId,
      jobId: screening.jobId,
      executionId: screening.executionId,
      screeningScore: screening.screeningScore,
      screeningStatus: screening.screeningStatus,
      screeningAnalyzedAt: screening.screeningAnalyzedAt,
      status: screening.status,
      callScheduledAt: screening.callScheduledAt,
      // Interview details
      emailSent: screening.emailSent,
      emailSentAt: screening.emailSentAt,
      assignRecruiter: screening.assignRecruiter,
      meetLink: screening.meetLink,
      userScheduledAt: screening.userScheduledAt,
      createdAt: screening.createdAt,
      updatedAt: screening.updatedAt,
    }));

    res.status(200).json({
      success: true,
      screenings: transformedScreenings,
      count: transformedScreenings.length,
    });
  } catch (error) {
    console.error("Error fetching job screenings:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch job screenings",
    });
  }
};

// Get all interviews for a job (calls where emailSent = true)
export const getJobInterviews = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        message: "jobId is required",
      });
    }

    // Get all calls for this job that have interviews scheduled (emailSent = true)
    const interviews = await BolnaCall.find({
      jobId,
      emailSent: true,
    })
      .populate("candidateId", "name email phone_no role experience skills bio")
      .populate("jobId", "title company")
      .populate("assignRecruiter", "name email")
      .sort({ emailSentAt: -1 })
      .lean();

    const transformedInterviews = interviews.map((interview) => ({
      _id: interview._id,
      candidateId: interview.candidateId,
      jobId: interview.jobId,
      executionId: interview.executionId,
      screeningScore: interview.screeningScore,
      status: interview.status,
      callScheduledAt: interview.callScheduledAt,
      // Interview details
      emailSent: interview.emailSent,
      emailSentAt: interview.emailSentAt,
      assignRecruiter: interview.assignRecruiter,
      meetLink: interview.meetLink,
      userScheduledAt: interview.userScheduledAt,
      // Interview outcome
      interviewOutcome: interview.interviewOutcome,
      interviewFeedback: interview.interviewFeedback,
      interviewOutcomeAt: interview.interviewOutcomeAt,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    }));

    res.status(200).json({
      success: true,
      interviews: transformedInterviews,
      count: transformedInterviews.length,
    });
  } catch (error) {
    console.error("Error fetching job interviews:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch job interviews",
    });
  }
};

// Update interview outcome (offer or reject)
export const updateInterviewOutcome = async (req, res) => {
  try {
    const { executionId } = req.params;
    const { outcome, feedback } = req.body; // outcome: "offer" or "reject"

    if (!executionId) {
      return res.status(400).json({
        message: "executionId is required",
      });
    }

    if (!outcome || !["offer", "reject"].includes(outcome)) {
      return res.status(400).json({
        message: "outcome must be 'offer' or 'reject'",
      });
    }

    const bolnaCall = await BolnaCall.findOne({ executionId });
    if (!bolnaCall) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    // Update the BolnaCall with outcome
    bolnaCall.interviewOutcome = outcome;
    if (feedback) {
      bolnaCall.interviewFeedback = feedback;
    }
    bolnaCall.interviewOutcomeAt = new Date();
    await bolnaCall.save();

    // Update candidate progress
    const CandidateProgress = (await import("../candidate_progress/model.js")).default;
    const progressDoc = await CandidateProgress.findOne({
      jobPostingId: bolnaCall.jobId,
    });

    if (progressDoc) {
      const candidateEntry = progressDoc.candidates.find(
        (c) => c.candidateId.toString() === bolnaCall.candidateId.toString()
      );

      if (candidateEntry) {
        if (outcome === "offer") {
          candidateEntry.offer.status = "completed";
          candidateEntry.offer.completedAt = new Date();
          if (feedback) {
            candidateEntry.offer.notes = feedback;
          }
        } else if (outcome === "reject") {
          candidateEntry.rejected.status = "completed";
          candidateEntry.rejected.rejectedAt = new Date();
          if (feedback) {
            candidateEntry.rejected.notes = feedback;
          }
        }
        progressDoc.markModified("candidates");
        await progressDoc.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Interview outcome updated to ${outcome}`,
      bolnaCall: {
        _id: bolnaCall._id,
        executionId: bolnaCall.executionId,
        interviewOutcome: bolnaCall.interviewOutcome,
        interviewFeedback: bolnaCall.interviewFeedback,
        interviewOutcomeAt: bolnaCall.interviewOutcomeAt,
      },
    });
  } catch (error) {
    console.error("Error updating interview outcome:", error);
    res.status(500).json({
      message: error.message || "Failed to update interview outcome",
    });
  }
};

// Get completed screenings for a candidate from Bolna calls
export const getCandidateScreenings = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;
    const { candidateId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!["admin", "manager", "recruiter"].includes(userRole)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (!candidateId) {
      return res.status(400).json({
        message: "Candidate ID is required",
      });
    }

    // Pull completed/emailed calls for the candidate
    const query = {
      candidateId,
      $or: [{ status: "completed" }, { emailSent: true }],
    };

    const screenings = await BolnaCall.find(query)
      .populate("candidateId", "name email phone_no")
      .populate("jobId", "title company job_type ctc exp_req")
      .populate("assignRecruiter", "name email")
      .sort({ callScheduledAt: -1 })
      .lean();

    const transformedScreenings = screenings.map((screening) => ({
      _id: screening._id,
      candidate_id: screening.candidateId,
      job_id: screening.jobId,
      job_title: screening.jobId?.title || null,
      job_company: screening.jobId?.company || null,
      bolna_call_id: {
        _id: screening._id,
        executionId: screening.executionId,
        status: screening.status,
        callScheduledAt: screening.callScheduledAt,
        userScheduledAt: screening.userScheduledAt,
      },
      recruiter_id: screening.assignRecruiter,
      call_scheduled_at: screening.callScheduledAt,
      status: screening.status,
      executionId: screening.executionId,
      emailSent: screening.emailSent,
      emailSentAt: screening.emailSentAt,
      meetLink: screening.meetLink,
      createdAt: screening.createdAt,
      updatedAt: screening.updatedAt,
    }));

    res.status(200).json({
      success: true,
      screenings: transformedScreenings,
      count: transformedScreenings.length,
    });
  } catch (error) {
    console.error("Error fetching candidate screenings:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch candidate screenings",
    });
  }
};

// Manual email sending API - recruiter selects slot and sends email via Cal.com
export const sendEmailManually = async (req, res) => {
  try {
    const { candidateId, recruiterId, slot } = req.body;

    // Validate required fields
    if (!candidateId || !recruiterId || !slot) {
      return res.status(400).json({
        message: "candidateId, recruiterId, and slot are required in the request body",
      });
    }

    // Find the most recent BolnaCall for this candidate that hasn't been emailed yet
    const bolnaCall = await BolnaCall.findOne({
      candidateId,
      emailSent: { $ne: true },
    })
      .populate("candidateId", "name email")
      .populate("jobId", "title company")
      .sort({ createdAt: -1 }); // Get the most recent one

    if (!bolnaCall) {
      return res.status(404).json({
        message: "No pending Bolna call found for this candidate",
      });
    }

    // Get candidate information
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found",
      });
    }

    // Get recruiter information
    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter not found",
      });
    }

    // Validate slot is a valid date
    const scheduledTime = new Date(slot);
    if (isNaN(scheduledTime.getTime())) {
      return res.status(400).json({
        message: "Invalid slot format. Please provide a valid ISO date string",
      });
    }

    // Generate Google Meet link and send email via Cal.com using recruiter's credentials
    const meetLink = await generateGoogleMeetLink(
      scheduledTime,
      candidate.name || candidate.email?.split("@")[0] || "Candidate",
      candidate.email,
      recruiter.name,
      recruiter.email,
      recruiterId // Pass recruiterId to use recruiter-specific Cal.com credentials
    );

    // Update BolnaCall record with meet link and email sent status
    bolnaCall.emailSent = true;
    bolnaCall.emailSentAt = new Date();
    bolnaCall.emailRetryCount = 0;
    bolnaCall.meetLink = meetLink;
    bolnaCall.meetLinkGenerated = true;
    bolnaCall.meetLinkGeneratedAt = new Date();
    bolnaCall.assignRecruiter = recruiterId;
    await bolnaCall.save();

    res.status(200).json({
      message: "Email sent successfully via Cal.com",
      meetLink: meetLink,
      call: {
        id: bolnaCall._id,
        executionId: bolnaCall.executionId,
        candidateId: bolnaCall.candidateId,
        jobId: bolnaCall.jobId,
        scheduledTime: scheduledTime,
        emailSent: bolnaCall.emailSent,
        emailSentAt: bolnaCall.emailSentAt,
      },
    });
  } catch (error) {
    console.error("Error sending email manually:", error);
    res.status(500).json({
      message: error.message || "Failed to send email",
    });
  }
};
