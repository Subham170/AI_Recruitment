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
  CheckCircle2,
  ClipboardList,
  Clock,
  User,
  Users,
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
      scheduled: { variant: "default", icon: Clock, label: "Scheduled", badgeClassName: "bg-slate-900 text-white" },
      completed: {
        variant: "default",
        icon: CheckCircle2,
        label: "Completed",
        badgeClassName: "bg-green-500 text-white",
      },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled", badgeClassName: "bg-red-500 text-white" },
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
                {/* <p className="text-sm text-slate-500">Dashboard</p> */}
                <h2 className="text-3xl font-bold mb-2 text-slate-900">
                  Welcome, {user.name}
                </h2>
                <p className="text-slate-600">
                  Manage your recruitment pipeline and find the best candidates
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-white/60 bg-white/70 shadow-[0_18px_60px_rgba(15,23,42,0.25)] backdrop-blur-xl hover:-translate-y-px hover:shadow-[0_24px_80px_rgba(15,23,42,0.35)] transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900">
                    Active Jobs
                  </CardTitle>
                  <div className="p-2 rounded-xl bg-indigo-50">
                    <Briefcase className="h-4 w-4 text-indigo-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingStats ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      stats.activeJobs
                    )}
                  </div>
                  <p className="text-xs text-slate-600">Job postings</p>
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/70 shadow-[0_18px_60px_rgba(15,23,42,0.25)] backdrop-blur-xl hover:-translate-y-px hover:shadow-[0_24px_80px_rgba(15,23,42,0.35)] transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900">
                    Applications
                  </CardTitle>
                  <div className="p-2 rounded-xl bg-sky-50">
                    <ClipboardList className="h-4 w-4 text-sky-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingStats ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      stats.applications
                    )}
                  </div>
                  <p className="text-xs text-slate-600">Total received</p>
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/70 shadow-[0_18px_60px_rgba(15,23,42,0.25)] backdrop-blur-xl hover:-translate-y-px hover:shadow-[0_24px_80px_rgba(15,23,42,0.35)] transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900">
                    Candidates
                  </CardTitle>
                  <div className="p-2 rounded-xl bg-emerald-50">
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingStats ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      stats.candidates
                    )}
                  </div>
                  <p className="text-xs text-slate-600">In pipeline</p>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Tasks */}
            <div className="space-y-6">
              <div className="mb-6 flex items-center justify-between">
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
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      selectedTab === "today"
                        ? "bg-white text-blue-600 border border-slate-200 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setSelectedTab("week")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      selectedTab === "week"
                        ? "bg-white text-blue-600 border border-slate-200 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setSelectedTab("month")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      selectedTab === "month"
                        ? "bg-white text-blue-600 border border-slate-200 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
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
                    <div className="text-center py-4 text-slate-500">
                      Loading...
                    </div>
                  ) : (
                    <>
                      {selectedTab === "today" && (
                        <>
                          {tasks.today.length === 0 ? (
                            <div className="text-center py-4 text-slate-500">
                              No tasks scheduled for today
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {tasks.today.map((task) => (
                                <div
                                  key={task._id}
                                  className="border border-white/70 bg-white/60 rounded-2xl p-4 hover:bg-white/80 hover:shadow-md transition-colors backdrop-blur-md"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        {getStatusBadge(task.status)}
                                        <span className="text-sm text-slate-500">
                                          {formatDateTimeShort(
                                            task.interview_time
                                          )}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <User className="w-4 h-4 text-slate-400" />
                                          <span className="font-medium text-slate-900">
                                            {task.candidate_id?.name ||
                                              "Unknown Candidate"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Briefcase className="w-4 h-4 text-slate-400" />
                                          <span className="text-slate-700">
                                            {task.job_id?.title ||
                                              "Unknown Job"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
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
                            <div className="text-center py-4 text-slate-500">
                              No tasks scheduled for this week
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {tasks.thisWeek.map((task) => (
                                <div
                                  key={task._id}
                                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        {getStatusBadge(task.status)}
                                        <span className="text-sm text-slate-500">
                                          {formatDateTimeShort(
                                            task.interview_time
                                          )}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <User className="w-4 h-4 text-slate-400" />
                                          <span className="font-medium text-slate-900">
                                            {task.candidate_id?.name ||
                                              "Unknown Candidate"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Briefcase className="w-4 h-4 text-slate-400" />
                                          <span className="text-slate-700">
                                            {task.job_id?.title ||
                                              "Unknown Job"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
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
                            <div className="text-center py-4 text-slate-500">
                              No tasks scheduled for this month
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {tasks.thisMonth.map((task) => (
                                <div
                                  key={task._id}
                                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        {getStatusBadge(task.status)}
                                        <span className="text-sm text-slate-500">
                                          {formatDateTimeShort(
                                            task.interview_time
                                          )}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <User className="w-4 h-4 text-slate-400" />
                                          <span className="font-medium text-slate-900">
                                            {task.candidate_id?.name ||
                                              "Unknown Candidate"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Briefcase className="w-4 h-4 text-slate-400" />
                                          <span className="text-slate-700">
                                            {task.job_id?.title ||
                                              "Unknown Job"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
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
