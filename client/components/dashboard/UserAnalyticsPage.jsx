"use client";

import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import Loading from "@/components/ui/loading";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardAPI } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";

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

  const formatTimelineData = (data) => {
    if (!data) return [];
    const months = Object.keys(data).sort();
    return months.map((month) => ({
      month: month.split("-")[1] + "/" + month.split("-")[0].slice(2),
      value: data[month],
    }));
  };

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7c7c",
  ];

  if (authLoading || loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
        <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
        <div className="flex flex-1 flex-col overflow-hidden relative z-10">
          <main className="flex-1 overflow-y-auto p-6">
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

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => router.push(getBackPath())}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Reports
              </Button>
            </div>

            {error && (
              <div className="mb-6 border-2 border-red-300 bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 font-medium">
                  {error}
                </p>
              </div>
            )}

            {analyticsData ? (
              <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Total Jobs
                    </p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                      {analyticsData.analytics.overview.totalJobs}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Applications
                    </p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 dark:from-green-400 dark:to-green-600 bg-clip-text text-transparent">
                      {analyticsData.analytics.overview.totalApplications}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Candidates
                    </p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
                      {analyticsData.analytics.overview.totalCandidates}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Interviews
                    </p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 dark:from-orange-400 dark:to-orange-600 bg-clip-text text-transparent">
                      {analyticsData.analytics.overview.totalInterviews}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Avg Match Score
                    </p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-800 dark:from-cyan-400 dark:to-cyan-600 bg-clip-text text-transparent">
                      {analyticsData.analytics.overview.avgMatchScore}%
                    </p>
                  </div>
                </div>

                {/* Timeline Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                      Jobs Timeline
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart
                        data={formatTimelineData(
                          analyticsData.analytics.timeline.jobsByMonth
                        )}
                      >
                        <defs>
                          <linearGradient
                            id="colorJobs"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8884d8"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8884d8"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          className="dark:stroke-slate-700"
                        />
                        <XAxis
                          dataKey="month"
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                        />
                        <YAxis
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#8884d8"
                          fillOpacity={1}
                          fill="url(#colorJobs)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                      Applications Timeline
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart
                        data={formatTimelineData(
                          analyticsData.analytics.timeline.applicationsByMonth
                        )}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          className="dark:stroke-slate-700"
                        />
                        <XAxis
                          dataKey="month"
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                        />
                        <YAxis
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#82ca9d"
                          strokeWidth={3}
                          dot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Distribution Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                      Role Distribution
                    </h3>
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
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(
                            analyticsData.analytics.distributions.roles
                          ).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                      Top Skills Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(
                          analyticsData.analytics.distributions.skills
                        )
                          .map(([name, value]) => ({ name, value }))
                          .slice(0, 5)}
                        layout="vertical"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          className="dark:stroke-slate-700"
                        />
                        <XAxis
                          type="number"
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={80}
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                      Experience Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(
                          analyticsData.analytics.distributions.experience
                        ).map(([name, value]) => ({ name, value }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          className="dark:stroke-slate-700"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                        />
                        <YAxis
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#82ca9d"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Jobs Table */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                    Top Performing Jobs
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100/50 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300">
                            Job Title
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300">
                            Company
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300">
                            Applications
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300">
                            Avg Match Score
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {analyticsData.analytics.topJobs.slice(0, 5).map(
                          (job, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                                {job.title}
                              </td>
                              <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                {job.company}
                              </td>
                              <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                                {job.applications}
                              </td>
                              <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                                {Math.round(job.avgMatchScore * 100)}%
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                No analytics data available
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

