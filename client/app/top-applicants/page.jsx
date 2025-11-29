"use client";

import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { bolnaAPI, jobPostingAPI, matchingAPI } from "@/lib/api";
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Mail,
  Menu,
  Phone,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
        alert(`Successfully scheduled ${successCount} calls!`);
      } else {
        setError(
          `Scheduled ${successCount} calls successfully. ${failCount} failed. Check console for details.`
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
    if (percentage >= 90)
      return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (percentage >= 80)
      return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
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
        <header className="lg:hidden bg-card border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <h1 className="text-xl font-bold">AI Recruitment</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-card border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Top Applicants</h1>
            <div className="flex items-center gap-4">
              {selectedJob && candidates.length > 0 && (
                <Button
                  variant="default"
                  onClick={handleScheduleAllCalls}
                  disabled={schedulingCalls}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Phone
                    className={`mr-2 h-4 w-4 ${
                      schedulingCalls ? "animate-pulse" : ""
                    }`}
                  />
                  {schedulingCalls ? "Scheduling..." : "Schedule All Calls"}
                </Button>
              )}
              {selectedJob && (
                <Button
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
              )}
              <div className="text-right">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
          {loading || loadingJobs ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-xl">Loading...</div>
            </div>
          ) : (
            <>
              {error && (
                <div className="border-2 border-red-300 bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-200 font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              {!selectedJob ? (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold mb-1">
                        {jobs.length}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Jobs
                      </p>
                    </div>
                    <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {jobs.filter((j) => j.primary_recruiter_id).length}
                      </div>
                      <p className="text-sm text-muted-foreground">Your Jobs</p>
                    </div>
                    <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {jobs.length -
                          jobs.filter((j) => j.primary_recruiter_id).length}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Secondary Jobs
                      </p>
                    </div>
                  </div>

                  {/* Jobs List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredJobs.map((job) => (
                      <div
                        key={job._id}
                        className="bg-card border rounded-lg p-6 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                        onClick={() => handleJobClick(job)}
                      >
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-sm font-medium text-muted-foreground">
                            {job.company}
                          </p>
                        </div>
                        <div className="space-y-3 mb-4">
                          {job.role && job.role.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {job.role.map((r, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {job.description}
                        </p>
                        <Button className="w-full" variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View Top Candidates
                        </Button>
                      </div>
                    ))}
                  </div>

                  {filteredJobs.length === 0 && (
                    <div className="bg-card border rounded-lg p-12 text-center">
                      <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
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
                  <div className="bg-card border rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">
                          {selectedJob.title}
                        </h2>
                        <p className="text-lg text-muted-foreground">
                          {selectedJob.company}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedJob(null);
                            setCandidates([]);
                          }}
                        >
                          Back to Jobs
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleRefresh}
                          disabled={refreshing}
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
                    <div className="bg-card border rounded-lg p-12 text-center">
                      <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Loading top candidates...
                      </p>
                    </div>
                  ) : candidates.length > 0 ? (
                    <>
                      <div className="mb-6">
                        <p className="text-sm text-muted-foreground">
                          Showing top {candidates.length} candidates sorted by
                          match score
                        </p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {candidates.map((match, index) => {
                          const candidate = match.candidateId;
                          if (!candidate) return null;

                          const matchScore = Math.round(
                            (match.matchScore || 0) * 100
                          );

                          return (
                            <div
                              key={candidate._id || index}
                              className="bg-card border rounded-lg p-6 hover:shadow-lg transition-all"
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                    <span className="text-lg font-semibold text-primary">
                                      {candidate.name
                                        ?.split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase() || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold mb-1">
                                      {candidate.name || "Unknown"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      {candidate.role &&
                                      candidate.role.length > 0
                                        ? candidate.role.join(", ")
                                        : "Candidate"}
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                                    match.matchScore || 0
                                  )}`}
                                >
                                  {matchScore}%
                                </div>
                              </div>
                              <div className="space-y-4">
                                {/* Contact Info */}
                                <div className="space-y-2 text-sm">
                                  {candidate.email && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Mail className="h-4 w-4" />
                                      <span>{candidate.email}</span>
                                    </div>
                                  )}
                                  {candidate.phone_no && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="h-4 w-4" />
                                      <span>{candidate.phone_no}</span>
                                    </div>
                                  )}
                                  {candidate.experience !== undefined && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Briefcase className="h-4 w-4" />
                                      <span>
                                        {candidate.experience} years experience
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Bio */}
                                {candidate.bio && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Bio
                                    </p>
                                    <p className="text-sm line-clamp-2">
                                      {candidate.bio}
                                    </p>
                                  </div>
                                )}

                                {/* Skills */}
                                {candidate.skills &&
                                  candidate.skills.length > 0 && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        Skills
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {candidate.skills
                                          .slice(0, 6)
                                          .map((skill, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-md"
                                            >
                                              {skill}
                                            </span>
                                          ))}
                                        {candidate.skills.length > 6 && (
                                          <span className="px-2 py-1 text-xs text-muted-foreground">
                                            +{candidate.skills.length - 6} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Match Info */}
                                {match.matchedAt && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      Matched{" "}
                                      {new Date(
                                        match.matchedAt
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                      // View profile functionality
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                  </Button>
                                  <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Contact
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="bg-card border rounded-lg p-12 text-center">
                      <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        No candidates found for this job posting.
                      </p>
                      <Button onClick={handleRefresh} disabled={refreshing}>
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
