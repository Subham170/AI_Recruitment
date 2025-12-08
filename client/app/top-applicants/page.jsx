"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { bolnaAPI, jobPostingAPI, matchingAPI } from "@/lib/api";
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function TopApplicantsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [schedulingCalls, setSchedulingCalls] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchJobs();
    }
  }, [user, loading, router]);

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      setError(null);
      const response = await jobPostingAPI.getAllJobPostings();

      if (user.role === "recruiter") {
        // Combine my jobs and secondary jobs
        const myJobs = response.myJobPostings || [];
        const secondaryJobs = response.secondaryJobPostings || [];
        setJobs([...myJobs, ...secondaryJobs]);
      } else {
        // For admin/manager, show all jobs
        setJobs(response.jobPostings || []);
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError(err.message || "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleJobClick = async (job) => {
    setSelectedJob(job);
    setCandidates([]);
    setError(null);

    try {
      setRefreshing(true);
      setLoadingCandidates(true);

      // First refresh the matches
      await matchingAPI.refreshJobMatches(job._id);

      // Then get the top 10 candidates
      const response = await matchingAPI.getJobMatches(job._id);

      // Sort by match score (descending) and take top 10
      const sortedMatches = (response.matches || [])
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 10);

      setCandidates(sortedMatches);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      setError(err.message || "Failed to load candidates");
    } finally {
      setLoadingCandidates(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedJob) return;

    try {
      setRefreshing(true);
      setError(null);

      // Refresh the matches
      await matchingAPI.refreshJobMatches(selectedJob._id);

      // Get updated candidates
      const response = await matchingAPI.getJobMatches(selectedJob._id);

      // Sort by match score (descending) and take top 10
      const sortedMatches = (response.matches || [])
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 10);

      setCandidates(sortedMatches);
    } catch (err) {
      console.error("Error refreshing candidates:", err);
      setError(err.message || "Failed to refresh candidates");
    } finally {
      setRefreshing(false);
    }
  };

  const handleScheduleAllCalls = async () => {
    if (!selectedJob || candidates.length === 0) return;

    try {
      setSchedulingCalls(true);
      setError(null);

      // Start scheduling from 5 minutes from now
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() + 5);

      const results = [];

      // Schedule calls for all candidates with 5-minute gaps
      for (let i = 0; i < candidates.length; i++) {
        const match = candidates[i];
        const candidate = match.candidateId;

        if (!candidate || !candidate.phone_no) {
          console.warn(`Skipping candidate ${i + 1}: missing phone number`);
          continue;
        }

        // Calculate scheduled time (5 minutes gap between each call)
        const scheduledTime = new Date(startTime);
        scheduledTime.setMinutes(scheduledTime.getMinutes() + i * 5);

        try {
          const payload = {
            candidateId: candidate._id,
            jobId: selectedJob._id,
            recipient_phone_number: candidate.phone_no,
            scheduled_at: scheduledTime.toISOString(),
            user_data: {
              bio: candidate.bio || "",
              role:
                candidate.role && candidate.role.length > 0
                  ? candidate.role.join(", ")
                  : "",
              experience:
                candidate.experience !== undefined
                  ? `${candidate.experience} years`
                  : "",
              name: candidate.name || "",
            },
          };

          const result = await bolnaAPI.scheduleCall(payload);
          results.push({
            candidate: candidate.name || "Unknown",
            success: true,
            scheduledAt: scheduledTime.toISOString(),
            result,
          });

          // Wait 1 second between API calls to avoid rate limiting
          if (i < candidates.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (err) {
          console.error(`Error scheduling call for candidate ${i + 1}:`, err);
          results.push({
            candidate: candidate.name || "Unknown",
            success: false,
            error: err.message || "Failed to schedule call",
          });
        }
      }

      // Show success message
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        setError(null);
        toast.success(
          `Successfully scheduled ${successCount} call${
            successCount !== 1 ? "s" : ""
          }!`
        );
      } else {
        setError(
          `Scheduled ${successCount} calls successfully. ${failCount} failed. Check console for details.`
        );
        toast.warning(
          `Scheduled ${successCount} call${
            successCount !== 1 ? "s" : ""
          } successfully. ${failCount} failed.`
        );
      }
    } catch (err) {
      console.error("Error scheduling calls:", err);
      setError(err.message || "Failed to schedule calls");
    } finally {
      setSchedulingCalls(false);
    }
  };

  if (!user) {
    return null;
  }

  const filteredJobs = jobs.filter(
    (job) =>
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreColor = (score) => {
    const percentage = Math.round(score * 100);
    if (percentage >= 90) return "text-green-700 bg-green-50";
    if (percentage >= 80) return "text-blue-700 bg-blue-50";
    return "text-yellow-700 bg-yellow-50";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-52 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <Navbar
          title="Top Applicants"
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 bg-white">
          {loading || loadingJobs ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loading />
            </div>
          ) : (
            <>
              {error && (
                <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-6 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {!selectedJob ? (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold text-slate-900 mb-1">
                        {jobs.length}
                      </div>
                      <p className="text-sm text-slate-600">Total Jobs</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {jobs.filter((j) => j.primary_recruiter_id).length}
                      </div>
                      <p className="text-sm text-slate-600">Your Jobs</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {jobs.length -
                          jobs.filter((j) => j.primary_recruiter_id).length}
                      </div>
                      <p className="text-sm text-slate-600">Secondary Jobs</p>
                    </div>
                  </div>

                  {/* Jobs List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredJobs.map((job) => (
                      <div
                        key={job._id}
                        className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg hover:border-cyan-500/50 transition-all cursor-pointer group"
                        onClick={() => handleJobClick(job)}
                      >
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-cyan-600 transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-sm font-medium text-slate-600">
                            {job.company}
                          </p>
                        </div>
                        <div className="space-y-3 mb-4">
                          {job.role && job.role.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {job.role.map((r, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 text-xs rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            {job.ctc && (
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>{job.ctc}</span>
                              </div>
                            )}
                            {job.exp_req !== undefined && job.exp_req > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{job.exp_req} years</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                          {job.description}
                        </p>
                        <Button
                          className="w-full border-slate-200 hover:bg-slate-50"
                          variant="outline"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Top Candidates
                        </Button>
                      </div>
                    ))}
                  </div>

                  {filteredJobs.length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                      <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                      <p className="text-slate-600">
                        {jobs.length === 0
                          ? "No job postings available. Create a job posting to see top applicants."
                          : "No jobs found matching your search criteria."}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Selected Job Header */}
                  <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                          {selectedJob.title}
                        </h2>
                        <p className="text-lg text-slate-600">
                          {selectedJob.company}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {candidates.length > 0 && (
                          <Button
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg"
                            onClick={handleScheduleAllCalls}
                            disabled={schedulingCalls}
                          >
                            <Phone
                              className={`mr-2 h-4 w-4 ${
                                schedulingCalls ? "animate-pulse" : ""
                              }`}
                            />
                            {schedulingCalls
                              ? "Scheduling..."
                              : `Schedule All Calls (${candidates.length} remaining)`}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedJob(null);
                            setCandidates([]);
                          }}
                          className="border-slate-200 hover:bg-slate-50"
                        >
                          Back to Jobs
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleRefresh}
                          disabled={refreshing}
                          className="border-slate-200 hover:bg-slate-50"
                        >
                          <RefreshCw
                            className={`mr-2 h-4 w-4 ${
                              refreshing ? "animate-spin" : ""
                            }`}
                          />
                          Refresh
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="lg:hidden mb-4 space-y-2">
                    {candidates.length > 0 && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        variant="default"
                        onClick={handleScheduleAllCalls}
                        disabled={schedulingCalls}
                      >
                        <Phone
                          className={`mr-2 h-4 w-4 ${
                            schedulingCalls ? "animate-pulse" : ""
                          }`}
                        />
                        {schedulingCalls
                          ? "Scheduling..."
                          : "Schedule All Calls"}
                      </Button>
                    )}
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={refreshing}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                          refreshing ? "animate-spin" : ""
                        }`}
                      />
                      Refresh Matches
                    </Button>
                  </div>

                  {/* Candidates List */}
                  {loadingCandidates ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                      <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-slate-400" />
                      <p className="text-slate-600">
                        Loading top candidates...
                      </p>
                    </div>
                  ) : candidates.length > 0 ? (
                    <>
                      <div className="mb-6">
                        <p className="text-sm text-slate-600">
                          Showing top {candidates.length} candidates sorted by
                          match score
                        </p>
                      </div>
                      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 border-b-2 border-slate-300 hover:bg-slate-100">
                              <TableHead className="text-slate-800 font-semibold">
                                Candidate
                              </TableHead>
                              <TableHead className="text-slate-800 font-semibold">
                                Role
                              </TableHead>
                              <TableHead className="text-slate-800 font-semibold">
                                Match Score
                              </TableHead>
                              <TableHead className="text-slate-800 font-semibold">
                                Email
                              </TableHead>
                              <TableHead className="text-slate-800 font-semibold">
                                Phone
                              </TableHead>
                              <TableHead className="text-slate-800 font-semibold">
                                Experience
                              </TableHead>
                              <TableHead className="text-right text-slate-800 font-semibold">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {candidates.map((match, index) => {
                              const candidate = match.candidateId;
                              if (!candidate) return null;

                              const matchScore = Math.round(
                                (match.matchScore || 0) * 100
                              );

                              return (
                                <TableRow
                                  key={candidate._id || index}
                                  className="border-b border-slate-200 bg-white hover:bg-slate-50/80 transition-colors"
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 border border-cyan-200">
                                        <span className="text-sm font-semibold text-cyan-700">
                                          {candidate.name
                                            ?.split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase() || "N/A"}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-slate-900">
                                          {candidate.name || "Unknown"}
                                        </div>
                                        {candidate.bio && (
                                          <div className="text-xs text-slate-600 line-clamp-1 max-w-[200px]">
                                            {candidate.bio}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-900">
                                    {candidate.role && candidate.role.length > 0
                                      ? candidate.role.join(", ")
                                      : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    <div
                                      className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                                        match.matchScore || 0
                                      )}`}
                                    >
                                      {matchScore}%
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {candidate.email ? (
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-slate-500" />
                                        <span className="text-sm text-slate-900">
                                          {candidate.email}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-slate-500">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {candidate.phone_no ? (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-slate-500" />
                                        <span className="text-sm text-slate-900">
                                          {candidate.phone_no}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-slate-500">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {candidate.experience !== undefined ? (
                                      <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-slate-500" />
                                        <span className="text-sm text-slate-900">
                                          {candidate.experience} years
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-slate-500">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          // View profile functionality
                                        }}
                                        className="border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        className="bg-cyan-600 hover:bg-cyan-700 text-white"
                                        size="sm"
                                      >
                                        <Calendar className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                      <User className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                      <p className="text-slate-600 mb-4">
                        No candidates found for this job posting.
                      </p>
                      <Button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="border-slate-200 hover:bg-slate-50"
                        variant="outline"
                      >
                        <RefreshCw
                          className={`mr-2 h-4 w-4 ${
                            refreshing ? "animate-spin" : ""
                          }`}
                        />
                        Refresh Matches
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
