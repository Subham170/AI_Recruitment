import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import bolnaRoutes from "./bolna/route.js";
import candidateProgressRoutes from "./candidate_progress/route.js";
import candidateRoutes from "./candidates/route.js";
import chatRoutes from "./chat/route.js";
import connectDB from "./config/database.js";
import dashboardRoutes from "./dashboard/route.js";
import jobPostingRoutes from "./job_posting/route.js";
import matchingRoutes from "./matching/route.js";
import recruiterAvailabilityRoutes from "./recruiter_availability/route.js";
import recruiterTasksRoutes from "./recruiter_tasks/route.js";
import resumeParserRoutes from "./resume_parser/route.js";
import userRoutes from "./user/route.js";

// TODO: Uncomment when these route files are created
// import applicationRoutes from "./routes/application.routes.js";
// import jobRoutes from "./routes/job.routes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to Database
connectDB();

// Start cron jobs for scheduled tasks (after DB connection)
setTimeout(async () => {
  const { startCronJobs } = await import("./services/cronJobs.js");
  await startCronJobs();

  // const { startMatchingCronJobs } = await import("./services/matchingCronJobs.js");
  // await startMatchingCronJobs();
}, 2000); // Wait 2 seconds for DB connection to establish

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "AI Recruitment API Server",
    version: "1.0.0",
    status: "running",
  });
});

// User routes (includes auth: /api/users/login, /api/users/profile, and CRUD: /api/users/*)
app.use("/api/users", userRoutes);

// Auth routes alias (for backward compatibility)
app.use("/api/auth", userRoutes);

// Candidate routes
app.use("/api/candidates", candidateRoutes);

// Candidate progress routes
app.use("/api/candidate-progress", candidateProgressRoutes);

// Job posting routes
app.use("/api/job-postings", jobPostingRoutes);

// Matching routes
app.use("/api/matching", matchingRoutes);

// Bolna routes
app.use("/api/bolna", bolnaRoutes);

// Recruiter availability routes
app.use("/api/recruiter-availability", recruiterAvailabilityRoutes);

// Recruiter tasks routes
app.use("/api/recruiter-tasks", recruiterTasksRoutes);

// Dashboard routes
app.use("/api/dashboard", dashboardRoutes);

// Resume parser routes
app.use("/api/resume-parser", resumeParserRoutes);

// Chat routes
app.use("/api/chat", chatRoutes);

// TODO: Uncomment when these route files are created
// app.use("/api/applications", applicationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
