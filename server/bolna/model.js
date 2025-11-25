import mongoose from "mongoose";

const bolnaCallSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
    },
    executionId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
    },
    callScheduledAt: {
      type: Date,
      required: true,
    },
    userScheduledAt: {
      type: Date,
      default: null,
      required: false,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    emailRetryCount: {
      type: Number,
      default: 0,
    },
    emailFailed: {
      type: Boolean,
      default: false,
    },
    emailFailedAt: {
      type: Date,
      default: null,
    },
    lastEmailError: {
      type: String,
      default: null,
    },
    lastEmailErrorAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const BolnaCall = mongoose.model("BolnaCall", bolnaCallSchema);

export default BolnaCall;
