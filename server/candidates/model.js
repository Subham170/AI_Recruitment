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
      required: true,
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
      type: [Number], // Array of 1536 numbers (embedding vector)
      default: null,
      select: false, // Don't return in default queries (large data)
    },
    currentCTC: {
      type: String, // Current CTC in LPA (Lakhs Per Annum)
      default: null,
    },
    expectedCTC: {
      type: String, // Expected CTC in LPA (Lakhs Per Annum)
      default: null,
    },
    location: {
      type: String, // Current location
      default: null,
    },
    lookingForJobChange: {
      type: String, // Are you Looking for any Job Change
      default: null,
    },
    availabilityForInterview: {
      type: String, // What's your availability to join for Interview Call?
      default: null,
    },
    joinDate: {
      type: String, // How Soon can you able to join
      default: null,
    },
    overallNote: {
      type: String, // Overall Note
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds created_at and updated_at fields
  }
);

const Candidate = mongoose.model("Candidate", candidateSchema);

export default Candidate;
