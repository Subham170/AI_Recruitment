"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { jobPostingAPI, userAPI, matchingAPI, recruiterTasksAPI } from "@/lib/api";
import { Briefcase, Download, TrendingUp, Users } from "lucide-react";
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
      // Fetch recruiters first so we can aggregate their stats for managers
      const rolesToFetch =
        user.role === "admin" ? ["recruiter", "manager"] : ["recruiter"];

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

        // Fetch job matches for all jobs to calculate applications and candidates
        // Only fetch for jobs that belong to recruiters we're tracking
        const allJobMatches = {};
        
        // Get all recruiter IDs we need to track
        const recruiterIds = new Set();
        if (roleData["recruiter"]) {
          roleData["recruiter"].forEach((recruiter) => {
            const recruiterId = recruiter._id?.toString() || recruiter.id?.toString();
            if (recruiterId) recruiterIds.add(recruiterId);
          });
        }
        
        // Get job IDs for jobs belonging to these recruiters
        const relevantJobIds = allJobs
          .filter((job) => {
            const jobRecruiterId =
              job.primary_recruiter_id?._id?.toString() ||
              job.primary_recruiter_id?.toString() ||
              job.primary_recruiter_id;
            return recruiterIds.has(jobRecruiterId);
          })
          .map((job) => job._id?.toString() || job.id?.toString())
          .filter(Boolean);

        // Fetch matches for relevant jobs in parallel (batch processing)
        const batchSize = 10;
        for (let i = 0; i < relevantJobIds.length; i += batchSize) {
          const batch = relevantJobIds.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (jobId) => {
              try {
                // Fetch job matches
                const matchesResponse = await matchingAPI.getJobMatches(jobId);
                allJobMatches[jobId] = matchesResponse.matches || [];
              } catch (err) {
                console.error(`Error fetching matches for job ${jobId}:`, err);
                allJobMatches[jobId] = [];
              }
            })
          );
        }

        // Fetch interview counts from RecruiterTask collection
        let interviewCountsByJob = {};
        try {
          if (relevantJobIds.length > 0) {
            const interviewResponse = await recruiterTasksAPI.getInterviewCountsByJobs(relevantJobIds);
            interviewCountsByJob = interviewResponse.interviewCounts || {};
          }
        } catch (interviewErr) {
          console.error("Error fetching interview counts:", interviewErr);
          interviewCountsByJob = {};
        }

        // Calculate detailed stats per user
        for (const role of rolesToFetch) {
          const users = roleData[role];
          for (const u of users) {
            const userId = u._id?.toString() || u.id?.toString();
            
            if (role === "manager") {
              // For managers, aggregate stats from all assigned recruiters
              // First, get all recruiters assigned to this manager
              const assignedRecruiters = roleData["recruiter"]?.filter(
                (recruiter) => {
                  const recruiterManagerId =
                    recruiter.assignedManager?._id?.toString() ||
                    recruiter.assignedManager?.toString() ||
                    recruiter.assignedManager;
                  return recruiterManagerId === userId;
                }
              ) || [];

              u.totalRecruiters = assignedRecruiters.length;

              // Aggregate jobs from all assigned recruiters
              let totalJobs = 0;
              let totalApplications = 0;
              let totalCandidates = new Set();
              let totalInterviews = 0;

              assignedRecruiters.forEach((recruiter) => {
                const recruiterId =
                  recruiter._id?.toString() || recruiter.id?.toString();
                const recruiterJobs = allJobs.filter((job) => {
                  const jobRecruiterId =
                    job.primary_recruiter_id?._id?.toString() ||
                    job.primary_recruiter_id?.toString() ||
                    job.primary_recruiter_id;
                  return jobRecruiterId === recruiterId;
                });

                totalJobs += recruiterJobs.length;

                // Aggregate applications, candidates, and interviews from recruiter's jobs
                recruiterJobs.forEach((job) => {
                  const jobId = job._id?.toString() || job.id?.toString();
                  const matches = allJobMatches[jobId] || [];
                  
                  // Count applications (all matches)
                  totalApplications += matches.length;
                  
                  // Count unique candidates
                  matches.forEach((match) => {
                    const candidateId = 
                      match.candidateId?._id?.toString() || 
                      match.candidateId?.toString() || 
                      match.candidateId;
                    if (candidateId) {
                      totalCandidates.add(candidateId);
                    }
                  });
                  
                  // Count interviews from RecruiterTask collection
                  const interviewCount = interviewCountsByJob[jobId] || 0;
                  totalInterviews += interviewCount;
                });
              });

              u.jobsPosted = totalJobs;
              u.totalApplications = totalApplications;
              u.totalCandidates = totalCandidates.size;
              u.totalInterviews = totalInterviews;
              
              // Calculate average match rate from all recruiter matches
              let totalMatchScore = 0;
              let matchCount = 0;
              assignedRecruiters.forEach((recruiter) => {
                const recruiterId =
                  recruiter._id?.toString() || recruiter.id?.toString();
                const recruiterJobs = allJobs.filter((job) => {
                  const jobRecruiterId =
                    job.primary_recruiter_id?._id?.toString() ||
                    job.primary_recruiter_id?.toString() ||
                    job.primary_recruiter_id;
                  return jobRecruiterId === recruiterId;
                });
                
                recruiterJobs.forEach((job) => {
                  const jobId = job._id?.toString() || job.id?.toString();
                  const matches = allJobMatches[jobId] || [];
                  matches.forEach((match) => {
                    if (match.matchScore) {
                      totalMatchScore += match.matchScore;
                      matchCount++;
                    }
                  });
                });
              });
              
              u.matchRate = matchCount > 0 
                ? Math.round((totalMatchScore / matchCount) * 100) 
                : 0;
            } else {
              // For recruiters, calculate their own stats
              const userJobs = allJobs.filter((job) => {
                const recruiterId =
                  job.primary_recruiter_id?._id?.toString() ||
                  job.primary_recruiter_id?.toString() ||
                  job.primary_recruiter_id;
                return recruiterId === userId;
              });

              u.jobsPosted = userJobs.length;

              // Calculate applications, candidates, and interviews from recruiter's jobs
              let recruiterApplications = 0;
              let recruiterCandidates = new Set();
              let recruiterInterviews = 0;
              let totalMatchScore = 0;
              let matchCount = 0;

              userJobs.forEach((job) => {
                const jobId = job._id?.toString() || job.id?.toString();
                const matches = allJobMatches[jobId] || [];
                
                // Count applications
                recruiterApplications += matches.length;
                
                // Count unique candidates and calculate match scores
                matches.forEach((match) => {
                  const candidateId = 
                    match.candidateId?._id?.toString() || 
                    match.candidateId?.toString() || 
                    match.candidateId;
                  if (candidateId) {
                    recruiterCandidates.add(candidateId);
                  }
                  if (match.matchScore) {
                    totalMatchScore += match.matchScore;
                    matchCount++;
                  }
                });
                
                // Count interviews from RecruiterTask collection
                const interviewCount = interviewCountsByJob[jobId] || 0;
                recruiterInterviews += interviewCount;
              });

              u.totalApplications = recruiterApplications;
              u.totalCandidates = recruiterCandidates.size;
              u.totalInterviews = recruiterInterviews;
              u.matchRate = matchCount > 0 
                ? Math.round((totalMatchScore / matchCount) * 100) 
                : 0;
            }
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

  const availableRoles = getAvailableRoles();
  const currentUsers = selectedRole ? getRoleUsers(selectedRole) : [];
  const currentStats = selectedRole
    ? getRoleStats(selectedRole)
    : { total: 0, active: 0, jobsPosted: 0 };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
      <GlassBackground />
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Navbar
          title="Reports"
          subtitle="Performance metrics and analytics"
          showLogout={true}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {error && (
              <div className="mb-6 border-2 border-red-300 bg-red-50 rounded-lg p-4">
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            {/* Role Selection Tabs */}
            <div className="mb-6 flex gap-2 border-b border-white/60">
              {availableRoles.map((roleOption) => {
                const Icon = roleOption.icon;
                const isSelected = selectedRole === roleOption.value;
                return (
                  <button
                    key={roleOption.value}
                    onClick={() => setSelectedRole(roleOption.value)}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                      isSelected
                        ? "border-cyan-600 text-cyan-600 font-semibold"
                        : "border-transparent text-slate-600 hover:text-slate-900"
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
                  <div className="bg-white/85 border border-white/70 rounded-2xl p-6 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl hover:shadow-[0_22px_70px_rgba(15,23,42,0.22)] transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-600">Total Users</p>
                      <div className="p-2 rounded-lg bg-slate-100">
                        <Users className="h-5 w-5 text-cyan-600" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-cyan-600">
                      {currentStats.total}
                    </div>
                  </div>
                  <div className="bg-white/85 border border-white/70 rounded-2xl p-6 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl hover:shadow-[0_22px_70px_rgba(15,23,42,0.22)] transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-600">Active Users</p>
                      <div className="p-2 rounded-lg bg-green-50">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {currentStats.active}
                    </div>
                  </div>
                  <div className="bg-white/85 border border-white/70 rounded-2xl p-6 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl hover:shadow-[0_22px_70px_rgba(15,23,42,0.22)] transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-600">
                        Total Jobs Posted
                      </p>
                      <div className="p-2 rounded-lg bg-blue-50">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
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
                    className="gap-2 border-slate-200 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Export Report
                  </Button>
                </div>

                {/* Users Table */}
                <div className="bg-white/90 border border-white/70 rounded-2xl overflow-hidden shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b-2 border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Status
                          </th>
                          {selectedRole === "manager" && (
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                              Recruiters
                            </th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Jobs Posted
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Applications
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Candidates
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Interviews
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Match Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Created At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {currentUsers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={selectedRole === "manager" ? "10" : "9"}
                              className="px-6 py-12 text-center text-slate-600"
                            >
                              <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                              <p>No {selectedRole}s found</p>
                            </td>
                          </tr>
                        ) : (
                          currentUsers.map((userItem) => {
                            // Both managers and recruiters should be clickable
                            const isClickable = selectedRole === "recruiter" || selectedRole === "manager";
                            return (
                              <tr
                                key={userItem._id || userItem.id}
                                onClick={
                                  isClickable
                                    ? () => handleRowClick(userItem)
                                    : undefined
                                }
                                className={`transition-colors bg-white ${
                                  isClickable
                                    ? "hover:bg-slate-50/80 cursor-pointer"
                                    : ""
                                }`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">
                                    {userItem.name || "N/A"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-slate-600">
                                    {userItem.email || "N/A"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      userItem.is_active !== false
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {userItem.is_active !== false
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </td>
                                {selectedRole === "manager" && (
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900">
                                      {userItem.totalRecruiters || 0}
                                    </div>
                                  </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">
                                    {userItem.jobsPosted || 0}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">
                                    {userItem.totalApplications || 0}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">
                                    {userItem.totalCandidates || 0}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">
                                    {userItem.totalInterviews || 0}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">
                                    {userItem.matchRate || 0}%
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-slate-600">
                                    {userItem.createdAt
                                      ? new Date(
                                          userItem.createdAt
                                        ).toLocaleDateString()
                                      : "N/A"}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
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
