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
  ClipboardList,
  Database,
  FileText,
  PieChart,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();
  const [stats, setStats] = useState({
    activeJobs: 0,
    applications: 0,
    candidates: 0,
    interviews: 0,
    totalUsers: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "admin") {
      router.push(`/dashboard/${user.role}`);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (user && user.role === "admin") {
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

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Dashboard</p>
                <h2 className="text-3xl font-bold mb-2 text-slate-900">
                  Welcome, {user.name}
                </h2>
                <p className="text-slate-600">
                  Manage the entire platform from this central dashboard
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
                    Total Users
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
                      stats.totalUsers || 0
                    )}
                  </div>
                  <p className="text-xs text-slate-600">All platform users</p>
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
                  <p className="text-xs text-slate-600">Total applications</p>
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
                    System Health
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-slate-100">
                    <PieChart className="h-4 w-4 text-slate-700" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">100%</div>
                  <p className="text-xs text-slate-600">Platform status</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                className="group cursor-pointer border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-cyan-200"
                onClick={() => router.push("/dashboard/admin/user-management")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 group-hover:text-cyan-700 transition-colors">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-cyan-50 transition-all">
                      <Users className="h-5 w-5 text-slate-700 group-hover:text-cyan-700" />
                    </div>
                    User Management
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Manage all platform users
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-cyan-200"
                onClick={() => router.push("/dashboard/admin/top-applicants")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 group-hover:text-cyan-700 transition-colors">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-cyan-50 transition-all">
                      <TrendingUp className="h-5 w-5 text-slate-700 group-hover:text-cyan-700" />
                    </div>
                    Top Applicants
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    View top candidates
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-cyan-200"
                onClick={() => router.push("/dashboard/admin/reports")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 group-hover:text-cyan-700 transition-colors">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-cyan-50 transition-all">
                      <FileText className="h-5 w-5 text-slate-700 group-hover:text-cyan-700" />
                    </div>
                    Reports
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Generate reports
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-cyan-200"
                onClick={() => router.push("/dashboard/admin/config")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 group-hover:text-cyan-700 transition-colors">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-cyan-50 transition-all">
                      <Settings className="h-5 w-5 text-slate-700 group-hover:text-cyan-700" />
                    </div>
                    System Configuration
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Configure system settings
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-cyan-200"
                onClick={() => router.push("/dashboard/admin/security")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 group-hover:text-cyan-700 transition-colors">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-cyan-50 transition-all">
                      <Shield className="h-5 w-5 text-slate-700 group-hover:text-cyan-700" />
                    </div>
                    Security
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Security settings and monitoring
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="group cursor-pointer border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-cyan-200"
                onClick={() => router.push("/dashboard/admin/database")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 group-hover:text-cyan-700 transition-colors">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-cyan-50 transition-all">
                      <Database className="h-5 w-5 text-slate-700 group-hover:text-cyan-700" />
                    </div>
                    Database
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Database management
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
