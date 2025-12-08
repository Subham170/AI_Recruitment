"use client";

import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
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
      <div className="flex h-screen overflow-hidden bg-white relative">
        <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
        <div className="flex flex-1 flex-col overflow-hidden relative z-10">
          <main className="flex-1 overflow-y-auto p-6 bg-white">
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
    <div className="flex h-screen overflow-hidden bg-white relative">
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

        <main className="flex-1 overflow-y-auto p-6 bg-white">
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                    <p className="text-xs text-slate-600 mb-1">Total Jobs</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analyticsData.analytics.overview.totalJobs}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                    <p className="text-xs text-slate-600 mb-1">Applications</p>
                    <p className="text-2xl font-bold text-green-600">
                      {analyticsData.analytics.overview.totalApplications}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                    <p className="text-xs text-slate-600 mb-1">Candidates</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {analyticsData.analytics.overview.totalCandidates}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                    <p className="text-xs text-slate-600 mb-1">Interviews</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {analyticsData.analytics.overview.totalInterviews}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                    <p className="text-xs text-slate-600 mb-1">
                      Avg Match Score
                    </p>
                    <p className="text-2xl font-bold text-cyan-600">
                      {analyticsData.analytics.overview.avgMatchScore}%
                    </p>
                  </div>
                </div>

                {/* Timeline Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
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

                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">
                      Applications Timeline
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart
                        data={formatTimelineData(
                          analyticsData.analytics.timeline.applicationsByMonth
                        )}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
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
                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">
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

                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#64748b" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={80}
                          stroke="#64748b"
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

                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">
                      Experience Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(
                          analyticsData.analytics.distributions.experience
                        ).map(([name, value]) => ({ name, value }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
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
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-slate-900">
                    Top Performing Jobs
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b-2 border-slate-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-900">
                            Job Title
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-900">
                            Company
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-900">
                            Applications
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-900">
                            Avg Match Score
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {analyticsData.analytics.topJobs
                          .slice(0, 5)
                          .map((job, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-50/80 transition-colors bg-white"
                            >
                              <td className="px-4 py-2 text-slate-900">
                                {job.title}
                              </td>
                              <td className="px-4 py-2 text-slate-600">
                                {job.company}
                              </td>
                              <td className="px-4 py-2 text-slate-900">
                                {job.applications}
                              </td>
                              <td className="px-4 py-2 text-slate-900">
                                {Math.round(job.avgMatchScore * 100)}%
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
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
