"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardAPI } from "@/lib/api";
import {
  ArrowLeft,
  Award,
  Briefcase,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function UserAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;
  const { sidebarOpen, setSidebarOpen } = useSidebarState();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "admin" && user.role !== "manager") {
      router.push(`/dashboard/${user.role}`);
      return;
    }

    if (userId) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, userId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardAPI.getUserAnalytics(userId);
      if (response.success) {
        setAnalyticsData(response);
      } else {
        setError("Failed to load analytics data");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const formatTimelineDataForPie = (data) => {
    if (!data) return [];
    const months = Object.keys(data).sort();
    return months.map((month) => ({
      name: month.split("-")[1] + "/" + month.split("-")[0].slice(2),
      value: data[month],
    }));
  };

  const COLORS = [
    "#6366f1", // indigo
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#ec4899", // pink
    "#14b8a6", // teal
  ];

  if (authLoading || loading) {
    return (
      <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
        <GlassBackground />
        <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
        <div className="flex flex-1 flex-col overflow-hidden relative z-10">
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loading size="lg" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return null;
  }

  const getBackPath = () => {
    return user.role === "admin"
      ? "/dashboard/admin/reports"
      : "/dashboard/manager/reports";
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
      <GlassBackground />
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Navbar
          title="User Analytics"
          subtitle={
            analyticsData?.user?.name
              ? `Detailed analytics for ${analyticsData.user.name}`
              : "Performance metrics and insights"
          }
          showLogout={true}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => router.push(getBackPath())}
                className="gap-2 border-slate-200 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Reports
              </Button>
            </div>

            {error && (
              <div className="mb-6 border-2 border-red-300 bg-red-50 rounded-lg p-4">
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            {analyticsData ? (
              <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="group relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white/80 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wide">
                        Total Jobs
                      </p>
                      <p className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {analyticsData.analytics.overview?.totalJobs || 0}
                      </p>
                    </div>
                  </div>
                  <div className="group relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white/80 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-emerald-50">
                          <FileText className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wide">
                        Applications
                      </p>
                      <p className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        {analyticsData.analytics.overview?.totalApplications ||
                          0}
                      </p>
                    </div>
                  </div>
                  <div className="group relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white/80 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-cyan-50">
                          <Award className="w-4 h-4 text-cyan-600" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wide">
                        Avg Match
                      </p>
                      <p className="text-3xl font-bold bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                        {analyticsData.analytics.overview?.avgMatchScore
                          ? Math.round(
                              analyticsData.analytics.overview.avgMatchScore *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="group relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-indigo-500/5 to-blue-500/5 rounded-full blur-3xl"></div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="p-2 rounded-lg bg-indigo-50">
                          <Briefcase className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Jobs by Month
                        </h3>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={formatTimelineDataForPie(
                              analyticsData.analytics.timeline.jobsByMonth
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {formatTimelineDataForPie(
                              analyticsData.analytics.timeline.jobsByMonth
                            ).map((entry, index) => (
                              <Cell
                                key={`cell-jobs-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.98)",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: "12px" }}
                            iconType="circle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl"></div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="p-2 rounded-lg bg-emerald-50">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Experience Distribution
                        </h3>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(
                              analyticsData.analytics.distributions.experience
                            ).map(([name, value]) => ({ name, value }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              percent > 0.05
                                ? `${name}: ${(percent * 100).toFixed(0)}%`
                                : ""
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={100}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {Object.entries(
                              analyticsData.analytics.distributions.experience
                            ).map((entry, index) => (
                              <Cell
                                key={`cell-exp-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.98)",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: "12px" }}
                            iconType="circle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Distribution Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="group relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-purple-500/5 to-pink-500/5 rounded-full blur-3xl"></div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="p-2 rounded-lg bg-purple-50">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Role Distribution
                        </h3>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(
                              analyticsData.analytics.distributions.roles
                            ).map(([name, value]) => ({ name, value }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={200}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {Object.entries(
                              analyticsData.analytics.distributions.roles
                            ).map((entry, index) => (
                              <Cell
                                key={`cell-roles-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.98)",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: "12px" }}
                            iconType="circle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl"></div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <Award className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Top Skills Distribution
                        </h3>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(
                              analyticsData.analytics.distributions.skills
                            )
                              .map(([name, value]) => ({ name, value }))
                              .slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={300}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {Object.entries(
                              analyticsData.analytics.distributions.skills
                            )
                              .slice(0, 5)
                              .map((entry, index) => (
                                <Cell
                                  key={`cell-skills-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.98)",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: "12px" }}
                            iconType="circle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* All Jobs Table */}
                <div className="group relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-2 rounded-lg bg-indigo-50">
                        <Briefcase className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">
                        All Jobs
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-linear-to-r from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Job Title
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Company
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Applications
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Avg Match Score
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analyticsData.analytics.topJobs?.map((job, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-50/80 transition-colors duration-200 bg-white/50"
                            >
                              <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                                {job.title}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-600">
                                {job.company}
                              </td>
                              <td className="px-5 py-4 text-sm font-medium text-slate-900">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {job.applications}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm font-semibold">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  {Math.round(job.avgMatchScore * 100)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                No analytics data available
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
