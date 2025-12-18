import mongoose from "mongoose";

const jobPostingSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    role: {
      type: [String],
      default: [],
    },
    ctc: {
      type: String, // e.g., "10-15 LPA", "20-30 LPA", etc.
    },
    exp_req: {
      type: Number, // Experience required in years
      default: 0,
    },
    job_type: {
      type: String,
      enum: ["Full time", "Internship"],
      default: "Full time",
    },
    skills: {
      type: [String], // Array of required skills
      default: [],
    },
    vector: {
      type: [Number], // Array of 384 numbers (embedding vector)
      default: null,
      select: false, // Don't return in default queries (large data)
    },
    primary_recruiter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    secondary_recruiter_id: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "open", "closed"],
      default: "draft",
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const JobPosting = mongoose.model("JobPosting", jobPostingSchema);

export default JobPosting;
