"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Loading from "@/components/ui/loading";
import { Notification } from "@/components/ui/notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  bolnaAPI,
  candidateAPI,
  jobPostingAPI,
  matchingAPI,
  userAPI,
} from "@/lib/api";
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
  X,
  StopCircle,
  Loader2,
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
  const [notification, setNotification] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [schedulingCalls, setSchedulingCalls] = useState(false);
  const [scheduledCandidateIds, setScheduledCandidateIds] = useState(new Set());
  const [checkingScheduled, setCheckingScheduled] = useState(false);
  const [recruiters, setRecruiters] = useState([]);
  const [loadingRecruiters, setLoadingRecruiters] = useState(false);
  const [updatingRecruiters, setUpdatingRecruiters] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [loadingCandidateDetails, setLoadingCandidateDetails] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [callStatuses, setCallStatuses] = useState(new Map()); // Map of candidateId -> { executionId, status, canStop, callScheduledAt }
  const [stoppingCalls, setStoppingCalls] = useState(false);
  const [stoppingCallId, setStoppingCallId] = useState(null);
  const [stopAllDialogOpen, setStopAllDialogOpen] = useState(false);
  const [callDetailsDialogOpen, setCallDetailsDialogOpen] = useState(false);
  const [selectedCallDetails, setSelectedCallDetails] = useState(null);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Fetch data when user is available
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]); // Removed router from dependencies to prevent re-renders

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
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
      setNotification({
        variant: "error",
        title: "Failed to Load Jobs",
        message: err.message || "Failed to load jobs. Please try again.",
        dismissible: true,
      });
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

  const fetchRecruiters = async () => {
    try {
      setLoadingRecruiters(true);
      const response = await userAPI.getRecruiters();
      setRecruiters(response.recruiters || []);
    } catch (err) {
      console.error("Error fetching recruiters:", err);
    } finally {
      setLoadingRecruiters(false);
    }
  };

  const handleJobClick = async (job) => {
    setSelectedJob(job);
    setCandidates([]);
    setScheduledCandidateIds(new Set());

    // Fetch recruiters if not already loaded
    if (recruiters.length === 0 && user?.role === "recruiter") {
      await fetchRecruiters();
    }

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
      setNotification({
        variant: "error",
        title: "Failed to Load Candidates",
        message: err.message || "Failed to load candidates. Please try again.",
        dismissible: true,
      });
    } finally {
      setLoadingCandidates(false);
      setRefreshing(false);
    }
  };

  const handleAddSecondaryRecruiter = async (recruiterId) => {
    if (!selectedJob || !recruiterId) return;

    const currentSecondaryRecruiters = selectedJob.secondary_recruiter_id || [];

    // Convert to string IDs for comparison (handle both populated objects and ID strings)
    const currentIds = currentSecondaryRecruiters.map(
      (id) => id?._id?.toString() || id?.toString()
    );

    // Check if already added
    if (currentIds.includes(recruiterId.toString())) {
      return;
    }

    try {
      setUpdatingRecruiters(true);
      const updatedSecondaryRecruiters = [
        ...currentIds,
        recruiterId.toString(),
      ];

      await jobPostingAPI.updateJobPosting(selectedJob._id, {
        secondary_recruiter_id: updatedSecondaryRecruiters,
      });

      // Update local state
      setSelectedJob({
        ...selectedJob,
        secondary_recruiter_id: updatedSecondaryRecruiters,
      });

      // Update jobs list
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job._id === selectedJob._id
            ? { ...job, secondary_recruiter_id: updatedSecondaryRecruiters }
            : job
        )
      );
    } catch (err) {
      console.error("Error adding secondary recruiter:", err);
    } finally {
      setUpdatingRecruiters(false);
    }
  };

  const handleViewProfile = async (candidate) => {
    if (!candidate?._id) return;

    setSelectedCandidate(candidate);
    setProfileDialogOpen(true);
    setCandidateDetails(null);

    try {
      setLoadingCandidateDetails(true);
      const details = await candidateAPI.getCandidateById(candidate._id);
      setCandidateDetails(details);
    } catch (err) {
      console.error("Error fetching candidate details:", err);
      setNotification({
        variant: "error",
        title: "Failed to Load Profile",
        message:
          err.message || "Failed to load candidate details. Please try again.",
        dismissible: true,
      });
    } finally {
      setLoadingCandidateDetails(false);
    }
  };

  const handleRemoveSecondaryRecruiter = async (recruiterId) => {
    if (!selectedJob) return;

    const currentSecondaryRecruiters = selectedJob.secondary_recruiter_id || [];
    // Handle both populated objects and ID strings
    const updatedSecondaryRecruiters = currentSecondaryRecruiters
      .filter((id) => {
        const idStr = id?._id?.toString() || id?.toString();
        return idStr !== recruiterId.toString();
      })
      .map((id) => id?._id?.toString() || id?.toString()); // Convert to string IDs for API

    try {
      setUpdatingRecruiters(true);

      await jobPostingAPI.updateJobPosting(selectedJob._id, {
        secondary_recruiter_id: updatedSecondaryRecruiters,
      });

      // Update local state
      setSelectedJob({
        ...selectedJob,
        secondary_recruiter_id: updatedSecondaryRecruiters,
      });

      // Update jobs list
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job._id === selectedJob._id
            ? { ...job, secondary_recruiter_id: updatedSecondaryRecruiters }
            : job
        )
      );
    } catch (err) {
      console.error("Error removing secondary recruiter:", err);
    } finally {
      setUpdatingRecruiters(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedJob) return;

    try {
      setRefreshing(true);

      await matchingAPI.refreshJobMatches(selectedJob._id);
      const response = await matchingAPI.getJobMatches(selectedJob._id);

      const sortedMatches = (response.matches || [])
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 10);

      setCandidates(sortedMatches);
    } catch (err) {
      console.error("Error refreshing candidates:", err);
      setNotification({
        variant: "error",
        title: "Failed to Refresh",
        message:
          err.message || "Failed to refresh candidates. Please try again.",
        dismissible: true,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleScheduleAllCalls = async () => {
    if (!selectedJob || candidates.length === 0) return;

    try {
      setSchedulingCalls(true);

      // Filter out already scheduled candidates and candidates with stopped calls
      const candidatesToSchedule = candidates.filter((match) => {
        const candidateId = match.candidateId?._id?.toString();
        if (!candidateId) return false;
        
        // Skip if already scheduled
        if (scheduledCandidateIds.has(candidateId)) return false;
        
        // Skip if call is stopped
        const callStatus = callStatuses.get(candidateId);
        if (callStatus && callStatus.status === "stopped") return false;
        
        return true;
      });

      if (candidatesToSchedule.length === 0) {
        setNotification({
          variant: "info",
          title: "All Candidates Scheduled",
          message: "All candidates are already scheduled for calls.",
          dismissible: true,
        });
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
        })
        .filter((c) => c !== null); // Remove candidates without phone numbers

      if (candidatesArray.length === 0) {
        const failedCandidates = candidatesToSchedule
          .filter((match) => !match.candidateId?.phone_no)
          .map(
            (match) =>
              `${
                match.candidateId?.name || "Unknown Candidate"
              }: Missing phone number`
          );
        setNotification({
          variant: "warning",
          title: "No Valid Candidates",
          message:
            "No candidates with valid phone numbers found for scheduling.",
          details: failedCandidates,
          dismissible: true,
        });
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

      // Fetch call statuses for all scheduled calls
      if (selectedJob?._id) {
        fetchCallStatuses(selectedJob._id);
      }

      // Prepare detailed error information
      const failedResults = response.results.filter(
        (r) => !r.success && !r.alreadyScheduled
      );
      const alreadyScheduledResults = response.results.filter(
        (r) => r.alreadyScheduled
      );

      // Map failed candidates with detailed error information
      const failedDetails = failedResults.map((result) => {
        const candidate = candidates.find(
          (c) =>
            c.candidateId?._id?.toString() === result.candidateId?.toString()
        );
        const candidateName =
          candidate?.candidateId?.name || "Unknown Candidate";

        // Return structured error object with all available details
        return {
          name: candidateName,
          candidateId: result.candidateId,
          error: result.error || "Failed to schedule call",
          errorCode: result.errorCode,
          httpStatus: result.httpStatus,
          details: result.details,
          // Also keep string format for backward compatibility
          string: `${candidateName}: ${
            result.error || "Failed to schedule call"
          }`,
        };
      });

      // Extract main/common error
      const mainError =
        failedDetails.length > 0
          ? (() => {
              const errorCounts = {};
              failedDetails.forEach((detail) => {
                const errorKey = detail.error || "Unknown error";
                errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
              });
              const sortedErrors = Object.entries(errorCounts).sort(
                (a, b) => b[1] - a[1]
              );
              if (sortedErrors.length > 0) {
                return {
                  message: sortedErrors[0][0],
                  count: sortedErrors[0][1],
                  total: failedDetails.length,
                };
              }
              return null;
            })()
          : null;

      const alreadyScheduledDetails = alreadyScheduledResults.map((result) => {
        const candidate = candidates.find(
          (c) =>
            c.candidateId?._id?.toString() === result.candidateId?.toString()
        );
        return candidate?.candidateId?.name || "Unknown Candidate";
      });

      // Show appropriate notification based on results
      const alreadyScheduledCount = alreadyScheduledResults.length;
      const successCount = response.summary.successful;
      const failedCount = response.summary.failed;

      if (failedCount === 0 && successCount > 0) {
        // All successful
        let message = `Successfully scheduled ${successCount} call${
          successCount !== 1 ? "s" : ""
        }!`;
        if (alreadyScheduledCount > 0) {
          message += ` ${alreadyScheduledCount} ${
            alreadyScheduledCount === 1 ? "was" : "were"
          } already scheduled.`;
        }
        setNotification({
          variant: "success",
          title: "Calls Scheduled Successfully",
          message: message,
          details: alreadyScheduledCount > 0 ? alreadyScheduledDetails : null,
          dismissible: true,
        });
      } else if (successCount > 0 && failedCount > 0) {
        // Partial success
        setNotification({
          variant: "warning",
          title: "Partial Success",
          message: `Successfully scheduled ${successCount} call${
            successCount !== 1 ? "s" : ""
          }, but ${failedCount} failed.${
            alreadyScheduledCount > 0
              ? ` ${alreadyScheduledCount} ${
                  alreadyScheduledCount === 1 ? "was" : "were"
                } already scheduled.`
              : ""
          }`,
          details: failedDetails,
          mainError: mainError,
          dismissible: true,
        });
      } else if (failedCount > 0) {
        // All failed
        setNotification({
          variant: "error",
          title: "Failed to Schedule Calls",
          message: `Failed to schedule ${failedCount} call${
            failedCount !== 1 ? "s" : ""
          }. Please check the details below.`,
          details: failedDetails,
          mainError: mainError,
          dismissible: true,
        });
      } else {
        // Edge case: no results
        setNotification({
          variant: "info",
          title: "No Calls Scheduled",
          message:
            "No calls were scheduled. All candidates may already be scheduled.",
          dismissible: true,
        });
      }
    } catch (err) {
      console.error("Error scheduling calls:", err);
      setNotification({
        variant: "error",
        title: "Scheduling Error",
        message: err.message || "Failed to schedule calls. Please try again.",
        dismissible: true,
      });
    } finally {
      setSchedulingCalls(false);
    }
  };

  // Fetch call statuses for all calls in a job
  const fetchCallStatuses = async (jobId) => {
    if (!jobId) return;

    try {
      const response = await bolnaAPI.getCallsByJob(jobId);
      const statusMap = new Map();

      response.calls.forEach((call) => {
        // candidateId is already a string from backend
        const candidateId = call.candidateId;
        
        if (candidateId) {
          statusMap.set(candidateId, {
            executionId: call.executionId,
            status: call.status,
            canStop: call.canStop,
            callScheduledAt: call.callScheduledAt,
            userScheduledAt: call.userScheduledAt,
          });
        }
      });

      setCallStatuses(statusMap);
    } catch (err) {
      console.error("Error fetching call statuses:", err);
    }
  };

  // Stop all calls for the selected job
  const handleStopAllCalls = async () => {
    if (!selectedJob?._id) return;

    try {
      setStoppingCalls(true);
      const response = await bolnaAPI.stopAllCalls(selectedJob._id);

      setNotification({
        variant: "success",
        title: "Calls Stopped",
        message: `Successfully stopped ${response.stoppedCount} call(s)`,
        dismissible: true,
      });

      // Refresh call statuses
      await fetchCallStatuses(selectedJob._id);
      setStopAllDialogOpen(false);
    } catch (err) {
      console.error("Error stopping calls:", err);
      setNotification({
        variant: "error",
        title: "Failed to Stop Calls",
        message: err.message || "Failed to stop calls. Please try again.",
        dismissible: true,
      });
    } finally {
      setStoppingCalls(false);
    }
  };

  // Fetch and show call details for a candidate
  const handleViewCallDetails = async (candidateId, executionId) => {
    if (!executionId) {
      // If no executionId, try to get it from callStatuses
      const candidateIdStr = candidateId?.toString();
      const callStatus = candidateIdStr ? callStatuses.get(candidateIdStr) : null;
      if (!callStatus?.executionId) {
        setNotification({
          variant: "info",
          title: "No Call Information",
          message: "No call information available for this candidate.",
          dismissible: true,
        });
        return;
      }
      executionId = callStatus.executionId;
    }

    try {
      setLoadingCallDetails(true);
      setCallDetailsDialogOpen(true);
      const response = await bolnaAPI.getCallStatus(executionId);
      setSelectedCallDetails(response);
    } catch (err) {
      console.error("Error fetching call details:", err);
      setNotification({
        variant: "error",
        title: "Failed to Load Call Details",
        message: err.message || "Failed to load call details. Please try again.",
        dismissible: true,
      });
      setCallDetailsDialogOpen(false);
    } finally {
      setLoadingCallDetails(false);
    }
  };

  // Stop a single call
  const handleStopCall = async (executionId, candidateId) => {
    if (!executionId) return;

    try {
      setStoppingCallId(executionId);
      await bolnaAPI.stopCall(executionId);

      setNotification({
        variant: "success",
        title: "Call Stopped",
        message: "The call has been stopped successfully.",
        dismissible: true,
      });

      // Update call status in the map
      setCallStatuses((prev) => {
        const updated = new Map(prev);
        const candidateIdStr = candidateId?.toString();
        if (candidateIdStr && updated.has(candidateIdStr)) {
          const status = updated.get(candidateIdStr);
          updated.set(candidateIdStr, {
            ...status,
            status: "stopped",
            canStop: false,
          });
        }
        return updated;
      });

      // Refresh call statuses and call details if dialog is open
      if (selectedJob?._id) {
        await fetchCallStatuses(selectedJob._id);
        if (callDetailsDialogOpen && selectedCallDetails?.call?.executionId === executionId) {
          // Refresh call details
          const response = await bolnaAPI.getCallStatus(executionId);
          setSelectedCallDetails(response);
        }
      }
    } catch (err) {
      console.error("Error stopping call:", err);
      setNotification({
        variant: "error",
        title: "Failed to Stop Call",
        message: err.message || "Failed to stop call. Please try again.",
        dismissible: true,
      });
    } finally {
      setStoppingCallId(null);
    }
  };

  // Fetch call statuses when job is selected
  useEffect(() => {
    if (selectedJob?._id) {
      fetchCallStatuses(selectedJob._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob?._id]);

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
          title="Top Applicants"
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
          {loading || loadingJobs ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loading />
            </div>
          ) : (
            <>
              {notification && (
                <Notification
                  variant={notification.variant}
                  title={notification.title}
                  message={notification.message}
                  details={notification.details}
                  dismissible={notification.dismissible}
                  onDismiss={() => setNotification(null)}
                />
              )}

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search candidates..."
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
                        <Button className="w-full" variant="outline">
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
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2">
                          {selectedJob.title}
                        </h2>
                        <p className="text-lg text-muted-foreground">
                          {selectedJob.company}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {candidates.length > 0 &&
                          (() => {
                            const unscheduledCount = candidates.filter(
                              (match) =>
                                !scheduledCandidateIds.has(
                                  match.candidateId?._id?.toString() || ""
                                )
                            ).length;
                            const allScheduled = unscheduledCount === 0;

                            return (
                              <Button
                                variant="default"
                                onClick={handleScheduleAllCalls}
                                disabled={
                                  schedulingCalls ||
                                  checkingScheduled ||
                                  allScheduled
                                }
                                className="bg-black hover:bg-black/80 cursor-pointer text-white disabled:opacity-50"
                                title={
                                  allScheduled
                                    ? "All candidates are already scheduled"
                                    : ""
                                }
                              >
                                <Phone
                                  className={`mr-2 h-4 w-4 ${
                                    schedulingCalls ? "animate-pulse" : ""
                                  }`}
                                />
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
                        {/* Stop All Calls Button - Show if there are scheduled calls that can be stopped */}
                        {(() => {
                          const scheduledCallsCount = Array.from(callStatuses.values()).filter(
                            (status) => status.canStop
                          ).length;
                          return scheduledCallsCount > 0 ? (
                            <Button
                              variant="outline"
                              className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                              onClick={() => setStopAllDialogOpen(true)}
                              disabled={stoppingCalls}
                            >
                              <StopCircle className="mr-2 h-4 w-4" />
                              Stop All Calls ({scheduledCallsCount})
                            </Button>
                          ) : null;
                        })()}
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

                    {/* Secondary Recruiters Section */}
                    {user?.role === "recruiter" &&
                      (() => {
                        const primaryRecruiterId =
                          selectedJob.primary_recruiter_id?._id?.toString() ||
                          selectedJob.primary_recruiter_id?.toString();
                        const currentUserId = user.id?.toString();
                        return primaryRecruiterId === currentUserId;
                      })() && (
                        <div className="mt-6 pt-6 border-t">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <label className="text-sm font-semibold text-foreground mb-2 block">
                                Secondary Recruiters
                              </label>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {(selectedJob.secondary_recruiter_id || []).map(
                                  (recruiterId) => {
                                    // Handle both populated object and ID string
                                    const recruiterIdStr =
                                      recruiterId?._id?.toString() ||
                                      recruiterId?.toString();

                                    // If recruiterId is a populated object, use its name/email directly
                                    // Otherwise, try to find it in the recruiters list
                                    let recruiterName = "Unknown Recruiter";

                                    if (
                                      recruiterId &&
                                      typeof recruiterId === "object" &&
                                      recruiterId.name
                                    ) {
                                      // Populated object with name
                                      recruiterName =
                                        recruiterId.name ||
                                        recruiterId.email ||
                                        "Unknown Recruiter";
                                    } else if (
                                      recruiterId &&
                                      typeof recruiterId === "object" &&
                                      recruiterId.email
                                    ) {
                                      // Populated object with only email
                                      recruiterName = recruiterId.email;
                                    } else {
                                      // ID string - try to find in recruiters list
                                      const recruiter = recruiters.find(
                                        (r) =>
                                          r._id?.toString() === recruiterIdStr
                                      );
                                      recruiterName =
                                        recruiter?.name ||
                                        recruiter?.email ||
                                        "Unknown Recruiter";
                                    }

                                    return (
                                      <div
                                        key={recruiterIdStr}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-black text-white border border-gray-700"
                                      >
                                        <User className="h-3.5 w-3.5" />
                                        <span className="text-sm font-medium">
                                          {recruiterName}
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleRemoveSecondaryRecruiter(
                                              recruiterIdStr
                                            )
                                          }
                                          disabled={updatingRecruiters}
                                          className="ml-1 hover:bg-gray-800 rounded-full p-0.5 transition-colors disabled:opacity-50"
                                          title="Remove recruiter"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                              <Select
                                onValueChange={handleAddSecondaryRecruiter}
                                disabled={
                                  updatingRecruiters || loadingRecruiters
                                }
                              >
                                <SelectTrigger className="w-full max-w-md">
                                  <SelectValue placeholder="Add Secondary Recruiter" />
                                </SelectTrigger>
                                <SelectContent>
                                  {recruiters
                                    .filter((recruiter) => {
                                      // Exclude primary recruiter and already added secondary recruiters
                                      const primaryRecruiterId =
                                        selectedJob.primary_recruiter_id?._id?.toString() ||
                                        selectedJob.primary_recruiter_id?.toString();
                                      const isPrimary =
                                        recruiter._id?.toString() ===
                                        primaryRecruiterId;
                                      const isSecondary = (
                                        selectedJob.secondary_recruiter_id || []
                                      ).some((id) => {
                                        const recruiterId =
                                          id?._id?.toString() || id?.toString();
                                        return (
                                          recruiterId ===
                                          recruiter._id?.toString()
                                        );
                                      });
                                      return !isPrimary && !isSecondary;
                                    })
                                    .map((recruiter) => (
                                      <SelectItem
                                        key={recruiter._id}
                                        value={recruiter._id}
                                      >
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4" />
                                          <span>
                                            {recruiter.name || recruiter.email}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  {recruiters.filter((recruiter) => {
                                    const primaryRecruiterId =
                                      selectedJob.primary_recruiter_id?._id?.toString() ||
                                      selectedJob.primary_recruiter_id?.toString();
                                    const isPrimary =
                                      recruiter._id?.toString() ===
                                      primaryRecruiterId;
                                    const isSecondary = (
                                      selectedJob.secondary_recruiter_id || []
                                    ).some((id) => {
                                      const recruiterId =
                                        id?._id?.toString() || id?.toString();
                                      return (
                                        recruiterId ===
                                        recruiter._id?.toString()
                                      );
                                    });
                                    return !isPrimary && !isSecondary;
                                  }).length === 0 && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      No available recruiters
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="lg:hidden mb-4 space-y-2">
                    {candidates.length > 0 &&
                      (() => {
                        const unscheduledCount = candidates.filter(
                          (match) =>
                            !scheduledCandidateIds.has(
                              match.candidateId?._id?.toString() || ""
                            )
                        ).length;
                        const allScheduled = unscheduledCount === 0;

                        return (
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                            variant="default"
                            onClick={handleScheduleAllCalls}
                            disabled={
                              schedulingCalls ||
                              checkingScheduled ||
                              allScheduled
                            }
                            title={
                              allScheduled
                                ? "All candidates are already scheduled"
                                : ""
                            }
                          >
                            <Phone
                              className={`mr-2 h-4 w-4 ${
                                schedulingCalls ? "animate-pulse" : ""
                              }`}
                            />
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
                    {/* Stop All Calls Button - Mobile */}
                    {(() => {
                      const scheduledCallsCount = Array.from(callStatuses.values()).filter(
                        (status) => status.canStop
                      ).length;
                      return scheduledCallsCount > 0 ? (
                        <Button
                          className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                          variant="outline"
                          onClick={() => setStopAllDialogOpen(true)}
                          disabled={stoppingCalls}
                        >
                          <StopCircle className="mr-2 h-4 w-4" />
                          Stop All Calls ({scheduledCallsCount})
                        </Button>
                      ) : null;
                    })()}
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
                      <div className="bg-card border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Candidate</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Match Score</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Experience</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
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

                              const isScheduled = scheduledCandidateIds.has(
                                candidate._id?.toString() || ""
                              );

                              return (
                                <TableRow
                                  key={candidate._id || index}
                                  className={
                                    isScheduled
                                      ? "bg-green-50 dark:bg-green-950/20"
                                      : ""
                                  }
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                        <span className="text-sm font-semibold text-primary">
                                          {candidate.name
                                            ?.split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase() || "N/A"}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="font-semibold">
                                          {candidate.name || "Unknown"}
                                        </div>
                                        {candidate.bio && (
                                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                            {candidate.bio}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
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
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                          {candidate.email}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {candidate.phone_no ? (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                          {candidate.phone_no}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {candidate.experience !== undefined ? (
                                      <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                          {candidate.experience} years
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {(() => {
                                      const candidateIdStr = candidate._id?.toString();
                                      const callStatus = candidateIdStr ? callStatuses.get(candidateIdStr) : null;
                                      
                                      if (isScheduled && callStatus) {
                                        const statusColors = {
                                          scheduled: "bg-blue-500",
                                          in_progress: "bg-yellow-500",
                                          completed: "bg-green-500",
                                          stopped: "bg-red-500",
                                          cancelled: "bg-gray-500",
                                          failed: "bg-red-600",
                                        };
                                        const statusColor = statusColors[callStatus.status?.toLowerCase()] || "bg-blue-500";
                                        const statusText = callStatus.status || "Scheduled";
                                        
                                        return (
                                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusColor} text-white`}>
                                            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                            <span>
                                              {statusText}
                                            </span>
                                          </div>
                                        );
                                      } else if (isScheduled) {
                                        return (
                                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                                            <Calendar className="h-3 w-3" />
                                            Scheduled
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <span className="text-sm text-muted-foreground">
                                            Not Scheduled
                                          </span>
                                        );
                                      }
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleViewProfile(candidate)
                                        }
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      {(() => {
                                        const candidateIdStr = candidate._id?.toString();
                                        const callStatus = candidateIdStr ? callStatuses.get(candidateIdStr) : null;
                                        const isStopping = stoppingCallId === callStatus?.executionId;
                                        
                                        // Show stop button only if canStop is true AND status is not stopped/cancelled/completed
                                        if (
                                          callStatus &&
                                          callStatus.canStop &&
                                          callStatus.status !== "stopped" &&
                                          callStatus.status !== "cancelled" &&
                                          callStatus.status !== "completed"
                                        ) {
                                          return (
                                            <Button
                                              className="bg-red-500 hover:bg-red-600 text-white"
                                              size="sm"
                                              onClick={() =>
                                                handleViewCallDetails(
                                                  candidateIdStr,
                                                  callStatus.executionId
                                                )
                                              }
                                              title={`View call details - Status: ${callStatus.status}`}
                                            >
                                              <StopCircle className="h-4 w-4" />
                                            </Button>
                                          );
                                        } else if (callStatus) {
                                          return (
                                            <Button
                                              className="bg-blue-500 hover:bg-blue-600 text-white"
                                              size="sm"
                                              onClick={() =>
                                                handleViewCallDetails(
                                                  candidateIdStr,
                                                  callStatus.executionId
                                                )
                                              }
                                              title={`View call details - Status: ${callStatus.status}`}
                                            >
                                              <Calendar className="h-4 w-4" />
                                            </Button>
                                          );
                                        } else if (isScheduled) {
                                          return (
                                            <Button
                                              className="bg-blue-500 hover:bg-blue-600 text-white"
                                              size="sm"
                                              onClick={() =>
                                                handleViewCallDetails(candidateIdStr)
                                              }
                                              title="View call details"
                                            >
                                              <Calendar className="h-4 w-4" />
                                            </Button>
                                          );
                                        } else {
                                          return (
                                            <Button
                                              className="bg-black hover:bg-black/80 text-white"
                                              size="sm"
                                              disabled
                                              title="No call scheduled"
                                            >
                                              <Calendar className="h-4 w-4" />
                                            </Button>
                                          );
                                        }
                                      })()}
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
                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 border-2">
                      <CardContent className="pt-6 text-center">
                        <User className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p className="text-green-900 dark:text-green-100 mb-4">
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
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Stop All Calls Dialog */}
      <Dialog open={stopAllDialogOpen} onOpenChange={setStopAllDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stop All Scheduled Calls</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop all scheduled calls for this job? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(() => {
              const stoppableCalls = Array.from(callStatuses.values()).filter(
                (status) => status.canStop
              );
              return (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    The following {stoppableCalls.length} call(s) will be stopped:
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                    {stoppableCalls.map((callStatus, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <div>
                          <p className="font-medium">Call #{idx + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            Scheduled:{" "}
                            {callStatus.callScheduledAt
                              ? new Date(callStatus.callScheduledAt).toLocaleString()
                              : "N/A"}
                          </p>
                        </div>
                        <div className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                          {callStatus.status || "scheduled"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setStopAllDialogOpen(false)}
              disabled={stoppingCalls}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleStopAllCalls}
              disabled={stoppingCalls}
            >
              {stoppingCalls ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop All Calls
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Details Dialog */}
      <Dialog
        open={callDetailsDialogOpen}
        onOpenChange={setCallDetailsDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
            <DialogDescription>
              View detailed information about the scheduled call
            </DialogDescription>
          </DialogHeader>

          {loadingCallDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedCallDetails ? (
            <div className="space-y-6 mt-4">
              {/* Call Status */}
              <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Call Status
                  </h3>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedCallDetails.call?.status === "completed"
                        ? "bg-green-500 text-white"
                        : selectedCallDetails.call?.status === "stopped" ||
                          selectedCallDetails.call?.status === "cancelled"
                        ? "bg-red-500 text-white"
                        : selectedCallDetails.call?.status === "in_progress"
                        ? "bg-yellow-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {selectedCallDetails.call?.status || "Unknown"}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Execution ID
                    </p>
                    <p className="text-sm font-mono">
                      {selectedCallDetails.call?.executionId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Can Stop
                    </p>
                    <p className="text-sm">
                      {selectedCallDetails.call?.canStop ? (
                        <span className="text-green-600 dark:text-green-400">
                          Yes
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">
                          No
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div className="p-4 rounded-lg border">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                  Schedule Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCallDetails.call?.callScheduledAt && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Scheduled Time
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {new Date(
                          selectedCallDetails.call.callScheduledAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedCallDetails.call?.userScheduledAt && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          User Scheduled Time
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {new Date(
                          selectedCallDetails.call.userScheduledAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedCallDetails.call?.createdAt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Created At
                      </p>
                      <p className="text-sm">
                        {new Date(
                          selectedCallDetails.call.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedCallDetails.call?.updatedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Last Updated
                      </p>
                      <p className="text-sm">
                        {new Date(
                          selectedCallDetails.call.updatedAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Details */}
              {selectedCallDetails.execution && (
                <div className="p-4 rounded-lg border">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                    Execution Details
                  </h3>
                  <div className="space-y-3">
                    {selectedCallDetails.execution.transcript && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Transcript
                        </p>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm max-h-40 overflow-y-auto">
                          {selectedCallDetails.execution.transcript}
                        </div>
                      </div>
                    )}
                    {selectedCallDetails.execution.duration && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Duration
                        </p>
                        <p className="text-sm">
                          {selectedCallDetails.execution.duration} seconds
                        </p>
                      </div>
                    )}
                    {selectedCallDetails.execution.start_time && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Start Time
                        </p>
                        <p className="text-sm">
                          {new Date(
                            selectedCallDetails.execution.start_time
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedCallDetails.execution.end_time && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          End Time
                        </p>
                        <p className="text-sm">
                          {new Date(
                            selectedCallDetails.execution.end_time
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stop Call Button - Only show if call can be stopped and is not already stopped */}
              {selectedCallDetails.call?.canStop &&
                selectedCallDetails.call?.status !== "stopped" &&
                selectedCallDetails.call?.status !== "cancelled" &&
                selectedCallDetails.call?.status !== "completed" && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() =>
                        handleStopCall(
                          selectedCallDetails.call.executionId,
                          selectedCallDetails.call.candidateId
                        )
                      }
                      disabled={
                        stoppingCallId === selectedCallDetails.call.executionId
                      }
                    >
                      {stoppingCallId ===
                      selectedCallDetails.call.executionId ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Stopping...
                        </>
                      ) : (
                        <>
                          <StopCircle className="mr-2 h-4 w-4" />
                          Stop Call
                        </>
                      )}
                    </Button>
                  </div>
                )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No call details available
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Candidate Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedCandidate?.name || "Candidate Profile"}
            </DialogTitle>
            <DialogDescription>
              {selectedCandidate?.email || "View full candidate details"}
            </DialogDescription>
          </DialogHeader>

          {loadingCandidateDetails ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : candidateDetails ? (
            <div className="space-y-6 mt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Name
                  </h3>
                  <p className="text-base">{candidateDetails.name || "N/A"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Email
                  </h3>
                  <p className="text-base">{candidateDetails.email || "N/A"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Phone
                  </h3>
                  <p className="text-base">
                    {candidateDetails.phone_no || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Experience
                  </h3>
                  <p className="text-base">
                    {candidateDetails.experience !== undefined
                      ? `${candidateDetails.experience} years`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Role
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidateDetails.role &&
                    candidateDetails.role.length > 0 ? (
                      candidateDetails.role.map((r, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-base">N/A</span>
                    )}
                  </div>
                </div>
                {candidateDetails.resume_url && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      Resume
                    </h3>
                    <a
                      href={candidateDetails.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-base"
                    >
                      View Resume
                    </a>
                  </div>
                )}
              </div>

              {/* Bio */}
              {candidateDetails.bio && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Bio
                  </h3>
                  <p className="text-base leading-relaxed">
                    {candidateDetails.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              {candidateDetails.skills &&
                candidateDetails.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {candidateDetails.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Social Links */}
              {candidateDetails.social_links &&
                Object.keys(candidateDetails.social_links).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      Social Links
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {candidateDetails.social_links.linkedin && (
                        <a
                          href={candidateDetails.social_links.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          LinkedIn
                        </a>
                      )}
                      {candidateDetails.social_links.github && (
                        <a
                          href={candidateDetails.social_links.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          GitHub
                        </a>
                      )}
                      {candidateDetails.social_links.portfolio && (
                        <a
                          href={candidateDetails.social_links.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          Portfolio
                        </a>
                      )}
                    </div>
                  </div>
                )}

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                {candidateDetails.is_active !== undefined && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      Status
                    </h3>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        candidateDetails.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {candidateDetails.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                )}
                {candidateDetails.createdAt && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      Created
                    </h3>
                    <p className="text-base">
                      {new Date(
                        candidateDetails.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>No candidate details available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
