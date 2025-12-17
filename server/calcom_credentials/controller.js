import axios from "axios";
import CalcomCredentials from "./model.js";
import User from "../user/model.js";

const CAL_API_VERSION = process.env.CAL_API_VERSION || "2024-08-13";

/**
 * Save or update Cal.com API secret key for a recruiter
 * POST /api/calcom-credentials/save-key
 */
export const saveApiSecretKey = async (req, res) => {
  try {
    const { recruiterId, apiSecretKey } = req.body;

    if (!recruiterId || !apiSecretKey) {
      return res.status(400).json({
        message: "recruiterId and apiSecretKey are required",
      });
    }

    // Verify recruiter exists
    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter not found",
      });
    }

    // Validate that user is a recruiter
    if (recruiter.role !== "recruiter") {
      return res.status(400).json({
        message: "User must be a recruiter",
      });
    }

    // Validate API key format (basic check - Cal.com keys start with "cal_live_" or "cal_test_")
    if (!apiSecretKey.startsWith("cal_live_") && !apiSecretKey.startsWith("cal_test_")) {
      return res.status(400).json({
        message: "Invalid Cal.com API secret key format. Must start with 'cal_live_' or 'cal_test_'",
      });
    }

    // Save or update credentials
    const credentials = await CalcomCredentials.findOneAndUpdate(
      { recruiterId },
      {
        apiSecretKey,
        isActive: true,
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.status(200).json({
      message: "Cal.com API secret key saved successfully",
      credentials: {
        recruiterId: credentials.recruiterId,
        isActive: credentials.isActive,
        updatedAt: credentials.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error saving Cal.com API secret key:", error);
    res.status(500).json({
      message: error.message || "Failed to save API secret key",
    });
  }
};

/**
 * Fetch all event types from Cal.com using recruiter's API secret key
 * GET /api/calcom-credentials/:recruiterId/event-types
 */
export const getEventTypes = async (req, res) => {
    try {
      const { recruiterId } = req.params;
  
      if (!recruiterId) {
        return res.status(400).json({ message: "recruiterId is required" });
      }
  
      const credentials = await CalcomCredentials.findOne({ recruiterId });
  
      if (!credentials) {
        return res.status(404).json({
          message: "Cal.com credentials not found for this recruiter",
        });
      }
  
      if (!credentials.isActive) {
        return res.status(400).json({
          message: "Cal.com credentials are not active",
        });
      }
  
      const response = await axios.get(
        "https://api.cal.com/v2/event-types",
        {
          headers: {
            Authorization: `Bearer ${credentials.apiSecretKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
  
      const eventTypes = response?.data?.data?.eventTypeGroups[0].eventTypes || [];

      console.log("eventTypes--->", eventTypes);
  
      return res.status(200).json({
        message: "Event types fetched successfully",
        count: eventTypes.length,
        eventTypes: eventTypes.map((event) => ({
          id: event.id,
          title: event.title,
          slug: event.slug,
          length: event.length,
          description: event.description,
          hidden: event.hidden,
          teamId: event.teamId || null,
        })),
      });
    } catch (error) {
      console.error("Cal.com EventType Error:", error?.response?.data || error);
  
      if (error.response?.status === 401) {
        return res.status(401).json({
          message: "Invalid Cal.com API key",
        });
      }
  
      return res.status(500).json({
        message: "Failed to fetch event types",
        error: error.message,
      });
    }
  };
  
/**
 * Save event type ID for a recruiter
 * POST /api/calcom-credentials/save-event-type
 */
export const saveEventType = async (req, res) => {
  try {
    const { recruiterId, eventTypeId } = req.body;

    if (!recruiterId || !eventTypeId) {
      return res.status(400).json({
        message: "recruiterId and eventTypeId are required",
      });
    }

    // Verify recruiter exists
    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter not found",
      });
    }

    // Validate eventTypeId is a number
    const eventTypeIdNum = parseInt(eventTypeId, 10);
    if (isNaN(eventTypeIdNum)) {
      return res.status(400).json({
        message: "eventTypeId must be a valid number",
      });
    }

    // Check if credentials exist
    const credentials = await CalcomCredentials.findOne({ recruiterId });

    if (!credentials) {
      return res.status(404).json({
        message: "Cal.com credentials not found for this recruiter. Please save your API secret key first.",
      });
    }

    // Update event type ID
    credentials.eventTypeId = eventTypeIdNum;
    await credentials.save();

    res.status(200).json({
      message: "Event type ID saved successfully",
      credentials: {
        recruiterId: credentials.recruiterId,
        eventTypeId: credentials.eventTypeId,
        isActive: credentials.isActive,
        updatedAt: credentials.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error saving event type ID:", error);
    res.status(500).json({
      message: error.message || "Failed to save event type ID",
    });
  }
};

/**
 * Get Cal.com credentials for a recruiter
 * GET /api/calcom-credentials/:recruiterId
 */
export const getCredentials = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    if (!recruiterId) {
      return res.status(400).json({
        message: "recruiterId is required",
      });
    }

    const credentials = await CalcomCredentials.findOne({ recruiterId })
      .select("-apiSecretKey") // Don't return the secret key for security
      .populate("recruiterId", "name email role");

    if (!credentials) {
      return res.status(404).json({
        message: "Cal.com credentials not found for this recruiter",
      });
    }

    res.status(200).json({
      credentials: {
        recruiterId: credentials.recruiterId,
        eventTypeId: credentials.eventTypeId,
        isActive: credentials.isActive,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error getting credentials:", error);
    res.status(500).json({
      message: error.message || "Failed to get credentials",
    });
  }
};

