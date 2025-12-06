import mongoose from "mongoose";

const recruiterAvailabilitySchema = new mongoose.Schema(
  {
    recruiter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
    },
    recruiter_type: {
      type: String,
      enum: ["primary", "secondary"],
      required: true,
    },
    availability_slots: [
      {
        date: {
          type: Date,
          required: true,
        },
        start_time: {
          type: String, // Format: "HH:MM" (e.g., "10:00", "14:30")
          required: true,
        },
        end_time: {
          type: String, // Format: "HH:MM" (e.g., "11:00", "15:30")
          required: true,
        },
        is_available: {
          type: Boolean,
          default: true, // Can be set to false if scheduled on that date
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Compound index to ensure one availability record per recruiter-job combination
recruiterAvailabilitySchema.index(
  { recruiter_id: 1, job_id: 1 },
  { unique: true }
);

// Index for efficient queries
recruiterAvailabilitySchema.index({ recruiter_id: 1 });
recruiterAvailabilitySchema.index({ job_id: 1 });
recruiterAvailabilitySchema.index({ recruiter_type: 1 });

const RecruiterAvailability = mongoose.model(
  "RecruiterAvailability",
  recruiterAvailabilitySchema
);

export default RecruiterAvailability;

