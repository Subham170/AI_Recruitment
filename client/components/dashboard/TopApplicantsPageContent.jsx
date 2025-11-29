"use client";

import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { jobPostingAPI, matchingAPI, bolnaAPI } from "@/lib/api";
import {
  TrendingUp,
  User,
  Mail,
  Briefcase,
  Search,
  Eye,
  Phone,
  Calendar,
  Menu,
  RefreshCw,
  Clock,
  DollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TopApplicantsPageContent() {
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
  const [scheduledCandidateIds, setScheduledCandidateIds] = useState(new Set());
  const [checkingScheduled, setCheckingScheduled] = useState(false);

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
        const myJobs = response.myJobPostings || [];
        const secondaryJobs = response.secondaryJobPostings || [];
        setJobs([...myJobs, ...secondaryJobs]);
      } else {
        setJobs(response.jobPostings || []);
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError(err.message || "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  };

  const checkScheduledCalls = async (jobId, candidateIds) => {
    try {
      setCheckingScheduled(true);
      const response = await bolnaAPI.checkCallsScheduled({
        jobId,
        candidateIds,
      });
      setScheduledCandidateIds(new Set(response.scheduledCandidates || []));
    } catch (err) {
      console.error("Error checking scheduled calls:", err);
      // Don't show error to user, just log it
      setScheduledCandidateIds(new Set());
    } finally {
      setCheckingScheduled(false);
    }
  };

  const handleJobClick = async (job) => {
    setSelectedJob(job);
    setCandidates([]);
    setError(null);
    setScheduledCandidateIds(new Set());
    
    try {
      setRefreshing(true);
      setLoadingCandidates(true);
      
      await matchingAPI.refreshJobMatches(job._id);
      const response = await matchingAPI.getJobMatches(job._id);
      
      const sortedMatches = (response.matches || [])
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 10);
      
      setCandidates(sortedMatches);
      
      // Check which candidates are already scheduled
      const candidateIds = sortedMatches
        .map((match) => match.candidateId?._id)
        .filter(Boolean);
      
      if (candidateIds.length > 0) {
        await checkScheduledCalls(job._id, candidateIds);
      }
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
      
      await matchingAPI.refreshJobMatches(selectedJob._id);
      const response = await matchingAPI.getJobMatches(selectedJob._id);
      
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
      
      // Filter out already scheduled candidates
      const candidatesToSchedule = candidates.filter((match) => {
        const candidateId = match.candidateId?._id?.toString();
        return candidateId && !scheduledCandidateIds.has(candidateId);
      });
      
      if (candidatesToSchedule.length === 0) {
        setError("All candidates are already scheduled for calls");
        return;
      }
      
      // Prepare candidates array for batch scheduling
      const candidatesArray = candidatesToSchedule
        .map((match) => {
          const candidate = match.candidateId;
          if (!candidate || !candidate.phone_no) {
            return null;
          }
          return {
            candidateId: candidate._id,
            recipient_phone_number: candidate.phone_no,
            user_data: {
              bio: candidate.bio || "",
              role: candidate.role && candidate.role.length > 0 ? candidate.role.join(", ") : "",
              experience: candidate.experience !== undefined ? `${candidate.experience} years` : "",
              name: candidate.name || "",
            },
          };
        })
        .filter((c) => c !== null); // Remove candidates without phone numbers
      
      if (candidatesArray.length === 0) {
        setError("No candidates with valid phone numbers found");
        return;
      }
      
      // Calculate start time (5 minutes from now)
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() + 5);
      
      // Send batch request
      const payload = {
        jobId: selectedJob._id,
        candidates: candidatesArray,
        startTime: startTime.toISOString(),
      };
      
      const response = await bolnaAPI.scheduleCallsBatch(payload);
      
      // Update scheduled candidate IDs
      const newlyScheduled = response.results
        .filter((r) => r.success)
        .map((r) => r.candidateId);
      
      setScheduledCandidateIds((prev) => {
        const updated = new Set(prev);
        newlyScheduled.forEach((id) => updated.add(id));
        return updated;
      });
      
      // Show success message
      const alreadyScheduledCount = candidates.length - candidatesToSchedule.length;
      let message = `Successfully scheduled ${response.summary.successful} calls!`;
      if (alreadyScheduledCount > 0) {
        message += ` (${alreadyScheduledCount} were already scheduled)`;
      }
      if (response.summary.failed > 0) {
        message += ` ${response.summary.failed} failed.`;
      }
      
      if (response.summary.failed === 0) {
        setError(null);
        alert(message);
      } else {
        setError(message);
      }
    } catch (err) {
      console.error("Error scheduling calls:", err);
      setError(err.message || "Failed to schedule calls");
    } finally {
      setSchedulingCalls(false);
    }
  };

  if (loading || loadingJobs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

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
    if (percentage >= 90) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (percentage >= 80) return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <aside className="hidden lg:block">
        <DashboardSidebar />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <DashboardSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
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

        <header className="hidden lg:block bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Top Applicants</h1>
            <div className="flex items-center gap-4">
              {selectedJob && candidates.length > 0 && (() => {
                const unscheduledCount = candidates.filter(
                  (match) => !scheduledCandidateIds.has(match.candidateId?._id?.toString() || "")
                ).length;
                const allScheduled = unscheduledCount === 0;
                
                return (
                  <Button
                    variant="default"
                    onClick={handleScheduleAllCalls}
                    disabled={schedulingCalls || checkingScheduled || allScheduled}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    title={allScheduled ? "All candidates are already scheduled" : ""}
                  >
                    <Phone className={`mr-2 h-4 w-4 ${schedulingCalls ? "animate-pulse" : ""}`} />
                    {schedulingCalls
                      ? "Scheduling..."
                      : checkingScheduled
                      ? "Checking..."
                      : allScheduled
                      ? "All Scheduled"
                      : `Schedule All Calls (${unscheduledCount} remaining)`}
                  </Button>
                );
              })()}
              {selectedJob && (
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
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

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Card className="bg-green-500 border-0 text-white mb-8">
            <CardHeader>
              <CardTitle className="text-4xl mb-2 flex items-center gap-3">
                <TrendingUp className="h-10 w-10" />
                Top Applicants
              </CardTitle>
              <CardDescription className="text-xl opacity-90 text-white">
                {selectedJob
                  ? `Top candidates for ${selectedJob.title} at ${selectedJob.company}`
                  : "Select a job posting to view top matching candidates"}
              </CardDescription>
            </CardHeader>
          </Card>

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-6">
                <p className="text-red-900 dark:text-red-100">{error}</p>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          {!selectedJob ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{jobs.length}</div>
                    <p className="text-xs text-muted-foreground">Total Jobs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {jobs.filter((j) => j.primary_recruiter_id).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Your Jobs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {jobs.length - jobs.filter((j) => j.primary_recruiter_id).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Secondary Jobs</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredJobs.map((job) => (
                  <Card
                    key={job._id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleJobClick(job)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                          <CardDescription className="text-base font-semibold text-foreground">
                            {job.company}
                          </CardDescription>
                        </div>
                        <Briefcase className="h-6 w-6 text-blue-500 shrink-0 ml-2" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {job.role && job.role.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {job.role.map((r, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                        {job.ctc && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>{job.ctc}</span>
                          </div>
                        )}
                        {job.exp_req !== undefined && job.exp_req > 0 && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{job.exp_req} years experience</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                      <div className="mt-4 pt-4 border-t">
                        <Button className="w-full" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          View Top Candidates
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredJobs.length === 0 && (
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 border-2">
                  <CardContent className="pt-6 text-center">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-green-900 dark:text-green-100">
                      {jobs.length === 0
                        ? "No job postings available. Create a job posting to see top applicants."
                        : "No jobs found matching your search criteria."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              <Card className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{selectedJob.title}</h2>
                      <p className="text-lg text-muted-foreground">{selectedJob.company}</p>
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
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:hidden mb-4 space-y-2">
                {candidates.length > 0 && (() => {
                  const unscheduledCount = candidates.filter(
                    (match) => !scheduledCandidateIds.has(match.candidateId?._id?.toString() || "")
                  ).length;
                  const allScheduled = unscheduledCount === 0;
                  
                  return (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      variant="default"
                      onClick={handleScheduleAllCalls}
                      disabled={schedulingCalls || checkingScheduled || allScheduled}
                      title={allScheduled ? "All candidates are already scheduled" : ""}
                    >
                      <Phone className={`mr-2 h-4 w-4 ${schedulingCalls ? "animate-pulse" : ""}`} />
                      {schedulingCalls
                        ? "Scheduling..."
                        : checkingScheduled
                        ? "Checking..."
                        : allScheduled
                        ? "All Scheduled"
                        : `Schedule All Calls (${unscheduledCount} remaining)`}
                    </Button>
                  );
                })()}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh Matches
                </Button>
              </div>

              {loadingCandidates ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading top candidates...</p>
                  </CardContent>
                </Card>
              ) : candidates.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      Showing top {candidates.length} candidates sorted by match score
                    </p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {candidates.map((match, index) => {
                      const candidate = match.candidateId;
                      if (!candidate) return null;
                      
                      const matchScore = Math.round((match.matchScore || 0) * 100);
                      
                      const isScheduled = scheduledCandidateIds.has(candidate._id?.toString() || "");
                      
                      return (
                        <Card
                          key={candidate._id || index}
                          className={`hover:shadow-lg transition-shadow ${
                            isScheduled ? "border-green-500 border-2" : ""
                          }`}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                  <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                                    {candidate.name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase() || "N/A"}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <CardTitle className="text-xl mb-1">
                                    {candidate.name || "Unknown"}
                                  </CardTitle>
                                  <CardDescription className="text-base">
                                    {candidate.role && candidate.role.length > 0
                                      ? candidate.role.join(", ")
                                      : "Candidate"}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div
                                  className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                                    match.matchScore || 0
                                  )}`}
                                >
                                  {matchScore}%
                                </div>
                                {isScheduled && (
                                  <div className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                                    <Calendar className="inline h-3 w-3 mr-1" />
                                    Scheduled
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
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
                                  <span>{candidate.experience} years experience</span>
                                </div>
                              )}
                            </div>

                            {candidate.bio && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Bio</p>
                                <p className="text-sm line-clamp-2">{candidate.bio}</p>
                              </div>
                            )}

                            {candidate.skills && candidate.skills.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Skills</p>
                                <div className="flex flex-wrap gap-2">
                                  {candidate.skills.slice(0, 6).map((skill, idx) => (
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

                            {match.matchedAt && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Matched {new Date(match.matchedAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {}}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </Button>
                              <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white">
                                <Calendar className="mr-2 h-4 w-4" />
                                Contact
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 border-2">
                  <CardContent className="pt-6 text-center">
                    <User className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-green-900 dark:text-green-100 mb-4">
                      No candidates found for this job posting.
                    </p>
                    <Button onClick={handleRefresh} disabled={refreshing}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh Matches
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

