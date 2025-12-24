import mongoose from "mongoose";

const resetPasswordSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true, // For faster lookups
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired documents
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5, // Maximum OTP verification attempts
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
resetPasswordSchema.index({ email: 1, verified: 1 });

const ResetPassword = mongoose.model("ResetPassword", resetPasswordSchema);

export default ResetPassword;

