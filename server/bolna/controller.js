import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import BolnaCall from "./model.js";
import RecruiterAvailability from "../recruiter_availability/model.js";
import dotenv from "dotenv";

dotenv.config();

const BOLNA_API_URL = process.env.BOLNA_API_URL || "https://api.bolna.ai/call";
const BOLNA_API_KEY =
  process.env.BOLNA_API_KEY;
const BOLNA_AGENT_ID =
  process.env.BOLNA_AGENT_ID;
const BOLNA_FROM_PHONE = process.env.BOLNA_FROM_PHONE;
const BOLNA_EXECUTIONS_URL =
  process.env.BOLNA_EXECUTIONS_URL || "https://api.bolna.ai/executions";
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY;
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

// Format recruiter availability data into a natural paragraph using LLM
async function formatRecruiterAvailabilityWithLLM(availabilities) {
  if (!llmClient || !availabilities || availabilities.length === 0) {
    return "";
  }

  try {
    // Prepare structured data for LLM
    const availabilityData = [];
    
    for (const availability of availabilities) {
      const recruiterName = availability.recruiter_id?.name || "Recruiter";
      const recruiterType = availability.recruiter_type === "primary" ? "Primary" : "Secondary";
      
      if (availability.availability_slots && availability.availability_slots.length > 0) {
        // Filter only available slots
        const availableSlots = availability.availability_slots.filter(
          (slot) => slot.is_available !== false
        );
        
        if (availableSlots.length > 0) {
          // Group slots by date
          const slotsByDate = {};
          availableSlots.forEach((slot) => {
            const date = new Date(slot.date);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            const dateDisplay = date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            
            if (!slotsByDate[dateStr]) {
              slotsByDate[dateStr] = {
                display: dateDisplay,
                slots: [],
              };
            }
            slotsByDate[dateStr].slots.push({
              start: slot.start_time,
              end: slot.end_time,
            });
          });
          
          availabilityData.push({
            recruiterName,
            recruiterType,
            availability: Object.keys(slotsByDate).map((dateStr) => ({
              date: slotsByDate[dateStr].display,
              timeSlots: slotsByDate[dateStr].slots.map(
                (slot) => `${slot.start} to ${slot.end}`
              ),
            })),
          });
        }
      }
    }

    if (availabilityData.length === 0) {
      return "";
    }

    // Create prompt for LLM
    const prompt = ChatPromptTemplate.fromMessages([
      {
        role: "system",
        content:
          "You are a helpful assistant that formats recruiter availability information into a clear, natural, and professional paragraph. The paragraph should be concise, easy to understand, and suitable for use in a phone conversation context.",
      },
      {
        role: "user",
        content:
          'Format the following recruiter availability information into a single, natural paragraph. Make it sound professional and conversational, suitable for an AI agent to read to a candidate during a phone call.\n\nRecruiter Availability Data:\n{availabilityData}\n\nReturn only the formatted paragraph, nothing else. Do not include any prefixes, labels, or additional text.',
      },
    ]);

    const chain = prompt.pipe(llmClient).pipe(new StringOutputParser());
    const formattedText = await chain.invoke({
      availabilityData: JSON.stringify(availabilityData, null, 2),
    });

    console.log("formattedText---->", formattedText);

    return formattedText.trim();
  } catch (error) {
    console.error("Error formatting recruiter availability with LLM:", error);
    // Fallback to empty string if LLM fails
    return "";
  }
}

