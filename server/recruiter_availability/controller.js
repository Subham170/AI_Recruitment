import JobPosting from "../job_posting/model.js";
import RecruiterAvailability from "./model.js";

// Create or update recruiter availability
export const createOrUpdateAvailability = async (req, res) => {
  try {
    const { job_id, availability_slots } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Validate required fields
    if (!job_id) {
      return res.status(400).json({
        message: "job_id is required",
      });
    }

    if (!availability_slots || !Array.isArray(availability_slots) || availability_slots.length === 0) {
      return res.status(400).json({
        message: "availability_slots is required and must be a non-empty array",
      });
    }

    // Validate job_id format
    if (!/^[0-9a-fA-F]{24}$/.test(job_id)) {
      return res.status(400).json({
        message: "Invalid job_id format",
      });
    }

    // Find the job posting
    const jobPosting = await JobPosting.findById(job_id);
    if (!jobPosting) {
      return res.status(404).json({
        message: "Job posting not found",
      });
    }

    // Determine if user is primary or secondary recruiter
    const isPrimary =
      jobPosting.primary_recruiter_id &&
      jobPosting.primary_recruiter_id.toString() === currentUserId.toString();
    const isSecondary =
      jobPosting.secondary_recruiter_id &&
      Array.isArray(jobPosting.secondary_recruiter_id) &&
      jobPosting.secondary_recruiter_id.some(
        (id) => id.toString() === currentUserId.toString()
      );

    if (!isPrimary && !isSecondary) {
      return res.status(403).json({
        message:
          "You are not assigned as a primary or secondary recruiter for this job posting",
      });
    }

    const recruiter_type = isPrimary ? "primary" : "secondary";

    // Validate availability slots
    const validatedSlots = [];
    for (const slot of availability_slots) {
      if (!slot.date || !slot.start_time || !slot.end_time) {
        return res.status(400).json({
          message:
            "Each availability slot must have date, start_time, and end_time",
        });
      }

      // Validate date format
      const slotDate = new Date(slot.date);
      if (isNaN(slotDate.getTime())) {
        return res.status(400).json({
          message: `Invalid date format: ${slot.date}`,
        });
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(slot.start_time) || !timeRegex.test(slot.end_time)) {
        return res.status(400).json({
          message:
            "Time format must be HH:MM (24-hour format). Invalid: " +
            slot.start_time +
            " or " +
            slot.end_time,
        });
      }

      // Validate that end_time is after start_time
      const [startHour, startMin] = slot.start_time.split(":").map(Number);
      const [endHour, endMin] = slot.end_time.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          message: `end_time must be after start_time for slot: ${slot.date}`,
        });
      }

      validatedSlots.push({
        date: slotDate,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available !== undefined ? slot.is_available : true,
      });
    }

    // Check if availability already exists
    let availability = await RecruiterAvailability.findOne({
      recruiter_id: currentUserId,
      job_id: job_id,
    });

    if (availability) {
      // Update existing availability
      availability.recruiter_type = recruiter_type;
      availability.availability_slots = validatedSlots;
      await availability.save();
    } else {
      // Create new availability
      availability = await RecruiterAvailability.create({
        recruiter_id: currentUserId,
        job_id: job_id,
        recruiter_type: recruiter_type,
        availability_slots: validatedSlots,
      });
    }

    // Populate references for response
    await availability.populate("recruiter_id", "name email");
    await availability.populate("job_id", "title company");

    res.status(200).json({
      message: "Recruiter availability saved successfully",
      availability,
    });
  } catch (error) {
    console.error("Error creating/updating availability:", error);
    res.status(500).json({
      message: error.message || "Failed to save recruiter availability",
    });
  }
};

