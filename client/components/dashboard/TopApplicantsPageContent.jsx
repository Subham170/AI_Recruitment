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
  Eye,
  FileText,
  Loader2,
  Mail,
  Phone,
  PhoneCall,
  RefreshCw,
  Search,
  StopCircle,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TopApplicantsPageContent({ jobId: initialJobId }) {
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
  const [callingCandidateId, setCallingCandidateId] = useState(null);

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

  // Load job from URL if jobId is provided
  useEffect(() => {
    if (initialJobId && jobs.length > 0) {
      const job = jobs.find((j) => j._id === initialJobId);
      // Only load if job exists and is different from currently selected job
      if (job && (!selectedJob || selectedJob._id !== initialJobId)) {
        handleJobClick(job, false); // Don't navigate, we're already on the job page
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJobId, jobs]);

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await jobPostingAPI.getAllJobPostings();

      // For recruiters, API returns allJobPostings, myJobPostings, secondaryJobPostings, remainingJobPostings
      // For managers/admins, API returns jobPostings
      // Show all job postings for all roles
      if (user?.role === "recruiter") {
        setJobs(response.allJobPostings || []);
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

  // Helper function to get recruiter's role for a job
  const getRecruiterRole = (job) => {
    if (!job || !user || user.role !== "recruiter") {
      return null;
    }

    const userId = user.id?.toString();
    const primaryRecruiterId =
      job.primary_recruiter_id?._id?.toString() ||
      job.primary_recruiter_id?.toString();
    const secondaryRecruiterIds =
      job.secondary_recruiter_id?.map(
        (recruiter) => recruiter._id?.toString() || recruiter?.toString()
      ) || [];

    if (userId === primaryRecruiterId) {
      return "primary";
    } else if (secondaryRecruiterIds.includes(userId)) {
      return "secondary";
    }
    return null; // No role assigned
  };

  // Helper function to check if current user is authorized for a job (can perform actions)
  const isAuthorizedForJob = (job) => {
    if (!job || !user) return false;

    // Managers and admins are always authorized
    if (user.role === "manager" || user.role === "admin") {
      return true;
    }

    // For recruiters, check if they are the primary recruiter or a secondary recruiter
    if (user.role === "recruiter") {
      const role = getRecruiterRole(job);
      return role === "primary" || role === "secondary";
    }

    return false;
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

  const handleJobClick = async (job, shouldNavigate = true) => {
    // Navigate to job URL if not already there
    if (shouldNavigate) {
      const role = user?.role || "recruiter";
      router.push(`/dashboard/${role}/top-applicants/${job._id}`);
    }

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

    // Check authorization - only primary recruiter can add secondary recruiters
    if (!isAuthorizedForJob(selectedJob)) {
      setNotification({
        variant: "error",
        title: "Not Authorized",
        message:
          "You are not authorized to manage recruiters for this job posting.",
        dismissible: true,
      });
      return;
    }

    // Additional check: only primary recruiter can add secondary recruiters
    const primaryRecruiterId =
      selectedJob.primary_recruiter_id?._id?.toString() ||
      selectedJob.primary_recruiter_id?.toString();
    const currentUserId = user.id?.toString();

    if (primaryRecruiterId !== currentUserId) {
      setNotification({
        variant: "error",
        title: "Not Authorized",
        message: "Only the primary recruiter can add secondary recruiters.",
        dismissible: true,
      });
      return;
    }

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

    // Check authorization - only primary recruiter can remove secondary recruiters
    if (!isAuthorizedForJob(selectedJob)) {
      setNotification({
        variant: "error",
        title: "Not Authorized",
        message:
          "You are not authorized to manage recruiters for this job posting.",
        dismissible: true,
      });
      return;
    }

    // Additional check: only primary recruiter can remove secondary recruiters
    const primaryRecruiterId =
      selectedJob.primary_recruiter_id?._id?.toString() ||
      selectedJob.primary_recruiter_id?.toString();
    const currentUserId = user.id?.toString();

    if (primaryRecruiterId !== currentUserId) {
      setNotification({
        variant: "error",
        title: "Not Authorized",
        message: "Only the primary recruiter can remove secondary recruiters.",
        dismissible: true,
      });
      return;
    }

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

    // Check authorization
    if (!isAuthorizedForJob(selectedJob)) {
      setNotification({
        variant: "error",
        title: "Not Authorized",
        message:
          "You are not authorized to schedule calls for this job posting.",
        dismissible: true,
      });
      return;
    }

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

    // Check authorization
    if (!isAuthorizedForJob(selectedJob)) {
      setNotification({
        variant: "error",
        title: "Not Authorized",
        message: "You are not authorized to stop calls for this job posting.",
        dismissible: true,
      });
      return;
    }

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

      // Remove all stopped candidates from scheduled set to allow rescheduling
      setCallStatuses((prev) => {
        const updated = new Map(prev);
        const stoppedCandidateIds = [];
        updated.forEach((status, candidateId) => {
          if (
            status.status === "stopped" ||
            status.status === "cancelled" ||
            status.status === "completed"
          ) {
            stoppedCandidateIds.push(candidateId);
          }
        });

        // Remove stopped candidates from scheduled set
        if (stoppedCandidateIds.length > 0) {
          setScheduledCandidateIds((prevSet) => {
            const updatedSet = new Set(prevSet);
            stoppedCandidateIds.forEach((id) => updatedSet.delete(id));
            return updatedSet;
          });
        }

        return updated;
      });

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
    const candidateIdStr = candidateId?.toString();

    // If no executionId, try to get it from callStatuses or API
    if (!executionId) {
      const callStatus = candidateIdStr
        ? callStatuses.get(candidateIdStr)
        : null;

      if (callStatus?.executionId) {
        executionId = callStatus.executionId;
      } else if (selectedJob?._id && candidateIdStr) {
        // Try to fetch call details from API if we have job and candidate ID
        try {
          const response = await bolnaAPI.getCallsByJob(selectedJob._id);
          const call = response.calls?.find(
            (c) => c.candidateId === candidateIdStr
          );
          if (call?.executionId) {
            executionId = call.executionId;
          } else {
            setNotification({
              variant: "info",
              title: "No Call Information",
              message: "No call information available for this candidate.",
              dismissible: true,
            });
            return;
          }
        } catch (err) {
          console.error("Error fetching call details:", err);
          setNotification({
            variant: "error",
            title: "Failed to Load Call Details",
            message:
              err.message || "Failed to load call details. Please try again.",
            dismissible: true,
          });
          return;
        }
      } else {
        setNotification({
          variant: "info",
          title: "No Call Information",
          message: "No call information available for this candidate.",
          dismissible: true,
        });
        return;
      }
    }

    // Now fetch and display the call details
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
        message:
          err.message || "Failed to load call details. Please try again.",
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

    // Check authorization
    if (!isAuthorizedForJob(selectedJob)) {
      setNotification({
        variant: "error",
        title: "Not Authorized",
        message: "You are not authorized to stop calls for this job posting.",
        dismissible: true,
      });
      return;
    }

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

      // Remove from scheduled candidates set to allow rescheduling
      setScheduledCandidateIds((prev) => {
        const updated = new Set(prev);
        const candidateIdStr = candidateId?.toString();
        if (candidateIdStr) {
          updated.delete(candidateIdStr);
        }
        return updated;
      });

      // Refresh call statuses and call details if dialog is open
      if (selectedJob?._id) {
        await fetchCallStatuses(selectedJob._id);
        if (
          callDetailsDialogOpen &&
          selectedCallDetails?.call?.executionId === executionId
        ) {
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

  // Schedule a single call for a candidate
  const handleScheduleSingleCall = async (candidate) => {
    if (!selectedJob || !candidate) return;

    // Check authorization
    if (!isAuthorizedForJob(selectedJob)) {
      setNotification({
        variant: "error",
        title: "Not Authorized",
        message:
          "You are not authorized to schedule calls for this job posting.",
        dismissible: true,
      });
      return;
    }

    // Check if candidate has phone number
    if (!candidate.phone_no) {
      setNotification({
        variant: "error",
        title: "No Phone Number",
        message: "This candidate does not have a phone number.",
        dismissible: true,
      });
      return;
    }

    const candidateId = candidate._id?.toString();
    if (!candidateId) return;

    try {
      setCallingCandidateId(candidateId);

      // Calculate scheduled time (5 minutes from now)
      const scheduledTime = new Date();
      scheduledTime.setMinutes(scheduledTime.getMinutes() + 5);

      // Prepare user_data
      const userData = {
        bio: candidate.bio || "",
        role: candidate.role?.join(", ") || "",
        experience: candidate.experience ? `${candidate.experience} years` : "",
      };

      // Schedule the call
      const callData = {
        candidateId,
        jobId: selectedJob._id,
        recipient_phone_number: candidate.phone_no,
        scheduled_at: scheduledTime.toISOString(),
        user_data: userData,
      };

      const response = await bolnaAPI.scheduleCall(callData);

      // Update scheduled candidates set
      setScheduledCandidateIds((prev) => {
        const updated = new Set(prev);
        updated.add(candidateId);
        return updated;
      });

      // Refresh call statuses
      if (selectedJob._id) {
        await fetchCallStatuses(selectedJob._id);
      }

      setNotification({
        variant: "success",
        title: "Call Scheduled",
        message: `Call scheduled successfully for ${
          candidate.name || "candidate"
        }.`,
        dismissible: true,
      });
    } catch (err) {
      console.error("Error scheduling call:", err);
      setNotification({
        variant: "error",
        title: "Failed to Schedule Call",
        message: err.message || "Failed to schedule call. Please try again.",
        dismissible: true,
      });
    } finally {
      setCallingCandidateId(null);
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
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className="hidden lg:block relative z-10">
        <Sidebar />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 bg-slate-950 text-slate-100 border-r border-slate-900"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Navbar
          title="Top Applicants"
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 bg-white">
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

              {/* Title */}
              {/* <div className="mb-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                  Top Applicants
                </h1>
              </div> */}

              {/* Search */}
              <div className="relative mb-6 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {!selectedJob ? (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold mb-1 text-slate-900">
                        {jobs.length}
                      </div>
                      <p className="text-sm text-slate-600">Total Jobs</p>
                    </div>
                    {user?.role === "recruiter" && (
                      <>
                        <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="text-3xl font-bold text-green-600 mb-1">
                            {
                              jobs.filter((j) => {
                                const role = getRecruiterRole(j);
                                return role === "primary";
                              }).length
                            }
                          </div>
                          <p className="text-sm text-slate-600">Your Jobs</p>
                        </div>
                        <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="text-3xl font-bold text-cyan-600 mb-1">
                            {
                              jobs.filter((j) => {
                                const role = getRecruiterRole(j);
                                return role === "secondary";
                              }).length
                            }
                          </div>
                          <p className="text-sm text-slate-600">
                            Secondary Jobs
                          </p>
                        </div>
                      </>
                    )}
                    {user?.role !== "recruiter" && (
                      <>
                        <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="text-3xl font-bold text-green-600 mb-1">
                            {jobs.length}
                          </div>
                          <p className="text-sm text-slate-600">All Jobs</p>
                        </div>
                        <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="text-3xl font-bold text-cyan-600 mb-1">
                            {jobs.length}
                          </div>
                          <p className="text-sm text-slate-600">Available</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Jobs Table */}
                  {filteredJobs.length > 0 ? (
                    <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-slate-300 bg-slate-50">
                              <th className="text-left p-4 font-semibold text-slate-800">
                                Job Role
                              </th>
                              <th className="text-left p-4 font-semibold text-slate-800">
                                Company Name
                              </th>
                              <th className="text-left p-4 font-semibold text-slate-800">
                                Job Type
                              </th>
                              <th className="text-left p-4 font-semibold text-slate-800">
                                Salary Range
                              </th>
                              {user?.role === "recruiter" && (
                                <th className="text-left p-4 font-semibold text-slate-800">
                                  Your Role
                                </th>
                              )}
                              <th className="text-right p-4 font-semibold text-slate-800">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredJobs.map((job) => (
                              <tr
                                key={job._id}
                                className="border-b border-slate-200 bg-white hover:bg-slate-50/80 transition-colors duration-150"
                              >
                                <td className="p-4">
                                  <div>
                                    <div className="font-semibold text-slate-900">
                                      {job.title}
                                    </div>
                                    {job.createdAt && (
                                      <div className="text-xs text-slate-500 mt-1">
                                        {new Date(
                                          job.createdAt
                                        ).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className="text-slate-700">
                                    {typeof job.company === "string"
                                      ? job.company
                                      : job.company?.name || "N/A"}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                    {job.job_type || "Full time"}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className="text-slate-700">
                                    {job.ctc || "Not specified"}
                                  </span>
                                </td>
                                {user?.role === "recruiter" && (
                                  <td className="p-4">
                                    {(() => {
                                      const role = getRecruiterRole(job);
                                      if (role === "primary") {
                                        return (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-600">
                                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                            Primary
                                          </span>
                                        );
                                      } else if (role === "secondary") {
                                        return (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                                            Secondary
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="text-xs text-slate-400 italic">
                                          Not assigned
                                        </span>
                                      );
                                    })()}
                                  </td>
                                )}
                                <td className="p-4">
                                  <div className="flex items-center justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleJobClick(job)}
                                      className="border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Top Candidates
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {filteredJobs.length === 0 && (
                    <div className="border border-slate-200 bg-white rounded-lg p-12 text-center">
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
                  <div className="border-slate-300 bg-white border rounded-lg p-6 mb-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2 text-slate-900">
                          {selectedJob.title}
                        </h2>
                        <p className="text-lg text-slate-600">
                          {selectedJob.company}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {/* Only show action buttons if user is authorized (Primary/Secondary recruiter) */}
                        {isAuthorizedForJob(selectedJob) && (
                          <>
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
                                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                              const scheduledCallsCount = Array.from(
                                callStatuses.values()
                              ).filter((status) => status.canStop).length;
                              return scheduledCallsCount > 0 ? (
                                <Button
                                  variant="outline"
                                  className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => setStopAllDialogOpen(true)}
                                  disabled={stoppingCalls}
                                >
                                  <StopCircle className="mr-2 h-4 w-4" />
                                  Stop All Calls ({scheduledCallsCount})
                                </Button>
                              ) : null;
                            })()}
                          </>
                        )}
                        <Button
                          variant="outline"
                          className="border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-900 transition-all duration-200 hover:shadow-sm"
                          onClick={() => {
                            const role = user?.role || "recruiter";
                            router.push(`/dashboard/${role}/top-applicants`);
                            setSelectedJob(null);
                            setCandidates([]);
                          }}
                        >
                          Back to Jobs
                        </Button>
                        <Button
                          variant="outline"
                          className="border-slate-300 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-cyan-500/20"
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
                              <label className="text-sm font-semibold text-slate-900 dark:text-white mb-2 block">
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
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white border border-slate-600 dark:border-slate-700 hover:from-slate-700 hover:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 hover:border-cyan-500/50 hover:shadow-md hover:shadow-cyan-500/20 transition-all duration-200 hover:scale-105"
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
                                          className="ml-1 hover:bg-red-500/20 hover:text-red-400 rounded-full p-0.5 transition-all duration-200 disabled:opacity-50 hover:scale-110"
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
                                <SelectTrigger className="w-full max-w-md border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200 hover:shadow-md hover:shadow-cyan-500/10">
                                  <SelectValue
                                    placeholder="Add Secondary Recruiter"
                                    className="text-slate-600"
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-300 shadow-xl text-slate-900">
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
                                        className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600 cursor-pointer transition-all duration-200 focus:bg-cyan-50 focus:text-cyan-600"
                                      >
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-slate-900" />
                                          <span className="text-slate-900">
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
                                    <div className="px-2 py-1.5 text-sm text-slate-600">
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
                    {/* Only show action buttons if user is authorized (Primary/Secondary recruiter) */}
                    {isAuthorizedForJob(selectedJob) && (
                      <>
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
                                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          const scheduledCallsCount = Array.from(
                            callStatuses.values()
                          ).filter((status) => status.canStop).length;
                          return scheduledCallsCount > 0 ? (
                            <Button
                              className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              variant="outline"
                              onClick={() => setStopAllDialogOpen(true)}
                              disabled={stoppingCalls}
                            >
                              <StopCircle className="mr-2 h-4 w-4" />
                              Stop All Calls ({scheduledCallsCount})
                            </Button>
                          ) : null;
                        })()}
                      </>
                    )}
                    <Button
                      className="w-full border-slate-300 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:shadow-cyan-500/20"
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
                    <div className="border-slate-300 bg-white border rounded-lg p-12 text-center shadow-sm">
                      <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-slate-400" />
                      <p className="text-slate-600">
                        Loading top candidates...
                      </p>
                    </div>
                  ) : candidates.length > 0 ? (
                    <>
                      <div className="mb-6">
                        <p className="text-sm text-slate-900">
                          Showing top {candidates.length} candidates sorted by
                          match score
                        </p>
                      </div>
                      <div className="border-slate-300 bg-white border rounded-lg overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 border-b-2 border-slate-300 hover:bg-slate-100">
                              <TableHead className="text-slate-900 font-semibold">
                                Candidate
                              </TableHead>
                              <TableHead className="text-slate-900 font-semibold">
                                Role
                              </TableHead>
                              <TableHead className="text-slate-900 font-semibold">
                                Match Score
                              </TableHead>
                              <TableHead className="text-slate-900 font-semibold">
                                Email
                              </TableHead>
                              <TableHead className="text-slate-900 font-semibold">
                                Phone
                              </TableHead>
                              <TableHead className="text-slate-900 font-semibold">
                                Experience
                              </TableHead>
                              <TableHead className="text-slate-900 font-semibold">
                                Status
                              </TableHead>
                              <TableHead className="text-center text-slate-900 font-semibold">
                                Call
                              </TableHead>
                              <TableHead className="text-right text-slate-900 font-semibold">
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

                              const candidateIdStr = candidate._id?.toString();
                              const isScheduled = scheduledCandidateIds.has(
                                candidateIdStr || ""
                              );
                              const callStatus = candidateIdStr
                                ? callStatuses.get(candidateIdStr)
                                : null;

                              // Check if call is actually active (not stopped/cancelled/completed)
                              const isCallActive =
                                callStatus &&
                                callStatus.status !== "stopped" &&
                                callStatus.status !== "cancelled" &&
                                callStatus.status !== "completed" &&
                                callStatus.status !== "failed";

                              return (
                                <TableRow
                                  key={candidate._id || index}
                                  className={`transition-all duration-200 border-b border-slate-200 ${
                                    isScheduled && isCallActive
                                      ? "bg-green-50"
                                      : "bg-white hover:bg-slate-50/80"
                                  } hover:shadow-sm cursor-pointer`}
                                >
                                  <TableCell className="text-slate-900">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 border-2 border-cyan-300/30">
                                        <span className="text-sm font-bold text-white">
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
                                  <TableCell className="text-slate-900">
                                    <div
                                      className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                                        match.matchScore || 0
                                      )}`}
                                    >
                                      {matchScore}%
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-900">
                                    {candidate.email ? (
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-slate-500" />
                                        <span className="text-sm text-slate-900">
                                          {candidate.email}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-slate-600">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-slate-900">
                                    {candidate.phone_no ? (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-slate-500" />
                                        <span className="text-sm text-slate-900">
                                          {candidate.phone_no}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-slate-600">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-slate-900">
                                    {candidate.experience !== undefined ? (
                                      <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-slate-500" />
                                        <span className="text-sm text-slate-900">
                                          {candidate.experience} years
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-slate-600">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-slate-900">
                                    {(() => {
                                      const candidateIdStr =
                                        candidate._id?.toString();
                                      const callStatus = candidateIdStr
                                        ? callStatuses.get(candidateIdStr)
                                        : null;

                                      if (isScheduled && callStatus) {
                                        const statusColors = {
                                          scheduled: "bg-blue-500",
                                          in_progress: "bg-yellow-500",
                                          completed: "bg-green-500",
                                          stopped: "bg-red-500",
                                          cancelled: "bg-gray-500",
                                          failed: "bg-red-600",
                                        };
                                        const statusColor =
                                          statusColors[
                                            callStatus.status?.toLowerCase()
                                          ] || "bg-blue-500";
                                        const statusText =
                                          callStatus.status || "Scheduled";

                                        return (
                                          <div
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusColor} text-white`}
                                          >
                                            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                            <span>{statusText}</span>
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
                                          <span className="text-sm text-slate-600">
                                            Not Scheduled
                                          </span>
                                        );
                                      }
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-center text-slate-900">
                                    {isAuthorizedForJob(selectedJob) ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleScheduleSingleCall(candidate)
                                        }
                                        disabled={
                                          callingCandidateId ===
                                            candidate._id?.toString() ||
                                          !candidate.phone_no ||
                                          isCallActive
                                        }
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={
                                          !candidate.phone_no
                                            ? "No phone number available"
                                            : isCallActive
                                            ? "Call already scheduled"
                                            : callStatus?.status ===
                                                "stopped" ||
                                              callStatus?.status ===
                                                "cancelled" ||
                                              callStatus?.status === "completed"
                                            ? "Schedule a new call for this candidate"
                                            : "Schedule a call for this candidate"
                                        }
                                      >
                                        {callingCandidateId ===
                                        candidate._id?.toString() ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <PhoneCall className="h-4 w-4" />
                                        )}
                                      </Button>
                                    ) : (
                                      <span className="text-sm text-slate-400">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-slate-900">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleViewProfile(candidate)
                                        }
                                        className="hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-600 transition-all duration-200 hover:scale-110"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      {/* Only show call-related actions if user is authorized (Primary/Secondary recruiter) */}
                                      {isAuthorizedForJob(selectedJob) &&
                                        (() => {
                                          const candidateIdStr =
                                            candidate._id?.toString();
                                          const callStatus = candidateIdStr
                                            ? callStatuses.get(candidateIdStr)
                                            : null;
                                          const isStopping =
                                            stoppingCallId ===
                                            callStatus?.executionId;

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
                                                className="bg-red-500 hover:bg-red-600 text-white transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-red-500/50"
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
                                                className="bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/50"
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
                                                className="bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/50"
                                                size="sm"
                                                onClick={() =>
                                                  handleViewCallDetails(
                                                    candidateIdStr
                                                  )
                                                }
                                                title="View call details"
                                              >
                                                <Calendar className="h-4 w-4" />
                                              </Button>
                                            );
                                          } else {
                                            return (
                                              <Button
                                                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/50"
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
                    <Card className="bg-green-50/80 dark:bg-green-950/30 backdrop-blur-sm border-green-200 dark:border-green-800 border-2 rounded-lg">
                      <CardContent className="pt-6 text-center">
                        <User className="h-12 w-12 mx-auto mb-4 text-green-500 dark:text-green-400" />
                        <p className="text-green-900 dark:text-green-100 mb-4 font-medium">
                          No candidates found for this job posting.
                        </p>
                        <Button
                          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/50"
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
              Are you sure you want to stop all scheduled calls for this job?
              This action cannot be undone.
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
                    The following {stoppableCalls.length} call(s) will be
                    stopped:
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
                              ? new Date(
                                  callStatus.callScheduledAt
                                ).toLocaleString()
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-300 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200">
                <Phone className="h-6 w-6 text-cyan-600" />
              </div>
              Call Details
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              View detailed information about the scheduled call
            </DialogDescription>
          </DialogHeader>

          {loadingCallDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
          ) : selectedCallDetails ? (
            <div className="space-y-6 mt-6">
              {/* Call Status */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Call Status
                  </h3>
                  <div
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
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
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Execution ID
                    </p>
                    <p className="text-sm font-mono text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200">
                      {selectedCallDetails.call?.executionId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Can Stop
                    </p>
                    <p className="text-sm">
                      {selectedCallDetails.call?.canStop ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-medium border border-green-200">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-medium border border-red-200">
                          No
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                  Schedule Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCallDetails.call?.callScheduledAt && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Calendar className="h-4 w-4 text-cyan-600" />
                        <p className="text-xs text-slate-600 font-medium">
                          Scheduled Time
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(
                          selectedCallDetails.call.callScheduledAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedCallDetails.call?.userScheduledAt && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Clock className="h-4 w-4 text-cyan-600" />
                        <p className="text-xs text-slate-600 font-medium">
                          User Scheduled Time
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(
                          selectedCallDetails.call.userScheduledAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedCallDetails.call?.createdAt && (
                    <div>
                      <p className="text-xs text-slate-600 mb-1.5 font-medium">
                        Created At
                      </p>
                      <p className="text-sm text-slate-900">
                        {new Date(
                          selectedCallDetails.call.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedCallDetails.call?.updatedAt && (
                    <div>
                      <p className="text-xs text-slate-600 mb-1.5 font-medium">
                        Last Updated
                      </p>
                      <p className="text-sm text-slate-900">
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
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                    Execution Details
                  </h3>
                  <div className="space-y-4">
                    {selectedCallDetails.execution.transcript && (
                      <div>
                        <p className="text-xs text-slate-600 mb-2 font-medium">
                          Transcript
                        </p>
                        <div className="p-4 bg-slate-50 rounded-lg text-sm max-h-40 overflow-y-auto border border-slate-200 text-slate-900">
                          {selectedCallDetails.execution.transcript}
                        </div>
                      </div>
                    )}
                    {selectedCallDetails.execution.duration && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1.5 font-medium">
                          Duration
                        </p>
                        <p className="text-sm text-slate-900 font-medium">
                          {selectedCallDetails.execution.duration} seconds
                        </p>
                      </div>
                    )}
                    {selectedCallDetails.execution.start_time && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1.5 font-medium">
                          Start Time
                        </p>
                        <p className="text-sm text-slate-900">
                          {new Date(
                            selectedCallDetails.execution.start_time
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedCallDetails.execution.end_time && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1.5 font-medium">
                          End Time
                        </p>
                        <p className="text-sm text-slate-900">
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
                  <div className="flex justify-end pt-4 border-t border-slate-200">
                    <Button
                      className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() =>
                        handleStopCall(
                          selectedCallDetails.call.executionId,
                          selectedCallDetails.call.candidateId
                        )
                      }
                      disabled={
                        stoppingCallId ===
                          selectedCallDetails.call.executionId ||
                        !isAuthorizedForJob(selectedJob)
                      }
                      title={
                        !isAuthorizedForJob(selectedJob)
                          ? "You are not authorized to stop calls for this job posting"
                          : ""
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
            <div className="py-8 text-center text-slate-600 dark:text-slate-400">
              No call details available
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Candidate Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-slate-300 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200">
                <User className="h-6 w-6 text-cyan-600" />
              </div>
              {selectedCandidate?.name || "Candidate Profile"}
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              {selectedCandidate?.email || "View full candidate details"}
            </DialogDescription>
          </DialogHeader>

          {loadingCandidateDetails ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
          ) : candidateDetails ? (
            <div className="space-y-6 mt-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-slate-200 bg-white">
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-2">
                    Name
                  </h3>
                  <p className="text-base text-slate-900 font-medium">
                    {candidateDetails.name || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-2">
                    Email
                  </h3>
                  <p className="text-base text-slate-900 font-medium">
                    {candidateDetails.email || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-2">
                    Phone
                  </h3>
                  <p className="text-base text-slate-900 font-medium">
                    {candidateDetails.phone_no || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-2">
                    Experience
                  </h3>
                  <p className="text-base text-slate-900 font-medium">
                    {candidateDetails.experience !== undefined
                      ? `${candidateDetails.experience} years`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-2">
                    Role
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidateDetails.role &&
                    candidateDetails.role.length > 0 ? (
                      candidateDetails.role.map((r, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-xs rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 font-medium"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-base text-slate-900">N/A</span>
                    )}
                  </div>
                </div>
                {candidateDetails.resume_url && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">
                      Resume
                    </h3>
                    <a
                      href={candidateDetails.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-base font-medium text-cyan-600 hover:text-cyan-700 hover:underline transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      View Resume
                    </a>
                  </div>
                )}
              </div>

              {/* Bio */}
              {candidateDetails.bio && (
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Bio
                  </h3>
                  <p className="text-base leading-relaxed text-slate-900">
                    {candidateDetails.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              {candidateDetails.skills &&
                candidateDetails.skills.length > 0 && (
                  <div className="p-5 rounded-xl border border-slate-200 bg-white">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {candidateDetails.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg border border-slate-300 font-medium shadow-sm"
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
                  <div className="p-5 rounded-xl border border-slate-200 bg-white">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      Social Links
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {candidateDetails.social_links.linkedin && (
                        <a
                          href={candidateDetails.social_links.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 font-medium transition-all duration-200 hover:shadow-sm"
                        >
                          <Briefcase className="h-4 w-4" />
                          LinkedIn
                        </a>
                      )}
                      {candidateDetails.social_links.github && (
                        <a
                          href={candidateDetails.social_links.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-medium transition-all duration-200 hover:shadow-sm"
                        >
                          <Briefcase className="h-4 w-4" />
                          GitHub
                        </a>
                      )}
                      {candidateDetails.social_links.portfolio && (
                        <a
                          href={candidateDetails.social_links.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 font-medium transition-all duration-200 hover:shadow-sm"
                        >
                          <Briefcase className="h-4 w-4" />
                          Portfolio
                        </a>
                      )}
                    </div>
                  </div>
                )}

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                {candidateDetails.is_active !== undefined && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">
                      Status
                    </h3>
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                        candidateDetails.is_active
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {candidateDetails.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                )}
                {candidateDetails.createdAt && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">
                      Created
                    </h3>
                    <p className="text-base text-slate-900">
                      {new Date(
                        candidateDetails.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-600">
              <p>No candidate details available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