export const scheduleBolnaCall = async (req, res) => {
  try {
    ensureBolnaConfig();

    const { candidateId, jobId, ...callData } = req.body;
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

    // Fetch recruiter availability for this job and format with LLM
    let recruiterAvailabilityText = "";
    try {
      const availabilities = await RecruiterAvailability.find({
        job_id: jobId,
      })
        .populate("recruiter_id", "name email")
        .sort({ recruiter_type: 1 }); // Primary first, then secondary

      if (availabilities && availabilities.length > 0) {
        // Use LLM to format availability into a natural paragraph
        recruiterAvailabilityText = await formatRecruiterAvailabilityWithLLM(availabilities);
      }
    } catch (error) {
      console.error("Error fetching recruiter availability:", error);
      // Continue without availability text if there's an error
    }

    // Add recruiter availability to user_data if it exists
    const updatedCallData = { ...callData };
    if (recruiterAvailabilityText) {
      if (!updatedCallData.user_data) {
        updatedCallData.user_data = {};
      }
      updatedCallData.user_data.recruiter_availability = recruiterAvailabilityText;
    }

    const payload = {
      ...updatedCallData,
      agent_id: BOLNA_AGENT_ID,
      from_phone_number: BOLNA_FROM_PHONE,
    };

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
        "You extract follow-up scheduling times from transcripts and respond only with valid JSON. IMPORTANT: If the transcript mentions a date without a year, use the current year ({currentYear}). If the date mentioned is in the past relative to today ({currentDateISO}), assume it refers to the next occurrence of that date in the current year or future.",
    },
    {
      role: "user",
      content:
        'Transcript:\n"""\n{transcript}\n"""\n\nCurrent date: {currentDateISO}\nCurrent year: {currentYear}\n\nExtract the user-scheduled time from the transcript. If a date is mentioned without a year, use {currentYear}. If the date appears to be in the past, use the next occurrence of that date.\n\nReturn JSON with field user_scheduled_time (ISO 8601 format, e.g., "2024-12-08T10:00:00") or null if not present.',
    },
  ]);

  const chain = prompt.pipe(llmClient).pipe(new StringOutputParser());

  let content = await chain.invoke({ 
    transcript,
    currentYear: currentYear,
    currentDateISO: currentDate.toISOString(),
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
    if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
      query.candidateId = { $in: candidateIds };
    }

    // Find all scheduled calls for this job (and optionally specific candidates)
    const scheduledCalls = await BolnaCall.find(query).select("candidateId callScheduledAt status executionId");

    // Extract unique candidateIds that are already scheduled
    const scheduledCandidateIds = scheduledCalls.map((call) => call.candidateId.toString());

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

    const { jobId, candidates, startTime } = req.body;

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

    // Fetch all recruiter availability for this job and format with LLM
    let recruiterAvailabilityText = "";
    try {
      const availabilities = await RecruiterAvailability.find({
        job_id: jobId,
      })
        .populate("recruiter_id", "name email")
        .sort({ recruiter_type: 1 }); // Primary first, then secondary

        console.log("availabilities--->", availabilities);

      if (availabilities && availabilities.length > 0) {
        // Use LLM to format availability into a natural paragraph
        recruiterAvailabilityText = await formatRecruiterAvailabilityWithLLM(availabilities);
      }
    } catch (error) {
      console.error("Error fetching recruiter availability:", error);
      // Continue without availability text if there's an error
    }

    // Schedule calls for all candidates with 5-minute gaps
    for (let i = 0; i < candidatesToSchedule.length; i++) {
      const candidate = candidatesToSchedule[i];

      // Calculate scheduled time (5 minutes gap between each call)
      const scheduledTime = new Date(baseTime);
      scheduledTime.setMinutes(scheduledTime.getMinutes() + (i * CALL_GAP_MINUTES));

      try {
        // Prepare user_data with recruiter availability
        const userData = candidate.user_data || {};
        console.log("recruiterAvailabilityText--->", recruiterAvailabilityText);
        if (recruiterAvailabilityText) {
          userData.recruiter_availability = recruiterAvailabilityText;
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

        console.log("callData--->", callData);
        
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
          const errorMessage = data?.message || data?.error || data?.error_message || 
                              data?.detail || `API returned status ${response.status}`;
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
        console.error(`Error scheduling call for candidate ${candidate.candidateId}:`, error);
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
    const failCount = results.filter((r) => !r.success && !r.alreadyScheduled).length;
    const alreadyScheduledCount = results.filter((r) => r.alreadyScheduled).length;

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
    bolnaCall.userScheduledAt = extractedTime
      ? new Date(extractedTime)
      : bolnaCall.userScheduledAt;
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
    bolnaCall.status = "stopped" || data.status || "cancelled";
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
          call.status = "stopped" || data.status || "cancelled";
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
    const canStop = bolnaCall.callScheduledAt && now < bolnaCall.callScheduledAt;

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
      const candidateIdStr = call.candidateId?._id?.toString() || call.candidateId?.toString();
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
