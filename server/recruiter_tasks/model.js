import mongoose from "mongoose";

const recruiterTaskSchema = new mongoose.Schema(
  {
    recruiter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
      index: true,
    },
    bolna_call_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BolnaCall",
      required: true,
      unique: true,
    },
    interview_time: {
      type: Date,
      required: true,
      index: true,
    },
    interview_end_time: {
      type: Date,
      required: false,
      default: null,
    },
    call_scheduled_at: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
      index: true,
    },
    email_sent: {
      type: Boolean,
      default: false,
    },
    email_sent_at: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
recruiterTaskSchema.index({ recruiter_id: 1, interview_time: 1 });
recruiterTaskSchema.index({ recruiter_id: 1, status: 1 });
recruiterTaskSchema.index({ interview_time: 1, status: 1 });

const RecruiterTask = mongoose.model("RecruiterTask", recruiterTaskSchema);

export default RecruiterTask;

