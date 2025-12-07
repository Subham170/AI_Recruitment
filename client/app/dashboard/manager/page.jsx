"use client";

import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
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
  BarChart3,
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
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
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-1/2 h-1/2"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(6, 182, 212, 0.05), transparent 70%)",
          }}
        ></div>
        <div
          className="absolute bottom-0 left-0 w-1/2 h-1/2"
          style={{
            background:
              "radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.05), transparent 70%)",
          }}
        ></div>
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(14, 165, 233, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Navbar
          title="Manager Dashboard"
          subtitle="Overview of recruitment operations"
          showLogout={true}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Welcome, {user.name}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Manage your recruitment team and operations
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Recruiters
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                    <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                    {loadingStats ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      stats.totalRecruiters || 0
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Team members
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Job Postings
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                    <Briefcase className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                    {loadingStats ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      stats.activeJobs
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Active jobs
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Applications
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                    <ClipboardList className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                    {loadingStats ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      stats.applications
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Total received
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Interviews
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                    <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                    {loadingStats ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      stats.interviews
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Scheduled
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() => router.push("/dashboard/manager/recruiters")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Recruiters
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Manage recruiter team
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() => router.push("/dashboard/manager/jobs")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <Briefcase className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Job Postings
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Manage all job listings
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() => router.push("/dashboard/manager/applications")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <ClipboardList className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Applications
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Review all applications
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() => router.push("/dashboard/manager/candidates")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Candidates
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Browse candidate pool
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:border-cyan-300 dark:hover:border-cyan-700"
                onClick={() => router.push("/dashboard/manager/analytics")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-all">
                      <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Analytics & Reports
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    View recruitment metrics
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
