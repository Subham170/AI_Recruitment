"use client";

import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { jobPostingAPI, userAPI } from "@/lib/api";
import {
  Briefcase,
  Download,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ReportsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [reports, setReports] = useState({
    managers: [],
    recruiters: [],
  });
  const [stats, setStats] = useState({
    managers: { total: 0, active: 0, jobsPosted: 0 },
    recruiters: { total: 0, active: 0, jobsPosted: 0 },
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Only admin and manager can access reports
    if (user.role !== "admin" && user.role !== "manager") {
      router.push(`/dashboard/${user.role}`);
      return;
    }

    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine which roles to fetch based on user's role
      const rolesToFetch =
        user.role === "admin" ? ["manager", "recruiter"] : ["recruiter"];

      // Fetch users for each role
      const roleData = {};
      const roleStats = {};

      for (const role of rolesToFetch) {
        try {
          const response = await userAPI.getUsers({
            filterRole: role,
            search: "",
            page: 1,
            pageSize: 1000,
          });

          const users = Array.isArray(response.users)
            ? response.users
            : Array.isArray(response)
            ? response
            : [];

          const filteredUsers = users.filter((u) => {
            const userRole = u.role?.toLowerCase();
            const requestedRole = role.toLowerCase();
            if (userRole !== requestedRole) return false;
            if (user.role === "manager" && userRole !== "recruiter")
              return false;
            return true;
          });

          roleData[role] = filteredUsers;
          roleStats[role] = {
            total: response.totalCount || filteredUsers.length || 0,
            active:
              filteredUsers.filter((u) => u.is_active !== false).length || 0,
            jobsPosted: 0,
          };
        } catch (roleError) {
          console.error(`Error fetching ${role} users:`, roleError);
          roleData[role] = [];
          roleStats[role] = { total: 0, active: 0, jobsPosted: 0 };
        }
      }

      // Fetch job postings to calculate detailed stats
      try {
        const jobsResponse = await jobPostingAPI.getAllJobPostings();
        let allJobs = [];
        if (Array.isArray(jobsResponse)) {
          allJobs = jobsResponse;
        } else if (jobsResponse.allJobPostings) {
          allJobs = jobsResponse.allJobPostings;
        } else if (jobsResponse.jobPostings) {
          allJobs = jobsResponse.jobPostings;
        }

        // Calculate detailed stats per user
        for (const role of rolesToFetch) {
          const users = roleData[role];
          for (const u of users) {
            const userId = u._id?.toString() || u.id?.toString();
            const userJobs = allJobs.filter((job) => {
              const recruiterId =
                job.primary_recruiter_id?._id?.toString() ||
                job.primary_recruiter_id?.toString() ||
                job.primary_recruiter_id;
              return recruiterId === userId;
            });

            u.jobsPosted = userJobs.length;
            
            // Set defaults - detailed analytics will be shown on the analytics page
            u.totalApplications = 0;
            u.totalCandidates = 0;
            u.totalInterviews = 0;
            u.matchRate = 0;
          }

          roleStats[role].jobsPosted = users.reduce(
            (sum, u) => sum + (u.jobsPosted || 0),
            0
          );
        }
      } catch (jobsError) {
        console.error("Error fetching job postings:", jobsError);
      }

      setReports(roleData);
      setStats(roleStats);

      if (rolesToFetch.length > 0) {
        const defaultRole =
          user.role === "admin" && rolesToFetch.includes("manager")
            ? "manager"
            : rolesToFetch[0];
        setSelectedRole(defaultRole);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(err.message || "Failed to load reports");
      setReports({});
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (userItem) => {
    const userId = userItem._id || userItem.id;
    const basePath =
      user.role === "admin"
        ? "/dashboard/admin/reports/analytics"
        : "/dashboard/manager/reports/analytics";
    router.push(`${basePath}/${userId}`);
  };

  const getAvailableRoles = () => {
    if (user?.role === "admin") {
      return [
        { value: "manager", label: "Managers", icon: Users },
        { value: "recruiter", label: "Recruiters", icon: Briefcase },
      ];
    } else if (user?.role === "manager") {
      return [{ value: "recruiter", label: "Recruiters", icon: Briefcase }];
    }
    return [];
  };

  const getRoleStats = (role) => {
    return stats[role] || { total: 0, active: 0, jobsPosted: 0 };
  };

  const getRoleUsers = (role) => {
    return reports[role] || [];
  };

  const handleExportReport = (role) => {
    const users = getRoleUsers(role);
    const roleStats = getRoleStats(role);

    const headers = [
      "Name",
      "Email",
      "Role",
      "Status",
      "Jobs Posted",
      "Total Applications",
      "Total Candidates",
      "Total Interviews",
      "Match Rate (%)",
    ];
    const rows = users.map((u) => [
      u.name || "N/A",
      u.email || "N/A",
      u.role || "N/A",
      u.is_active !== false ? "Active" : "Inactive",
      u.jobsPosted || 0,
      u.totalApplications || 0,
      u.totalCandidates || 0,
      u.totalInterviews || 0,
      u.matchRate || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      "",
      `Total Users,${roleStats.total}`,
      `Active Users,${roleStats.active}`,
      `Total Jobs Posted,${roleStats.jobsPosted}`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${role}_report_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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

  const availableRoles = getAvailableRoles();
  const currentUsers = selectedRole ? getRoleUsers(selectedRole) : [];
  const currentStats = selectedRole
    ? getRoleStats(selectedRole)
    : { total: 0, active: 0, jobsPosted: 0 };

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
          title="Reports"
          subtitle="Performance metrics and analytics"
          showLogout={true}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {error && (
              <div className="mb-6 border-2 border-red-300 bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 font-medium">
                  {error}
                </p>
              </div>
            )}

            {/* Role Selection Tabs */}
            <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-800">
              {availableRoles.map((roleOption) => {
                const Icon = roleOption.icon;
                const isSelected = selectedRole === roleOption.value;
                return (
                  <button
                    key={roleOption.value}
                    onClick={() => setSelectedRole(roleOption.value)}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                      isSelected
                        ? "border-cyan-600 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400 font-semibold"
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {roleOption.label}
                  </button>
                );
              })}
            </div>

          {selectedRole && (
            <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Total Users
                      </p>
                      <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                        <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                      {currentStats.total}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Active Users
                      </p>
                      <div className="p-2 rounded-lg bg-gradient-to-br from-green-400/20 to-emerald-500/20">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                      {currentStats.active}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Total Jobs Posted
                      </p>
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-400/20 to-indigo-500/20">
                        <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      {currentStats.jobsPosted}
                    </div>
                  </div>
                </div>

                {/* Export Button */}
                <div className="mb-6 flex justify-end">
                  <Button
                    onClick={() => handleExportReport(selectedRole)}
                    variant="outline"
                    className="gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4" />
                    Export Report
                  </Button>
                </div>

                {/* Users Table */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-lg overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100/50 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Jobs Posted
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Applications
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Candidates
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Interviews
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Match Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Created At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {currentUsers.length === 0 ? (
                          <tr>
                            <td
                              colSpan="9"
                              className="px-6 py-12 text-center text-slate-600 dark:text-slate-400"
                            >
                              <Users className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                              <p>No {selectedRole}s found</p>
                            </td>
                          </tr>
                        ) : (
                          currentUsers.map((userItem) => (
                            <tr
                              key={userItem._id || userItem.id}
                              onClick={() => handleRowClick(userItem)}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {userItem.name || "N/A"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  {userItem.email || "N/A"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    userItem.is_active !== false
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  }`}
                                >
                                  {userItem.is_active !== false
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {userItem.jobsPosted || 0}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {userItem.totalApplications || 0}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {userItem.totalCandidates || 0}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {userItem.totalInterviews || 0}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {userItem.matchRate || 0}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  {userItem.createdAt
                                    ? new Date(
                                        userItem.createdAt
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

