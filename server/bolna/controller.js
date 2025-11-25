import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import BolnaCall from "./model.js";

const BOLNA_API_URL = process.env.BOLNA_API_URL || "https://api.bolna.ai/call";
const BOLNA_API_KEY = process.env.BOLNA_API_KEY;
const BOLNA_AGENT_ID = process.env.BOLNA_AGENT_ID;
const BOLNA_FROM_PHONE = process.env.BOLNA_FROM_PHONE;
const BOLNA_EXECUTIONS_URL =
  process.env.BOLNA_EXECUTIONS_URL || "https://api.bolna.ai/executions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const CALL_SCHEDULED_DELAY = process.env.CALL_SCHEDULED_DELAY || 20; // 20 minutes

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

    const payload = {
      ...callData,
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

    const bolnaCall = await BolnaCall.create({
      candidateId,
      jobId,
      executionId,
      status: data.status || data.state || "scheduled",
      callScheduledAt: new Date(
        scheduled_at + CALL_SCHEDULED_DELAY * 60 * 1000
      ),
      userScheduledAt: null,
    });

    // Call syncBolnaCall in background (non-blocking)
    // Errors are caught and logged but don't affect the response
    syncBolnaCall(executionId).catch((error) => {
      console.error(
        `Background sync failed for executionId ${executionId}:`,
        error.message
      );
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

  const prompt = ChatPromptTemplate.fromMessages([
    {
      role: "system",
      content:
        "You extract follow-up scheduling times from transcripts and respond only with valid JSON.",
    },
    {
      role: "user",
      content:
        'Transcript:\n"""\n{transcript}\n"""\n\nReturn JSON with field user_scheduled_time (ISO 8601) or null if not present.',
    },
  ]);

  const chain = prompt.pipe(llmClient).pipe(new StringOutputParser());

  const content = await chain.invoke({ transcript });

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content);
    return parsed.user_scheduled_time || null;
  } catch {
    return null;
  }
}

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
