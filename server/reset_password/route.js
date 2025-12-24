import express from "express";
import {
  forgotPassword,
  verifyOTP,
  resetPasswordController,
} from "./controller.js";

const router = express.Router();

// All routes are public (no authentication required)
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPasswordController);

export default router;

