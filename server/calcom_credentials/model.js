import mongoose from "mongoose";

const calcomCredentialsSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    apiSecretKey: {
      type: String,
      required: true,
    },
    eventTypeId: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const CalcomCredentials = mongoose.model("CalcomCredentials", calcomCredentialsSchema);

export default CalcomCredentials;

