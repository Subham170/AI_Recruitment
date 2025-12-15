import { formatFullDateTimeWithAMPM } from "../utils/timeFormatter.js";
import RecruiterTask from "./model.js";

/**
 * Get all tasks for a recruiter with optional filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRecruiterTasks = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Only recruiters can view their own tasks
    if (userRole !== "recruiter") {
      return res.status(403).json({
        message: "Only recruiters can view tasks",
      });
    }

    const { filter, startDate, endDate } = req.query;

    // Build date filter based on filter type
    let dateFilter = {};
    const now = new Date();

    if (filter === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        interview_time: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      };
    } else if (filter === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      dateFilter = {
        interview_time: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      };
    } else if (filter === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      dateFilter = {
        interview_time: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      };
    } else if (startDate && endDate) {
      // Custom date range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        interview_time: {
          $gte: start,
          $lte: end,
        },
      };
    }

    // Build query
    const query = {
      recruiter_id: currentUserId,
      ...dateFilter,
    };

    // Fetch tasks with populated fields
    const tasks = await RecruiterTask.find(query)
      .populate("candidate_id", "name email phone_number")
      .populate("job_id", "title company job_type")
      .populate("bolna_call_id", "executionId status")
      .sort({ interview_time: 1 }) // Sort by interview time ascending
      .lean();

    // Get statistics
    const totalTasks = tasks.length;
    const scheduledTasks = tasks.filter((t) => t.status === "scheduled").length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const cancelledTasks = tasks.filter((t) => t.status === "cancelled").length;

    res.status(200).json({
      success: true,
      tasks,
      statistics: {
        total: totalTasks,
        scheduled: scheduledTasks,
        completed: completedTasks,
        cancelled: cancelledTasks,
      },
    });
  } catch (error) {
    console.error("Error fetching recruiter tasks:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch recruiter tasks",
    });
  }
};

/**
 * Get task statistics for a recruiter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRecruiterTaskStats = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (userRole !== "recruiter") {
      return res.status(403).json({
        message: "Only recruiters can view task statistics",
      });
    }

    const now = new Date();

    // Today's tasks
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todayTasks = await RecruiterTask.countDocuments({
      recruiter_id: currentUserId,
      interview_time: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    // This week's tasks
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekTasks = await RecruiterTask.countDocuments({
      recruiter_id: currentUserId,
      interview_time: {
        $gte: startOfWeek,
        $lte: endOfWeek,
      },
    });

    // This month's tasks
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const monthTasks = await RecruiterTask.countDocuments({
      recruiter_id: currentUserId,
      interview_time: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    // Total tasks
    const totalTasks = await RecruiterTask.countDocuments({
      recruiter_id: currentUserId,
    });

    // Tasks by status
    const scheduledCount = await RecruiterTask.countDocuments({
      recruiter_id: currentUserId,
      status: "scheduled",
    });

    const completedCount = await RecruiterTask.countDocuments({
      recruiter_id: currentUserId,
      status: "completed",
    });

    res.status(200).json({
      success: true,
      statistics: {
        today: todayTasks,
        week: weekTasks,
        month: monthTasks,
        total: totalTasks,
        scheduled: scheduledCount,
        completed: completedCount,
      },
    });
  } catch (error) {
    console.error("Error fetching recruiter task statistics:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch task statistics",
    });
  }
};

/**
 * Get interviews (all tasks) for a specific candidate
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCandidateInterviews = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;
    const { candidateId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Allow admin, manager, and recruiter roles
    if (!["admin", "manager", "recruiter"].includes(userRole)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (!candidateId) {
      return res.status(400).json({
        message: "Candidate ID is required",
      });
    }

    // Build query - filter by candidate (all statuses)
    const query = {
      candidate_id: candidateId,
    };

    // Fetch all tasks (interviews) with populated fields
    const interviews = await RecruiterTask.find(query)
      .populate("candidate_id", "name email phone_no")
      .populate("job_id", "title company job_type ctc exp_req")
      .populate(
        "bolna_call_id",
        "executionId status callScheduledAt userScheduledAt"
      )
      .populate("recruiter_id", "name email")
      .sort({ interview_time: 1 }) // Sort by interview time ascending
      .lean();

    // Normalize shape and surface job details for the UI
    const transformedInterviews = interviews.map((interview) => ({
      ...interview,
      job_title: interview.job_id?.title || null,
      job_company: interview.job_id?.company || null,
    }));

    // Get statistics
    const totalInterviews = transformedInterviews.length;
    const scheduledInterviews = transformedInterviews.filter(
      (i) => i.status === "scheduled"
    ).length;
    const completedInterviews = transformedInterviews.filter(
      (i) => i.status === "completed"
    ).length;
    const cancelledInterviews = transformedInterviews.filter(
      (i) => i.status === "cancelled"
    ).length;
    const rescheduledInterviews = transformedInterviews.filter(
      (i) => i.status === "rescheduled"
    ).length;

    res.status(200).json({
      success: true,
      interviews: transformedInterviews,
      count: totalInterviews,
      statistics: {
        total: totalInterviews,
        scheduled: scheduledInterviews,
        completed: completedInterviews,
        cancelled: cancelledInterviews,
        rescheduled: rescheduledInterviews,
      },
    });
  } catch (error) {
    console.error("Error fetching candidate interviews:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch candidate interviews",
    });
  }
};

/**
 * Update task status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const { taskId } = req.params;
    const { status, notes } = req.body;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (
      !status ||
      !["scheduled", "completed", "cancelled", "rescheduled"].includes(status)
    ) {
      return res.status(400).json({
        message:
          "Valid status is required (scheduled, completed, cancelled, rescheduled)",
      });
    }

    const task = await RecruiterTask.findOne({
      _id: taskId,
      recruiter_id: currentUserId,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // Validate that interview time has passed before allowing completion
    if (status === "completed") {
      const now = new Date();
      const interviewTime = new Date(task.interview_time);

      if (interviewTime > now) {
        const interviewTimeFormatted = formatFullDateTimeWithAMPM(
          task.interview_time,
          "Asia/Kolkata"
        );
        const currentTimeFormatted = formatFullDateTimeWithAMPM(
          now,
          "Asia/Kolkata"
        );

        return res.status(400).json({
          message: `Cannot complete task before the scheduled interview time. The interview is scheduled for ${interviewTimeFormatted}. Please wait until the interview time has passed before marking it as completed.`,
          interviewTime: task.interview_time,
          interviewTimeFormatted: interviewTimeFormatted,
          currentTime: now.toISOString(),
          currentTimeFormatted: currentTimeFormatted,
        });
      }
    }

    const updateData = {
      status,
      ...(notes !== undefined && { notes }),
      ...(status === "completed" && { completed_at: new Date() }),
    };

    const updatedTask = await RecruiterTask.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true }
    )
      .populate("candidate_id", "name email phone_number")
      .populate("job_id", "title company job_type")
      .populate("bolna_call_id", "executionId status");

    res.status(200).json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({
      message: error.message || "Failed to update task status",
    });
  }
};
