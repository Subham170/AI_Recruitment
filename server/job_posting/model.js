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
      enum: ["SDET", "QA", "DevOps", "Frontend", "Backend", "Full-stack"],
      default: [],
    },
    ctc: {
      type: String, // e.g., "10-15 LPA", "20-30 LPA", etc.
    },
    exp_req: {
      type: Number, // Experience required in years
      default: 0,
    },
    skills: {
      type: [String], // Array of required skills
      default: [],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const JobPosting = mongoose.model("JobPosting", jobPostingSchema);

export default JobPosting;
