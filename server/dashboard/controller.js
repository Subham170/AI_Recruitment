import JobPosting from "../job_posting/model.js";
import { JobMatches } from "../matching/model.js";
import BolnaCall from "../bolna/model.js";
import User from "../user/model.js";

// Get dashboard statistics for all roles
export const getDashboardStats = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Unauthorized - User ID not found",
      });
    }

    let activeJobs = 0;
    let totalApplications = 0;
    let candidatesInPipeline = 0;
    let scheduledInterviews = 0;
    let jobIds = [];

    // For recruiters: only their jobs
    if (userRole === "recruiter") {
      // 1. Active Jobs - Count jobs where recruiter is primary or secondary
      activeJobs = await JobPosting.countDocuments({
        $or: [
          { primary_recruiter_id: currentUserId },
          { secondary_recruiter_id: currentUserId },
        ],
      });

      // Get all job IDs where recruiter is primary or secondary
      const recruiterJobs = await JobPosting.find({
        $or: [
          { primary_recruiter_id: currentUserId },
          { secondary_recruiter_id: currentUserId },
        ],
      }).select("_id");

      jobIds = recruiterJobs.map((job) => job._id);
    } else {
      // For admin and manager: all jobs
      activeJobs = await JobPosting.countDocuments({});
      const allJobs = await JobPosting.find({}).select("_id");
      jobIds = allJobs.map((job) => job._id);
    }

    // 2. Applications - Total matches (candidates matched to jobs)
    const jobMatches = await JobMatches.find({
      jobId: { $in: jobIds },
    });

    jobMatches.forEach((match) => {
      totalApplications += match.matches?.length || 0;
    });

    // 3. Candidates - Unique candidates in pipeline (matched to jobs)
    const uniqueCandidateIds = new Set();
    jobMatches.forEach((match) => {
      if (match.matches && Array.isArray(match.matches)) {
        match.matches.forEach((m) => {
          if (m.candidateId) {
            uniqueCandidateIds.add(m.candidateId.toString());
          }
        });
      }
    });
    candidatesInPipeline = uniqueCandidateIds.size;

    // 4. Interviews - Scheduled interviews (BolnaCall records for jobs)
    const now = new Date();
    scheduledInterviews = await BolnaCall.countDocuments({
      jobId: { $in: jobIds },
      callScheduledAt: { $gte: now },
    });

    // Additional stats for admin
    let additionalStats = {};
    if (userRole === "admin") {
      const totalUsers = await User.countDocuments({});
      additionalStats.totalUsers = totalUsers;
    }

    // Additional stats for manager
    if (userRole === "manager") {
      const totalRecruiters = await User.countDocuments({ role: "recruiter" });
      additionalStats.totalRecruiters = totalRecruiters;
    }

    res.status(200).json({
      success: true,
      stats: {
        activeJobs,
        applications: totalApplications,
        candidates: candidatesInPipeline,
        interviews: scheduledInterviews,
        ...additionalStats,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