// Get availability by recruiter and job
export const getAvailabilityByRecruiterAndJob = async (req, res) => {
  try {
    const { job_id } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Validate job_id format
    if (!/^[0-9a-fA-F]{24}$/.test(job_id)) {
      return res.status(400).json({
        message: "Invalid job_id format",
      });
    }

    const availability = await RecruiterAvailability.findOne({
      recruiter_id: currentUserId,
      job_id: job_id,
    })
      .populate("recruiter_id", "name email")
      .populate("job_id", "title company");

    if (!availability) {
      return res.status(404).json({
        message: "Availability not found for this recruiter and job",
      });
    }

    res.status(200).json(availability);
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch availability",
    });
  }
};

// Get all availability for a specific job
export const getAvailabilityByJob = async (req, res) => {
  try {
    const { job_id } = req.params;

    // Validate job_id format
    if (!/^[0-9a-fA-F]{24}$/.test(job_id)) {
      return res.status(400).json({
        message: "Invalid job_id format",
      });
    }

    const availabilities = await RecruiterAvailability.find({
      job_id: job_id,
    })
      .populate("recruiter_id", "name email")
      .populate("job_id", "title company");

    res.status(200).json({
      count: availabilities.length,
      availabilities,
    });
  } catch (error) {
    console.error("Error fetching availability by job:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch availability",
    });
  }
};

// Get all availability for a specific recruiter
export const getAvailabilityByRecruiter = async (req, res) => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const availabilities = await RecruiterAvailability.find({
      recruiter_id: currentUserId,
    })
      .populate("recruiter_id", "name email")
      .populate("job_id", "title company");

    res.status(200).json({
      count: availabilities.length,
      availabilities,
    });
  } catch (error) {
    console.error("Error fetching availability by recruiter:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch availability",
    });
  }
};

