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
import { useAuth } from "@/contexts/AuthContext";
import { dashboardAPI } from "@/lib/api";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ManagerDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();
  const [stats, setStats] = useState({
    activeJobs: 0,
    applications: 0,
    candidates: 0,
    interviews: 0,
    totalRecruiters: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && user.role !== "manager") {
      router.push(`/dashboard/${user.role}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === "manager") {
      fetchDashboardStats();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-white">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "manager") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Dashboard</p>
                <h2 className="text-3xl font-bold mb-2 text-slate-900">
                  Welcome, {user.name}
                </h2>
                <p className="text-slate-600">
                  Manage your recruitment team and operations
                </p>
              </div>
              <Button
                variant="secondary"
                className="bg-slate-900 text-white hover:bg-slate-800 hidden lg:inline-flex"
                onClick={() => setSidebarOpen(true)}
              >
                Open Menu
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900">
                    Recruiters
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Users className="h-4 w-4 text-slate-700" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingStats ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      stats.totalRecruiters || 0
                    )}
                  </div>
                  <p className="text-xs text-slate-600">Team members</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900">
                    Job Postings
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Briefcase className="h-4 w-4 text-slate-700" />
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
                  <p className="text-xs text-slate-600">Active jobs</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900">
                    Applications
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-slate-100">
                    <ClipboardList className="h-4 w-4 text-slate-700" />
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

              <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900">
                    Interviews
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Calendar className="h-4 w-4 text-slate-700" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingStats ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      stats.interviews
                    )}
                  </div>
                  <p className="text-xs text-slate-600">Scheduled</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() =>
                  router.push("/dashboard/manager/user-management")
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    User Management
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Manage all users
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() =>
                  router.push("/dashboard/manager/manage-job-posting")
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <Briefcase className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Manage Job Posting
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Manage all job listings
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() => router.push("/dashboard/manager/top-applicants")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Top Applicants
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    View top candidates
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() => router.push("/dashboard/manager/reports")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Reports
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Generate reports
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() => router.push("/dashboard/manager/settings")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <Settings className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Settings
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Team settings
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
