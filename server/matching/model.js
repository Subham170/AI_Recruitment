import mongoose from "mongoose";

// Job Matches Schema - stores candidates that match a job
const jobMatchesSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
      unique: true,
      index: true,
    },
    matches: [
      {
        candidateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Candidate",
          required: true,
        },
        matchScore: {
          type: Number,
          required: true,
          min: 0,
          max: 1,
        },
        matchedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "applied"],
          default: "pending",
        },
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Candidate Matches Schema - stores jobs that match a candidate
const candidateMatchesSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      unique: true,
      index: true,
    },
    matches: [
      {
        jobId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "JobPosting",
          required: true,
        },
        matchScore: {
          type: Number,
          required: true,
          min: 0,
          max: 1,
        },
        matchedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient queries
// jobMatchesSchema.index({ jobId: 1 });
// candidateMatchesSchema.index({ candidateId: 1 });

// // Compound indexes for nested queries
// jobMatchesSchema.index({ "matches.candidateId": 1 });
// candidateMatchesSchema.index({ "matches.jobId": 1 });

const JobMatches = mongoose.model("JobMatches", jobMatchesSchema);
const CandidateMatches = mongoose.model(
  "CandidateMatches",
  candidateMatchesSchema
);

export { CandidateMatches, JobMatches };
