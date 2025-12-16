import mongoose from "mongoose";

const stageSchema = {
  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  completedAt: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: "",
  },
};

const candidateEntrySchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    applied: { ...stageSchema },
    screening: { ...stageSchema },
    interviews: { ...stageSchema },
    offer: { ...stageSchema },
    rejected: {
      ...stageSchema,
      rejectedAt: {
        type: Date,
        default: null,
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

const candidateProgressSchema = new mongoose.Schema(
  {
    jobPostingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
      index: true,
    },
    candidates: {
      type: [candidateEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Unique candidate per jobPosting enforced at application level
// (array uniqueness not easily indexed in MongoDB)

const CandidateProgress = mongoose.model(
  "CandidateProgress",
  candidateProgressSchema
);

export default CandidateProgress;