// Update availability slots (add, remove, or modify)
export const updateAvailabilitySlots = async (req, res) => {
  try {
    const { job_id } = req.params;
    const { action, slot } = req.body; // action: "add" | "remove" | "update", slot: slot object
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Validate job_id format
    if (!/^[0-9a-fA-F]{24}$/.test(job_id)) {
      return res.status(400).json({
        message: "Invalid job_id format",
      });
    }

    if (!action || !["add", "remove", "update"].includes(action)) {
      return res.status(400).json({
        message: "action is required and must be 'add', 'remove', or 'update'",
      });
    }

    if (!slot) {
      return res.status(400).json({
        message: "slot is required",
      });
    }

    // Find availability
    const availability = await RecruiterAvailability.findOne({
      recruiter_id: currentUserId,
      job_id: job_id,
    });

    if (!availability) {
      return res.status(404).json({
        message: "Availability not found. Please create availability first.",
      });
    }

    // Verify user is assigned to this job
    const jobPosting = await JobPosting.findById(job_id);
    if (!jobPosting) {
      return res.status(404).json({
        message: "Job posting not found",
      });
    }

    const isPrimary =
      jobPosting.primary_recruiter_id &&
      jobPosting.primary_recruiter_id.toString() === currentUserId.toString();
    const isSecondary =
      jobPosting.secondary_recruiter_id &&
      Array.isArray(jobPosting.secondary_recruiter_id) &&
      jobPosting.secondary_recruiter_id.some(
        (id) => id.toString() === currentUserId.toString()
      );

    if (!isPrimary && !isSecondary) {
      return res.status(403).json({
        message:
          "You are not assigned as a primary or secondary recruiter for this job posting",
      });
    }

    if (action === "add") {
      // Validate new slot
      if (!slot.date || !slot.start_time || !slot.end_time) {
        return res.status(400).json({
          message:
            "Slot must have date, start_time, and end_time for 'add' action",
        });
      }

      const slotDate = new Date(slot.date);
      if (isNaN(slotDate.getTime())) {
        return res.status(400).json({
          message: `Invalid date format: ${slot.date}`,
        });
      }

      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(slot.start_time) || !timeRegex.test(slot.end_time)) {
        return res.status(400).json({
          message: "Time format must be HH:MM (24-hour format)",
        });
      }

      const [startHour, startMin] = slot.start_time.split(":").map(Number);
      const [endHour, endMin] = slot.end_time.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          message: "end_time must be after start_time",
        });
      }

      // Check for duplicate slot (same date and time)
      const isDuplicate = availability.availability_slots.some(
        (existingSlot) =>
          existingSlot.date.getTime() === slotDate.getTime() &&
          existingSlot.start_time === slot.start_time &&
          existingSlot.end_time === slot.end_time
      );

      if (isDuplicate) {
        return res.status(400).json({
          message: "This availability slot already exists",
        });
      }

      availability.availability_slots.push({
        date: slotDate,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available !== undefined ? slot.is_available : true,
      });
    } else if (action === "remove") {
      // Remove slot by index or by matching date/time
      if (slot.index !== undefined) {
        if (
          slot.index < 0 ||
          slot.index >= availability.availability_slots.length
        ) {
          return res.status(400).json({
            message: "Invalid slot index",
          });
        }
        availability.availability_slots.splice(slot.index, 1);
      } else if (slot.date && slot.start_time && slot.end_time) {
        const slotDate = new Date(slot.date);
        const index = availability.availability_slots.findIndex(
          (existingSlot) =>
            existingSlot.date.getTime() === slotDate.getTime() &&
            existingSlot.start_time === slot.start_time &&
            existingSlot.end_time === slot.end_time
        );

        if (index === -1) {
          return res.status(404).json({
            message: "Slot not found",
          });
        }

        availability.availability_slots.splice(index, 1);
      } else {
        return res.status(400).json({
          message:
            "For 'remove' action, provide either slot.index or slot.date, start_time, and end_time",
        });
      }
    } else if (action === "update") {
      // Update existing slot
      if (slot.index === undefined) {
        return res.status(400).json({
          message: "slot.index is required for 'update' action",
        });
      }

      if (
        slot.index < 0 ||
        slot.index >= availability.availability_slots.length
      ) {
        return res.status(400).json({
          message: "Invalid slot index",
        });
      }

      const existingSlot = availability.availability_slots[slot.index];

      // Update fields if provided
      if (slot.date) {
        const slotDate = new Date(slot.date);
        if (isNaN(slotDate.getTime())) {
          return res.status(400).json({
            message: `Invalid date format: ${slot.date}`,
          });
        }
        existingSlot.date = slotDate;
      }

      if (slot.start_time) {
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(slot.start_time)) {
          return res.status(400).json({
            message: "Time format must be HH:MM (24-hour format)",
          });
        }
        existingSlot.start_time = slot.start_time;
      }

      if (slot.end_time) {
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(slot.end_time)) {
          return res.status(400).json({
            message: "Time format must be HH:MM (24-hour format)",
          });
        }
        existingSlot.end_time = slot.end_time;
      }

      if (slot.is_available !== undefined) {
        existingSlot.is_available = slot.is_available;
      }

      // Validate that end_time is after start_time
      const [startHour, startMin] = existingSlot.start_time
        .split(":")
        .map(Number);
      const [endHour, endMin] = existingSlot.end_time.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          message: "end_time must be after start_time",
        });
      }
    }

    await availability.save();

    // Populate references for response
    await availability.populate("recruiter_id", "name email");
    await availability.populate("job_id", "title company");

    res.status(200).json({
      message: `Availability slot ${action}ed successfully`,
      availability,
    });
  } catch (error) {
    console.error("Error updating availability slots:", error);
    res.status(500).json({
      message: error.message || "Failed to update availability slots",
    });
  }
};

// Delete availability
export const deleteAvailability = async (req, res) => {
  try {
    const { job_id } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Validate job_id format
    if (!/^[0-9a-fA-F]{24}$/.test(job_id)) {
      return res.status(400).json({
        message: "Invalid job_id format",
      });
    }

    const availability = await RecruiterAvailability.findOneAndDelete({
      recruiter_id: currentUserId,
      job_id: job_id,
    });

    if (!availability) {
      return res.status(404).json({
        message: "Availability not found",
      });
    }

    res.status(200).json({
      message: "Availability deleted successfully",
      availability,
    });
  } catch (error) {
    console.error("Error deleting availability:", error);
    res.status(500).json({
      message: error.message || "Failed to delete availability",
    });
  }
};

