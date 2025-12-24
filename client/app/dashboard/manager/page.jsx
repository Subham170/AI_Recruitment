"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import Loading from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardAPI } from "@/lib/api";
import {
  ArrowRight,
  Briefcase,
  FileText,
  UserCheck,
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
      <div className="relative min-h-screen flex items-center justify-center bg-[#eef2f7]">
        <GlassBackground />
        <div className="relative z-10">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "manager") {
    return null;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
      <GlassBackground />
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Management Link */}
              <button
                onClick={() =>
                  router.push("/dashboard/manager/user-management")
                }
                className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/70 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
              >
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                    User Management
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Manage all users and team members
                  </p>
                </div>
              </button>

              {/* Manage Job Posting Link */}
              <button
                onClick={() =>
                  router.push("/dashboard/manager/manage-job-posting")
                }
                className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/70 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
              >
                <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-linear-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/25">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    Manage Jobs
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Create, edit, and manage job listings
                  </p>
                </div>
              </button>

              {/* Candidate List Link */}
              <button
                onClick={() => router.push("/dashboard/manager/candidate")}
                className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/70 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
              >
                <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-linear-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/25">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                    All Candidates
                  </h3>
                  <p className="text-slate-600 text-sm">
                    View and manage all candidates
                  </p>
                </div>
              </button>

              {/* Reports Link */}
              <button
                onClick={() => router.push("/dashboard/manager/reports")}
                className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/70 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
              >
                <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors">
                    Reports
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Generate and view reports
                  </p>
                </div>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
