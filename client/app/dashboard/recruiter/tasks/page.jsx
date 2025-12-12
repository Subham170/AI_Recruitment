"use client";

import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Loading from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { recruiterTasksAPI } from "@/lib/api";
import { Calendar, Clock, Mail, User, Briefcase, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateTimeShort, formatDateShort, formatFullDateTimeWithAMPM } from "@/lib/timeFormatter";
import { toast } from "sonner";

export default function RecruiterTasksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();
  const [tasks, setTasks] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [taskStats, setTaskStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    scheduled: 0,
    completed: 0,
  });
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [filter, setFilter] = useState("all"); // all, today, week, month
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && user.role !== "recruiter") {
      router.push(`/dashboard/${user.role}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === "recruiter") {
      fetchTasks();
      fetchTaskStats();
    }
  }, [user, filter]);

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      setError(null);
      const params = filter !== "all" ? { filter } : {};
      const response = await recruiterTasksAPI.getTasks(params);
      if (response.success) {
        setTasks(response.tasks || []);
        setStatistics(response.statistics || {});
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchTaskStats = async () => {
    try {
      const response = await recruiterTasksAPI.getTaskStats();
      if (response.success) {
        setTaskStats(response.statistics || {});
      }
    } catch (err) {
      console.error("Error fetching task stats:", err);
    }
  };

  const handleStatusUpdate = async (taskId, newStatus, interviewTime) => {
    try {
      // If trying to mark as completed, check if interview time has passed
      if (newStatus === "completed") {
        const now = new Date();
        const interviewDate = new Date(interviewTime);
        
        if (interviewDate > now) {
          const interviewTimeFormatted = formatFullDateTimeWithAMPM(interviewTime);
          const currentTimeFormatted = formatFullDateTimeWithAMPM(now);
          
          toast.error("Cannot Complete Task", {
            description: `The interview is scheduled for ${interviewTimeFormatted}. Please wait until the interview time has passed before marking it as completed.`,
            duration: 5000,
          });
          return;
        }
      }
      
      await recruiterTasksAPI.updateTaskStatus(taskId, newStatus);
      await fetchTasks();
      await fetchTaskStats();
      
      // Show success message
      if (newStatus === "completed") {
        toast.success("Task Completed", {
          description: "The interview task has been marked as completed.",
        });
      } else if (newStatus === "cancelled") {
        toast.success("Task Cancelled", {
          description: "The interview task has been cancelled.",
        });
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      toast.error("Failed to Update Task", {
        description: err.message || "An error occurred while updating the task status.",
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { variant: "default", icon: Clock, label: "Scheduled" },
      completed: { variant: "default", icon: CheckCircle2, label: "Completed", className: "bg-green-500" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled" },
      rescheduled: { variant: "secondary", icon: AlertCircle, label: "Rescheduled" },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "recruiter") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2 text-slate-900">
                My Tasks
              </h2>
              <p className="text-slate-600">
                View and manage your interview assignments
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {taskStats.today}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {taskStats.week}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {taskStats.month}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {taskStats.total}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter and Tasks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Interview Tasks</CardTitle>
                    <CardDescription>
                      Manage your scheduled interviews
                    </CardDescription>
                  </div>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tasks</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <div className="flex justify-center items-center py-12">
                    <Loading size="md" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-red-600">
                    {error}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No tasks found for the selected period.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div
                        key={task._id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusBadge(task.status)}
                              <span className="text-sm text-slate-500">
                                {formatDateTimeShort(task.interview_time)}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="font-medium">
                                  {task.candidate_id?.name || "Unknown Candidate"}
                                </span>
                                {task.candidate_id?.email && (
                                  <span className="text-sm text-slate-500">
                                    ({task.candidate_id.email})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-700">
                                  {task.job_id?.title || "Unknown Job"}
                                </span>
                                {task.job_id?.company && (
                                  <span className="text-sm text-slate-500">
                                    @ {task.job_id.company}
                                  </span>
                                )}
                              </div>

                              {task.email_sent && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <Mail className="w-4 h-4" />
                                  <span>Email sent</span>
                                  {task.email_sent_at && (
                                    <span className="text-slate-500">
                                      ({formatDateShort(task.email_sent_at)})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {task.status === "scheduled" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleStatusUpdate(task._id, "completed", task.interview_time)
                                  }
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Mark Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleStatusUpdate(task._id, "cancelled")
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

