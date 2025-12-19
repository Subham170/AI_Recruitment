import JobPosting from "../job_posting/model.js";
import { JobMatches } from "../matching/model.js";
import BolnaCall from "../bolna/model.js";
import User from "../user/model.js";
import Candidate from "../candidates/model.js";

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
    } else if (userRole === "manager") {
      // For managers: only jobs from their assigned recruiters
      const assignedRecruiters = await User.find({
        role: "recruiter",
        assignedManager: currentUserId,
      }).select("_id");
      const recruiterIds = assignedRecruiters.map((r) => r._id);

      if (recruiterIds.length > 0) {
        activeJobs = await JobPosting.countDocuments({
          $or: [
            { primary_recruiter_id: { $in: recruiterIds } },
            { secondary_recruiter_id: { $in: recruiterIds } },
          ],
        });

        const managerJobs = await JobPosting.find({
          $or: [
            { primary_recruiter_id: { $in: recruiterIds } },
            { secondary_recruiter_id: { $in: recruiterIds } },
          ],
        }).select("_id");

        jobIds = managerJobs.map((job) => job._id);
      } else {
        // No assigned recruiters, so no jobs
        activeJobs = 0;
        jobIds = [];
      }
    } else {
      // For admin: all jobs (or could filter to their managers' recruiters' jobs)
      // For now, keeping it as all jobs for admin
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
      const totalRecruiters = await User.countDocuments({
        role: "recruiter",
        assignedManager: currentUserId,
      });
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

// Get detailed analytics for a specific user (manager or recruiter)
export const getUserAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserRole = req.user?.role;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    // Validate user ID format
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({
        message: "Invalid user ID format",
      });
    }

    // Find the user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Security checks based on user role and assignments
    const currentUserId = req.user?.id;

    // Only managers and recruiters have analytics
    if (targetUser.role !== "manager" && targetUser.role !== "recruiter") {
      return res.status(400).json({
        message: "Analytics only available for managers and recruiters",
      });
    }

    // Security check: managers can only see recruiter analytics for their assigned recruiters
    if (currentUserRole === "manager") {
      if (targetUser.role !== "recruiter") {
        return res.status(403).json({
          message: "Access denied - Managers can only view recruiter analytics",
        });
      }
      // Check if the recruiter is assigned to this manager
      if (
        !targetUser.assignedManager ||
        targetUser.assignedManager.toString() !== currentUserId
      ) {
        return res.status(403).json({
          message: "Access denied - This recruiter is not assigned to you",
        });
      }
    }

    // Security check: admins can only see analytics for their assigned managers and those managers' recruiters
    if (currentUserRole === "admin") {
      if (targetUser.role === "manager") {
        // Check if the manager is assigned to this admin
        if (
          !targetUser.assignedAdmin ||
          targetUser.assignedAdmin.toString() !== currentUserId
        ) {
          return res.status(403).json({
            message: "Access denied - This manager is not assigned to you",
          });
        }
      } else if (targetUser.role === "recruiter") {
        // Check if the recruiter's manager is assigned to this admin
        if (!targetUser.assignedManager) {
          return res.status(403).json({
            message: "Access denied - This recruiter has no assigned manager",
          });
        }
        const recruiterManager = await User.findById(targetUser.assignedManager);
        if (
          !recruiterManager ||
          !recruiterManager.assignedAdmin ||
          recruiterManager.assignedAdmin.toString() !== currentUserId
        ) {
          return res.status(403).json({
            message:
              "Access denied - This recruiter's manager is not assigned to you",
          });
        }
      }
    }

    const userIdObj = targetUser._id;

    // Get all jobs for this user
    let userJobs = [];
    if (targetUser.role === "recruiter") {
      userJobs = await JobPosting.find({
        $or: [
          { primary_recruiter_id: userIdObj },
          { secondary_recruiter_id: userIdObj },
        ],
      }).populate("primary_recruiter_id", "name email");
    } else if (targetUser.role === "manager") {
      // For managers, get jobs from their assigned recruiters
      const assignedRecruiters = await User.find({
        role: "recruiter",
        assignedManager: userIdObj,
      }).select("_id");
      const recruiterIds = assignedRecruiters.map((r) => r._id);

      if (recruiterIds.length > 0) {
        userJobs = await JobPosting.find({
          $or: [
            { primary_recruiter_id: { $in: recruiterIds } },
            { secondary_recruiter_id: { $in: recruiterIds } },
          ],
        }).populate("primary_recruiter_id", "name email");
      } else {
        userJobs = [];
      }
    } else {
      // For other roles, get all jobs
      userJobs = await JobPosting.find({}).populate(
        "primary_recruiter_id",
        "name email"
      );
    }

    const jobIds = userJobs.map((job) => job._id);

    // Get job matches
    const jobMatches = jobIds.length > 0
      ? await JobMatches.find({
          jobId: { $in: jobIds },
        }).populate("jobId", "title company")
      : [];

    // Calculate statistics
    let totalApplications = 0;
    let totalCandidates = new Set();
    let matchScores = [];
    let jobsByMonth = {};
    let applicationsByMonth = {};
    let interviewsByMonth = {};
    let roleDistribution = {};
    let skillDistribution = {};
    let avgMatchScore = 0;

    jobMatches.forEach((match) => {
      const matches = match.matches || [];
      totalApplications += matches.length;

      matches.forEach((m) => {
        totalCandidates.add(m.candidateId.toString());
        matchScores.push(m.matchScore);

        // Group by month
        const matchDate = new Date(m.matchedAt);
        const monthKey = `${matchDate.getFullYear()}-${String(
          matchDate.getMonth() + 1
        ).padStart(2, "0")}`;
        applicationsByMonth[monthKey] =
          (applicationsByMonth[monthKey] || 0) + 1;
      });
    });

    // Calculate average match score
    if (matchScores.length > 0) {
      avgMatchScore =
        matchScores.reduce((sum, score) => sum + score, 0) /
        matchScores.length;
    }

    // Group jobs by month
    userJobs.forEach((job) => {
      const jobDate = new Date(job.createdAt);
      const monthKey = `${jobDate.getFullYear()}-${String(
        jobDate.getMonth() + 1
      ).padStart(2, "0")}`;
      jobsByMonth[monthKey] = (jobsByMonth[monthKey] || 0) + 1;

      // Role distribution
      if (job.role && Array.isArray(job.role)) {
        job.role.forEach((r) => {
          roleDistribution[r] = (roleDistribution[r] || 0) + 1;
        });
      }

      // Skill distribution
      if (job.skills && Array.isArray(job.skills)) {
        job.skills.forEach((skill) => {
          skillDistribution[skill] = (skillDistribution[skill] || 0) + 1;
        });
      }
    });

    // Get interviews
    const now = new Date();
    const interviews = jobIds.length > 0
      ? await BolnaCall.find({
          jobId: { $in: jobIds },
        })
          .populate("candidateId", "name email")
          .populate("jobId", "title company")
      : [];

    interviews.forEach((interview) => {
      const interviewDate = new Date(interview.callScheduledAt);
      const monthKey = `${interviewDate.getFullYear()}-${String(
        interviewDate.getMonth() + 1
      ).padStart(2, "0")}`;
      interviewsByMonth[monthKey] = (interviewsByMonth[monthKey] || 0) + 1;
    });

    // Get top performing jobs
    const jobPerformance = userJobs.map((job) => {
      const jobMatch = jobMatches.find(
        (m) => m.jobId._id.toString() === job._id.toString()
      );
      const matchCount = jobMatch?.matches?.length || 0;
      const avgScore =
        jobMatch?.matches?.length > 0
          ? jobMatch.matches.reduce(
              (sum, m) => sum + m.matchScore,
              0
            ) / jobMatch.matches.length
          : 0;

      return {
        jobId: job._id,
        title: job.title,
        company: job.company,
        applications: matchCount,
        avgMatchScore: avgScore,
        createdAt: job.createdAt,
      };
    });

    jobPerformance.sort((a, b) => b.applications - a.applications);

    // Get candidate experience distribution
    const candidateIds = Array.from(totalCandidates);
    const candidates = candidateIds.length > 0
      ? await Candidate.find({
          _id: { $in: candidateIds },
        }).select("experience")
      : [];

    const experienceDistribution = {
      "0-1": 0,
      "2-3": 0,
      "4-5": 0,
      "6-10": 0,
      "10+": 0,
    };

    candidates.forEach((candidate) => {
      const exp = candidate.experience || 0;
      if (exp <= 1) experienceDistribution["0-1"]++;
      else if (exp <= 3) experienceDistribution["2-3"]++;
      else if (exp <= 5) experienceDistribution["4-5"]++;
      else if (exp <= 10) experienceDistribution["6-10"]++;
      else experienceDistribution["10+"]++;
    });

    res.status(200).json({
      success: true,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      analytics: {
        overview: {
          totalJobs: userJobs.length,
          totalApplications: totalApplications,
          totalCandidates: totalCandidates.size,
          totalInterviews: interviews.length,
          avgMatchScore: Math.round(avgMatchScore * 100) / 100,
        },
        timeline: {
          jobsByMonth: jobsByMonth,
          applicationsByMonth: applicationsByMonth,
          interviewsByMonth: interviewsByMonth,
        },
        distributions: {
          roles: roleDistribution,
          skills: Object.fromEntries(
            Object.entries(skillDistribution)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
          ),
          experience: experienceDistribution,
        },
        topJobs: jobPerformance.slice(0, 10),
        recentInterviews: interviews
          .sort((a, b) => new Date(b.callScheduledAt) - new Date(a.callScheduledAt))
          .slice(0, 10)
          .map((i) => ({
            candidateName: i.candidateId?.name || "N/A",
            candidateEmail: i.candidateId?.email || "N/A",
            jobTitle: i.jobId?.title || "N/A",
            company: i.jobId?.company || "N/A",
            scheduledAt: i.callScheduledAt,
            status: i.status || "Scheduled",
          })),
      },
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    res.status(500).json({
      message: "Failed to fetch user analytics",
      error: error.message,
    });
  }
};

