import mongoose from "mongoose";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "https://amank-07.app.n8n.cloud/webhook/chat";

/**
 * Send a message to n8n webhook and get response
 */
export const sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.id || req.user._id; // Get user ID from authenticated request

    if (!message) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    // Use provided sessionId or default to userId
    const chatSessionId = sessionId || userId;

    // Call n8n webhook
    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: chatSessionId,
        message: message,
      }),
    });

    // Get response as text first to handle potential JSON parsing issues
    const responseText = await webhookResponse.text();
    const contentType = webhookResponse.headers.get('content-type') || '';
    
    // Log response details for debugging
    console.log('n8n webhook response status:', webhookResponse.status);
    console.log('n8n webhook response content-type:', contentType);
    console.log('n8n webhook response length:', responseText.length);
    console.log('n8n webhook response preview:', responseText.substring(0, 200));
    
    if (!webhookResponse.ok) {
      let errorData = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { raw: responseText };
      }
      return res.status(webhookResponse.status).json({
        message: "Failed to get response from n8n webhook",
        details: errorData,
      });
    }

    // Clean the response text - remove BOM, trailing whitespace
    let cleanedText = responseText
      .replace(/^\uFEFF/, '') // Remove BOM if present
      .trim();
    
    let output = "";
    
    // Check if response is JSON (starts with { or [)
    if (cleanedText.startsWith('{') || cleanedText.startsWith('[')) {
      // Try to parse as JSON
      try {
        const webhookData = JSON.parse(cleanedText);
        output = webhookData.output || webhookData.response || webhookData.message || "";
      } catch (parseError) {
        console.error("Error parsing n8n webhook response as JSON:", parseError.message);
        console.error("Raw response text (first 500 chars):", responseText.substring(0, 500));
        
        // Try to extract output from malformed JSON using regex
        const outputPatterns = [
          /"output"\s*:\s*"((?:[^"\\]|\\.)*)"/s,  // Standard JSON string
          /"output"\s*:\s*\n\s*"((?:[^"\\]|\\.)*)"/s,  // Multiline JSON string
          /"output"\s*:\s*"([^"]+)"/,  // Simple string match
        ];
        
        for (const pattern of outputPatterns) {
          const match = responseText.match(pattern);
          if (match && match[1]) {
            output = match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\t/g, '\t')
              .replace(/\\r/g, '\r')
              .trim();
            break;
          }
        }
        
        // If still no output found, use the raw text
        if (!output) {
          output = cleanedText;
        }
      }
    } else {
      // Response is plain text, not JSON - use it directly as output
      output = cleanedText;
    }

    res.status(200).json({
      message: "Message sent successfully",
      output: output,
      sessionId: chatSessionId,
    });
  } catch (error) {
    console.error("Error sending message to n8n:", error);
    res.status(500).json({
      message: error.message || "Failed to send message",
    });
  }
};

/**
 * Get chat history for a user from n8n_chat_histories collection
 */
export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id || req.user._id; // Get user ID from authenticated request

    // Use provided sessionId or default to userId
    const chatSessionId = sessionId || userId;

    // Access MongoDB collection directly
    const db = mongoose.connection.db;
    const chatHistoriesCollection = db.collection("n8n_chat_histories");

    // Find chat history for this session
    const chatHistory = await chatHistoriesCollection.findOne({
      sessionId: chatSessionId,
    });

    if (!chatHistory) {
      return res.status(200).json({
        message: "No chat history found",
        sessionId: chatSessionId,
        messages: [],
      });
    }

    // Format messages for frontend
    const formattedMessages = (chatHistory.messages || []).map((msg) => {
      if (msg.type === "human") {
        return {
          type: "user",
          content: msg.data?.content || "",
        };
      } else if (msg.type === "ai") {
        return {
          type: "assistant",
          content: msg.data?.content || "",
        };
      }
      return null;
    }).filter(Boolean);

    res.status(200).json({
      message: "Chat history retrieved successfully",
      sessionId: chatSessionId,
      messages: formattedMessages,
      raw: chatHistory, // Include raw data for debugging if needed
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch chat history",
    });
  }
};
