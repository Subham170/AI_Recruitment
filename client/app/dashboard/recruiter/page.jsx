"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardAPI, recruiterTasksAPI } from "@/lib/api";
import { formatDateTimeShort } from "@/lib/timeFormatter";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RecruiterDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();
  const [stats, setStats] = useState({
    activeJobs: 0,
    applications: 0,
    candidates: 0,
    interviews: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [tasks, setTasks] = useState({
    today: [],
    thisWeek: [],
    thisMonth: [],
  });
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTab, setSelectedTab] = useState("today");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && user.role !== "recruiter") {
      router.push(`/dashboard/${user.role}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === "recruiter") {
      fetchDashboardStats();
      fetchTasks();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const response = await dashboardAPI.getDashboardStats();
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const allTasksResponse = await recruiterTasksAPI.getTasks({
        filter: "all",
      });
      if (allTasksResponse.success && allTasksResponse.tasks) {
        const allTasks = allTasksResponse.tasks || [];
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const monthFromNow = new Date(today);
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);

        const todayTasks = allTasks.filter((task) => {
          const taskDate = new Date(task.interview_time);
          return (
            taskDate >= today &&
            taskDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
          );
        });

        const weekTasks = allTasks.filter((task) => {
          const taskDate = new Date(task.interview_time);
          return taskDate >= today && taskDate < weekFromNow;
        });

        const monthTasks = allTasks.filter((task) => {
          const taskDate = new Date(task.interview_time);
          return taskDate >= today && taskDate < monthFromNow;
        });

        setTasks({
          today: todayTasks,
          thisWeek: weekTasks,
          thisMonth: monthTasks,
        });
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: {
        variant: "default",
        icon: Clock,
        label: "Scheduled",
        badgeClassName: "bg-slate-900 text-white",
      },
      completed: {
        variant: "default",
        icon: CheckCircle2,
        label: "Completed",
        badgeClassName: "bg-green-500 text-white",
      },
      cancelled: {
        variant: "destructive",
        icon: XCircle,
        label: "Cancelled",
        badgeClassName: "bg-red-500 text-white",
      },
      rescheduled: {
        variant: "secondary",
        icon: AlertCircle,
        label: "Rescheduled",
        badgeClassName: "bg-yellow-500 text-white",
      },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.badgeClassName}>
        <Icon className="w-3 h-3 mr-1 text-white" />
        {config.label}
      </Badge>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getTimeUntilInterview = (interviewTime) => {
    const now = new Date();
    const interview = new Date(interviewTime);
    const diff = interview - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes > 0 ? `${minutes}m` : "Now";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-white">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "recruiter") {
    return null;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
      <GlassBackground />
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div>
                <p className="text-sm font-medium text-indigo-600 mb-1">
                  {getGreeting()}
                </p>
                <h2 className="text-4xl font-bold mb-2 bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {user.name}
                </h2>
                <p className="text-slate-600 text-lg">
                  Manage your recruitment pipeline and find the best candidates
                </p>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/70 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Today
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {tasks.today.length}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">interviews</p>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50">
                    <Clock className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/70 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      This Week
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {tasks.thisWeek.length}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">interviews</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/70 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      This Month
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {tasks.thisMonth.length}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">interviews</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="space-y-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Upcoming Tasks
                  </h2>
                  <p className="text-slate-600">
                    Your scheduled interviews and assignments
                  </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-0 bg-white/60 rounded-2xl p-1 w-fit backdrop-blur-xl border border-white/70 shadow-sm">
                  <button
                    onClick={() => setSelectedTab("today")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedTab === "today"
                        ? "bg-linear-to-r from-indigo-600 to-blue-600 text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setSelectedTab("week")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedTab === "week"
                        ? "bg-linear-to-r from-indigo-600 to-blue-600 text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setSelectedTab("month")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedTab === "month"
                        ? "bg-linear-to-r from-indigo-600 to-blue-600 text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    This Month
                  </button>
                </div>
              </div>

              {/* Tasks Content */}
              <Card className="border-white/60 bg-white/75 shadow-[0_18px_60px_rgba(15,23,42,0.25)] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    {selectedTab === "today" && `Today (${tasks.today.length})`}
                    {selectedTab === "week" &&
                      `This Week (${tasks.thisWeek.length})`}
                    {selectedTab === "month" &&
                      `This Month (${tasks.thisMonth.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTasks ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center gap-2 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading tasks...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {selectedTab === "today" && (
                        <>
                          {tasks.today.length === 0 ? (
                            <div className="text-center py-12">
                              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                              <p className="text-slate-500 font-medium">
                                No tasks scheduled for today
                              </p>
                              <p className="text-sm text-slate-400 mt-1">
                                You're all caught up!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {tasks.today.map((task) => (
                                <div
                                  key={task._id}
                                  className="group border border-white/70 bg-white/60 rounded-2xl p-5 hover:bg-white/90 hover:shadow-lg transition-all duration-200 backdrop-blur-md"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        {getStatusBadge(task.status)}
                                        <span className="text-sm font-medium text-slate-600">
                                          {formatDateTimeShort(
                                            task.interview_time
                                          )}
                                        </span>
                                        {task.status === "scheduled" && (
                                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                                            in{" "}
                                            {getTimeUntilInterview(
                                              task.interview_time
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-lg bg-indigo-50">
                                            <User className="w-4 h-4 text-indigo-600" />
                                          </div>
                                          <span className="font-semibold text-slate-900">
                                            {task.candidate_id?.name ||
                                              "Unknown Candidate"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-lg bg-slate-50">
                                            <Briefcase className="w-4 h-4 text-slate-600" />
                                          </div>
                                          <span className="text-slate-700">
                                            {task.job_id?.title ||
                                              "Unknown Job"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/dashboard/recruiter/manage-job-posting/${task.job_id?._id}/candidate/${task.candidate_id?._id}`
                                        )
                                      }
                                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-slate-100 transition-all duration-200"
                                      title="View details"
                                    >
                                      <ExternalLink className="w-4 h-4 text-slate-600" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {selectedTab === "week" && (
                        <>
                          {tasks.thisWeek.length === 0 ? (
                            <div className="text-center py-12">
                              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                              <p className="text-slate-500 font-medium">
                                No tasks scheduled for this week
                              </p>
                              <p className="text-sm text-slate-400 mt-1">
                                Schedule interviews to see them here
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {tasks.thisWeek.map((task) => (
                                <div
                                  key={task._id}
                                  className="group border border-white/70 bg-white/60 rounded-2xl p-5 hover:bg-white/90 hover:shadow-lg transition-all duration-200 backdrop-blur-md"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        {getStatusBadge(task.status)}
                                        <span className="text-sm font-medium text-slate-600">
                                          {formatDateTimeShort(
                                            task.interview_time
                                          )}
                                        </span>
                                        {task.status === "scheduled" && (
                                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                                            in{" "}
                                            {getTimeUntilInterview(
                                              task.interview_time
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-lg bg-indigo-50">
                                            <User className="w-4 h-4 text-indigo-600" />
                                          </div>
                                          <span className="font-semibold text-slate-900">
                                            {task.candidate_id?.name ||
                                              "Unknown Candidate"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-lg bg-slate-50">
                                            <Briefcase className="w-4 h-4 text-slate-600" />
                                          </div>
                                          <span className="text-slate-700">
                                            {task.job_id?.title ||
                                              "Unknown Job"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/dashboard/recruiter/manage-job-posting/${task.job_id?._id}/candidate/${task.candidate_id?._id}`
                                        )
                                      }
                                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-slate-100 transition-all duration-200"
                                      title="View details"
                                    >
                                      <ExternalLink className="w-4 h-4 text-slate-600" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {selectedTab === "month" && (
                        <>
                          {tasks.thisMonth.length === 0 ? (
                            <div className="text-center py-12">
                              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                              <p className="text-slate-500 font-medium">
                                No tasks scheduled for this month
                              </p>
                              <p className="text-sm text-slate-400 mt-1">
                                Schedule interviews to see them here
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {tasks.thisMonth.map((task) => (
                                <div
                                  key={task._id}
                                  className="group border border-white/70 bg-white/60 rounded-2xl p-5 hover:bg-white/90 hover:shadow-lg transition-all duration-200 backdrop-blur-md"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        {getStatusBadge(task.status)}
                                        <span className="text-sm font-medium text-slate-600">
                                          {formatDateTimeShort(
                                            task.interview_time
                                          )}
                                        </span>
                                        {task.status === "scheduled" && (
                                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                                            in{" "}
                                            {getTimeUntilInterview(
                                              task.interview_time
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-lg bg-indigo-50">
                                            <User className="w-4 h-4 text-indigo-600" />
                                          </div>
                                          <span className="font-semibold text-slate-900">
                                            {task.candidate_id?.name ||
                                              "Unknown Candidate"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-lg bg-slate-50">
                                            <Briefcase className="w-4 h-4 text-slate-600" />
                                          </div>
                                          <span className="text-slate-700">
                                            {task.job_id?.title ||
                                              "Unknown Job"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/dashboard/recruiter/manage-job-posting/${task.job_id?._id}/candidate/${task.candidate_id?._id}`
                                        )
                                      }
                                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-slate-100 transition-all duration-200"
                                      title="View details"
                                    >
                                      <ExternalLink className="w-4 h-4 text-slate-600" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
