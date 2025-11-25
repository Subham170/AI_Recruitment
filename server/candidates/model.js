import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone_no: {
      type: String,
    },
    image: {
      type: String, // profile photo URL
    },
    skills: {
      type: [String], // array of skill names
      default: [],
    },
    experience: {
      type: Number, // in years
      default: 0,
    },
    resume_url: {
      type: String,
    },
    role: {
      type: [String],
      enum: ["SDET", "QA", "DevOps", "Frontend", "Backend", "Full-stack"],
      default: [],
    },
    bio: {
      type: String, // short intro about the user
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    social_links: {
      linkedin: {
        type: String,
      },
      github: {
        type: String,
      },
      portfolio: {
        type: String,
      },
    },
    vector: {
      type: [Number], // Array of 384 numbers (embedding vector)
      default: null,
      select: false, // Don't return in default queries (large data)
    },
  },
  {
    timestamps: true, // Automatically adds created_at and updated_at fields
  }
);

const Candidate = mongoose.model("Candidate", candidateSchema);

export default Candidate;
