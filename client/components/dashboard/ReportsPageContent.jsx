"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { jobPostingAPI, userAPI } from "@/lib/api";
import { Briefcase, Download, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ReportsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      // Admin can see managers and recruiters
      // Manager can only see recruiters
      const rolesToFetch =
        user.role === "admin" ? ["manager", "recruiter"] : ["recruiter"];

      // Fetch users for each role
      const roleData = {};
      const roleStats = {};

      // Fetch users for each role separately
      for (const role of rolesToFetch) {
        try {
          // Fetch all users of this role (no pagination for reports)
          const response = await userAPI.getUsers({
            filterRole: role,
            search: "",
            page: 1,
            pageSize: 1000, // Get all users for reports
          });

          // Validate response structure
          if (!response || typeof response !== "object") {
            console.warn(`Invalid response for ${role} role`);
            roleData[role] = [];
            roleStats[role] = {
              total: 0,
              active: 0,
              jobsPosted: 0,
            };
            continue;
          }

          // Extract users array from response
          const users = Array.isArray(response.users)
            ? response.users
            : Array.isArray(response)
            ? response
            : [];

          // Filter users to ensure they match the requested role
          // Also enforce role-based access: managers can only see recruiters
          const filteredUsers = users.filter((u) => {
            const userRole = u.role?.toLowerCase();
            const requestedRole = role.toLowerCase();

            // Strict role matching
            if (userRole !== requestedRole) {
              return false;
            }

            // Additional security: if current user is manager, only allow recruiters
            if (user.role === "manager" && userRole !== "recruiter") {
              return false;
            }

            return true;
          });

          roleData[role] = filteredUsers;
          roleStats[role] = {
            total: response.totalCount || filteredUsers.length || 0,
            active:
              filteredUsers.filter((u) => u.is_active !== false).length || 0,
            jobsPosted: 0, // Will be calculated separately
          };
        } catch (roleError) {
          console.error(`Error fetching ${role} users:`, roleError);
          // Set empty data for this role if fetch fails
          roleData[role] = [];
          roleStats[role] = {
            total: 0,
            active: 0,
            jobsPosted: 0,
          };
        }
      }

      // Fetch job postings to calculate jobs posted per user
      try {
        const jobsResponse = await jobPostingAPI.getAllJobPostings();

        // Handle different response structures
        let allJobs = [];
        if (Array.isArray(jobsResponse)) {
          allJobs = jobsResponse;
        } else if (jobsResponse.allJobPostings) {
          allJobs = jobsResponse.allJobPostings;
        } else if (jobsResponse.jobPostings) {
          allJobs = jobsResponse.jobPostings;
        } else if (jobsResponse.myJobPostings) {
          allJobs = jobsResponse.myJobPostings;
        } else if (jobsResponse.secondaryJobPostings) {
          allJobs = jobsResponse.secondaryJobPostings;
        } else if (jobsResponse.remainingJobPostings) {
          allJobs = jobsResponse.remainingJobPostings;
        }

        // Calculate jobs posted per user
        for (const role of rolesToFetch) {
          const users = roleData[role];
          users.forEach((u) => {
            const userId = u._id?.toString() || u.id?.toString();
            const userJobs = allJobs.filter((job) => {
              const recruiterId =
                job.primary_recruiter_id?._id?.toString() ||
                job.primary_recruiter_id?.toString() ||
                job.primary_recruiter_id;
              return recruiterId === userId;
            });
            u.jobsPosted = userJobs.length;
            u.totalApplications = userJobs.reduce(
              (sum, job) => sum + (job.applications?.length || 0),
              0
            );
          });

          // Update stats
          roleStats[role].jobsPosted = users.reduce(
            (sum, u) => sum + (u.jobsPosted || 0),
            0
          );
        }
      } catch (jobsError) {
        console.error("Error fetching job postings:", jobsError);
        // Continue without job data - set defaults
        for (const role of rolesToFetch) {
          const users = roleData[role];
          users.forEach((u) => {
            u.jobsPosted = 0;
            u.totalApplications = 0;
          });
        }
      }

      // Validate that we have data for at least one role
      const hasData = Object.keys(roleData).some(
        (role) => roleData[role].length > 0
      );

      if (!hasData && Object.keys(roleData).length > 0) {
        setError("No users found for the selected roles");
      }

      setReports(roleData);
      setStats(roleStats);

      // Set default selected role (prefer manager for admin, recruiter for manager)
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
      // Set empty data on error
      setReports({});
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const getAvailableRoles = () => {
    if (user?.role === "admin") {
      // Admin can see both managers and recruiters
      return [
        { value: "manager", label: "Managers", icon: Users },
        { value: "recruiter", label: "Recruiters", icon: Briefcase },
      ];
    } else if (user?.role === "manager") {
      // Manager can only see recruiters
      return [{ value: "recruiter", label: "Recruiters", icon: Briefcase }];
    }
    // Recruiters don't have access to reports
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

    // Create CSV content
    const headers = [
      "Name",
      "Email",
      "Role",
      "Status",
      "Jobs Posted",
      "Total Applications",
    ];
    const rows = users.map((u) => [
      u.name || "N/A",
      u.email || "N/A",
      u.role || "N/A",
      u.is_active !== false ? "Active" : "Inactive",
      u.jobsPosted || 0,
      u.totalApplications || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      "",
      `Total Users,${roleStats.total}`,
      `Active Users,${roleStats.active}`,
      `Total Jobs Posted,${roleStats.jobsPosted}`,
    ].join("\n");

    // Download CSV
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
      <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
        <aside className="hidden lg:block">
          <Sidebar />
        </aside>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-52 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loading />
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
    <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-52 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          title="Reports"
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {error && (
            <div className="mb-6 border-2 border-red-300 bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Role Selection Tabs */}
          <div className="mb-6 flex gap-2 border-b">
            {availableRoles.map((roleOption) => {
              const Icon = roleOption.icon;
              const isSelected = selectedRole === roleOption.value;
              return (
                <button
                  key={roleOption.value}
                  onClick={() => setSelectedRole(roleOption.value)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    isSelected
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-3xl font-bold">{currentStats.total}</div>
                </div>
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">
                      Active Users
                    </p>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {currentStats.active}
                  </div>
                </div>
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">
                      Total Jobs Posted
                    </p>
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {currentStats.jobsPosted}
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="mb-6 flex justify-end">
                <Button
                  onClick={() => handleExportReport(selectedRole)}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              </div>

              {/* Users Table */}
              <div className="bg-card border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Jobs Posted
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Total Applications
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Created At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {currentUsers.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-6 py-12 text-center text-muted-foreground"
                          >
                            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p>No {selectedRole}s found</p>
                          </td>
                        </tr>
                      ) : (
                        currentUsers.map((userItem) => (
                          <tr
                            key={userItem._id || userItem.id}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium">
                                {userItem.name || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-muted-foreground">
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
                              <div className="text-sm font-medium">
                                {userItem.jobsPosted || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium">
                                {userItem.totalApplications || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-muted-foreground">
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
        </main>
      </div>
    </div>
  );
}
