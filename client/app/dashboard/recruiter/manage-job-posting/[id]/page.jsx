"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loading from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { bolnaAPI, jobPostingAPI, matchingAPI, userAPI } from "@/lib/api";
import { formatFullDateTimeWithAMPM } from "@/lib/timeFormatter";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Globe,
  Loader2,
  Mail,
  Phone,
  PhoneCall,
  Users,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function RecruiterJobDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id;
  const { sidebarOpen, setSidebarOpen } = useSidebarState();

  const [jobPosting, setJobPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [applicants, setApplicants] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [loadingScreenings, setLoadingScreenings] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeType, setCloseType] = useState(null); // "permanent" or "temporary"
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [scheduledCandidateIds, setScheduledCandidateIds] = useState(new Set());
  const [callStatuses, setCallStatuses] = useState(new Map());
  const [callingCandidateId, setCallingCandidateId] = useState(null);
  const [callDetailsDialogOpen, setCallDetailsDialogOpen] = useState(false);
  const [selectedCallDetails, setSelectedCallDetails] = useState(null);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [recruiters, setRecruiters] = useState([]);
  const [loadingRecruiters, setLoadingRecruiters] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    company: "",
    role: [],
    ctc: "",
    exp_req: 0,
    job_type: "Full time",
    skills: "",
    secondary_recruiter_id: [],
  });

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && !["recruiter", "admin", "manager"].includes(user.role)) {
      router.push(`/dashboard/${user.role}`);
    } else if (user && jobId) {
      fetchJobPosting();
      if (user.role === "recruiter") {
        fetchRecruiters();
      }
    }
  }, [user, authLoading, jobId, router]);

  // Fetch applicants when job is open and applicants tab is active
  useEffect(() => {
    if (
      jobPosting &&
      jobPosting.status === "open" &&
      activeTab === "applicants" &&
      !loadingApplicants
    ) {
      console.log("useEffect triggered - fetching applicants", {
        status: jobPosting.status,
        activeTab,
        loadingApplicants,
        applicantsCount: applicants.length,
      });
      fetchApplicants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPosting?.status, activeTab]);

  useEffect(() => {
    if (jobPosting && activeTab === "screenings") {
      fetchScreenings();
    }
  }, [jobPosting, activeTab]);

  const fetchJobPosting = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await jobPostingAPI.getJobPostingById(jobId);

      // The API returns the job posting directly, not nested
      const jobData = response.jobPosting || response;

      // Ensure status is set (default to draft if missing)
      if (!jobData.status) {
        jobData.status = "draft";
      }

      setJobPosting(jobData);
      console.log("Fetched job posting:", {
        id: jobData._id,
        status: jobData.status,
        title: jobData.title,
        hasStatus: !!jobData.status,
        allKeys: Object.keys(jobData),
      });
    } catch (err) {
      console.error("Error fetching job posting:", err);
      setError(err.message || "Failed to load job posting");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async (forceFetch = false) => {
    // Allow force fetch even if status check fails (for status updates)
    if (!jobId) return;

    // Check status unless force fetch is requested
    if (!forceFetch && (!jobPosting || jobPosting.status !== "open")) {
      return;
    }

    try {
      setLoadingApplicants(true);
      // Refresh matches first
      await matchingAPI.refreshJobMatches(jobId);

      // Get top matches
      const response = await matchingAPI.getJobMatches(jobId);
      const sortedMatches = (response.matches || [])
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 10);

      console.log("Fetched applicants:", sortedMatches.length);
      setApplicants(sortedMatches);

      // Check scheduled calls for all applicants
      const candidateIds = sortedMatches
        .map((m) => m.candidateId?._id?.toString())
        .filter(Boolean);
      if (candidateIds.length > 0) {
        const statusMap = await checkScheduledCalls(candidateIds);
        // Update state for display
        setCallStatuses(statusMap);
        // Update scheduled candidate IDs
        const scheduledIds = new Set();
        statusMap.forEach((status, candidateId) => {
          if (status.status === "completed" || status.status === "scheduled") {
            scheduledIds.add(candidateId);
          }
        });
        setScheduledCandidateIds(scheduledIds);
      }
    } catch (err) {
      console.error("Error fetching applicants:", err);
      toast.error(err.message || "Failed to load applicants");
    } finally {
      setLoadingApplicants(false);
    }
  };

  const checkScheduledCalls = async (candidateIds) => {
    try {
      // Check scheduled calls
      const checkResponse = await bolnaAPI.checkCallsScheduled({
        jobId,
        candidateIds,
      });
      setScheduledCandidateIds(
        new Set(checkResponse.scheduledCandidates || [])
      );

      // Get call statuses using getCallsByJob
      const statusResponse = await bolnaAPI.getCallsByJob(jobId);
      const statusMap = new Map();

      if (statusResponse.calls) {
        statusResponse.calls.forEach((call) => {
          const candidateId = call.candidateId?.toString();
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
      }

      setCallStatuses(statusMap);
      return statusMap;
    } catch (err) {
      console.error("Error checking scheduled calls:", err);
      return new Map();
    }
  };

  const fetchScreenings = async () => {
    if (!jobPosting || jobPosting.status !== "open") {
      setScreenings([]);
      return;
    }

    try {
      setLoadingScreenings(true);
      // Get all matches
      const response = await matchingAPI.getJobMatches(jobId);
      const allMatches = response.matches || [];

      // Check which candidates have completed phone calls
      const candidateIds = allMatches
        .map((m) => m.candidateId?._id?.toString())
        .filter(Boolean);

      if (candidateIds.length > 0) {
        const statusMap = await checkScheduledCalls(candidateIds);

        // Filter candidates who have completed screening (status = "completed")
        const completedCandidates = allMatches.filter((match) => {
          const candidateId = match.candidateId?._id?.toString();
          if (!candidateId) return false;

          const callStatus = statusMap.get(candidateId);
          return callStatus && callStatus.status === "completed";
        });

        console.log("Fetched screenings:", completedCandidates.length);
        setScreenings(completedCandidates);
      } else {
        setScreenings([]);
      }
    } catch (err) {
      console.error("Error fetching screenings:", err);
      toast.error(err.message || "Failed to load screenings");
    } finally {
      setLoadingScreenings(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    // Check if user has edit access for status changes
    if (!canEdit) {
      toast.error(
        "You do not have permission to change the status of this job posting"
      );
      return;
    }

    if (newStatus === "closed") {
      setCloseDialogOpen(true);
      return;
    }

    // Prevent changing to draft after job has been opened or closed
    // Once a job is opened or closed, it cannot go back to draft
    if (newStatus === "draft") {
      const currentStatus = jobPosting?.status;
      if (currentStatus === "open" || currentStatus === "closed") {
        toast.error(
          "Cannot change status to Draft. Once a job is opened or closed, it cannot be set back to draft."
        );
        return;
      }
    }

    // When closed, can only go to open, not draft
    if (jobPosting?.status === "closed" && newStatus === "draft") {
      toast.error(
        "Cannot change status to Draft from Closed. You can only reopen the job (change to Open)."
      );
      return;
    }

    try {
      setUpdatingStatus(true);

      console.log("Updating status to:", newStatus);

      // Update the status in the backend
      const response = await jobPostingAPI.updateJobPosting(jobId, {
        status: newStatus,
      });

      console.log("Update response:", response);

      // Extract jobPosting from response
      let updatedJobPosting = response.jobPosting || response;

      // If status is not in the response, fetch fresh data
      if (!updatedJobPosting || !updatedJobPosting.status) {
        console.log("Status not in response, fetching fresh data...");
        const freshJobData = await jobPostingAPI.getJobPostingById(jobId);
        updatedJobPosting = freshJobData.jobPosting || freshJobData;
      }

      // Ensure status is set correctly
      if (updatedJobPosting && !updatedJobPosting.status) {
        updatedJobPosting.status = newStatus;
      }

      // Update the job posting state with the data
      setJobPosting(updatedJobPosting);

      console.log("Status updated:", {
        newStatus,
        updatedJobStatus: updatedJobPosting?.status,
        hasStatus: !!updatedJobPosting?.status,
        fullData: updatedJobPosting,
      });

      toast.success(`Job status updated to ${newStatus}`);

      // If opening, switch to applicants tab and fetch applicants
      if (newStatus === "open") {
        // Switch to applicants tab immediately
        setActiveTab("applicants");

        // Fetch applicants after a short delay to ensure state is updated
        setTimeout(async () => {
          try {
            setLoadingApplicants(true);
            // Refresh matches first
            await matchingAPI.refreshJobMatches(jobId);

            // Get top matches
            const matchesResponse = await matchingAPI.getJobMatches(jobId);
            const sortedMatches = (matchesResponse.matches || [])
              .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
              .slice(0, 10);

            console.log(
              "Fetched applicants after status change:",
              sortedMatches.length
            );
            setApplicants(sortedMatches);

            // Check scheduled calls for all applicants
            const candidateIds = sortedMatches
              .map((m) => m.candidateId?._id?.toString())
              .filter(Boolean);
            if (candidateIds.length > 0) {
              const statusMap = await checkScheduledCalls(candidateIds);
              setCallStatuses(statusMap);
              const scheduledIds = new Set();
              statusMap.forEach((status, candidateId) => {
                if (
                  status.status === "completed" ||
                  status.status === "scheduled"
                ) {
                  scheduledIds.add(candidateId);
                }
              });
              setScheduledCandidateIds(scheduledIds);
            }
          } catch (err) {
            console.error(
              "Error fetching applicants after status change:",
              err
            );
            toast.error(err.message || "Failed to load applicants");
          } finally {
            setLoadingApplicants(false);
          }
        }, 300);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error(err.message || "Failed to update job status");
      // Refresh job posting data on error to get current state
      await fetchJobPosting();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCloseJob = async () => {
    // Check if user has edit access
    if (!canEdit) {
      toast.error("You do not have permission to close this job posting");
      setCloseDialogOpen(false);
      setCloseType(null);
      return;
    }

    if (!closeType) {
      toast.error("Please select a close type");
      return;
    }

    try {
      setUpdatingStatus(true);

      if (closeType === "permanent") {
        // Permanently delete the job posting
        await jobPostingAPI.deleteJobPosting(jobId);
        toast.success("Job posting permanently deleted");
        // Redirect to job postings list based on user role
        const role = user?.role || "recruiter";
        router.push(`/dashboard/${role}/manage-job-posting`);
        return;
      } else {
        // Temporarily close (set status to closed)
        await jobPostingAPI.updateJobPosting(jobId, {
          status: "closed",
        });

        // Always fetch fresh data from database to ensure we have the latest status
        const freshJobData = await jobPostingAPI.getJobPostingById(jobId);
        const updatedJobPosting = freshJobData.jobPosting || freshJobData;

        // Update the job posting state with fresh data
        setJobPosting(updatedJobPosting);

        console.log("Job closed - updated status:", updatedJobPosting?.status);
        toast.success("Job marked as Closed (temporary)");
      }

      setCloseDialogOpen(false);
      setCloseType(null);
    } catch (err) {
      console.error("Error closing job:", err);
      toast.error(err.message || "Failed to close job");
      // Refresh job posting data on error to get current state
      await fetchJobPosting();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return "bg-green-500 text-white";
    if (score >= 0.6) return "bg-blue-500 text-white";
    if (score >= 0.4) return "bg-yellow-500 text-white";
    return "bg-gray-500 text-white";
  };

  // Parse transcript into structured format
  const parseTranscript = (transcriptText) => {
    if (!transcriptText || typeof transcriptText !== "string") {
      return [];
    }

    // Split by "assistant:" and "user:" markers (case-insensitive)
    const parts = transcriptText.split(/(?=assistant:|user:)/i);
    const messages = [];

    parts.forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;

      // Check if it starts with assistant or user
      if (trimmed.toLowerCase().startsWith("assistant:")) {
        const message = trimmed
          .substring(10) // Remove "assistant:"
          .trim();
        if (message) {
          messages.push({ speaker: "assistant", message });
        }
      } else if (trimmed.toLowerCase().startsWith("user:")) {
        const message = trimmed.substring(5).trim(); // Remove "user:"
        if (message) {
          messages.push({ speaker: "user", message });
        }
      }
    });

    return messages;
  };

  const handleScheduleSingleCall = async (candidate) => {
    if (!jobPosting || !candidate) return;

    // Check if job is closed
    if (currentStatus === "closed") {
      toast.error("Cannot make calls for a closed job posting");
      return;
    }

    // Check if user can make calls (only recruiters can make calls)
    if (!canCall) {
      toast.error(
        "You do not have permission to make calls for this job posting. Only recruiters can make calls."
      );
      return;
    }

    // Check if candidate has phone number
    if (!candidate.phone_no) {
      toast.error("This candidate does not have a phone number.");
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
        jobId: jobPosting._id,
        recipient_phone_number: candidate.phone_no,
        scheduled_at: scheduledTime.toISOString(),
        user_data: userData,
      };

      await bolnaAPI.scheduleCall(callData);

      toast.success("Call scheduled successfully!");

      // Refresh call statuses
      const candidateIds = applicants
        .map((m) => m.candidateId?._id?.toString())
        .filter(Boolean);
      if (candidateIds.length > 0) {
        await checkScheduledCalls(candidateIds);
      }
    } catch (err) {
      console.error("Error scheduling call:", err);
      toast.error(err.message || "Failed to schedule call");
    } finally {
      setCallingCandidateId(null);
    }
  };

  const handleViewProfile = (candidate) => {
    // Navigate to candidate profile or open a dialog
    router.push(`/dashboard/recruiter/candidate/${candidate._id}`);
  };

  const handleEdit = () => {
    if (!jobPosting) return;

    if (currentStatus === "closed") {
      toast.error("Cannot edit a closed job posting");
      return;
    }

    if (!canEdit) {
      toast.error("You do not have permission to edit this job posting");
      return;
    }

    // Extract secondary recruiter IDs
    const secondaryIds = jobPosting.secondary_recruiter_id
      ? Array.isArray(jobPosting.secondary_recruiter_id)
        ? jobPosting.secondary_recruiter_id.map((r) =>
            r._id ? r._id.toString() : r.toString()
          )
        : []
      : [];

    setJobForm({
      title: jobPosting.title || "",
      description: jobPosting.description || "",
      company: jobPosting.company || "",
      role: jobPosting.role || [],
      ctc: jobPosting.ctc || "",
      exp_req: jobPosting.exp_req || 0,
      job_type: jobPosting.job_type || "Full time",
      skills: (jobPosting.skills || []).join(", "),
      secondary_recruiter_id: secondaryIds,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateJob = async () => {
    try {
      const skillsArray = jobForm.skills
        ? jobForm.skills
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : [];

      const jobData = {
        title: jobForm.title,
        description: jobForm.description,
        company: jobForm.company,
        role: jobForm.role,
        ctc: jobForm.ctc || undefined,
        exp_req: jobForm.exp_req || 0,
        job_type: jobForm.job_type || "Full time",
        skills: skillsArray,
        secondary_recruiter_id: jobForm.secondary_recruiter_id || [],
      };

      await jobPostingAPI.updateJobPosting(jobId, jobData);
      setEditDialogOpen(false);
      await fetchJobPosting(); // Refresh the job posting
      toast.success("Job posting updated successfully!");
    } catch (err) {
      console.error("Error updating job posting:", err);
      toast.error(err.message || "Failed to update job posting");
    }
  };

  const handleViewCallDetails = async (candidateId, executionId) => {
    const candidateIdStr = candidateId?.toString();

    // If no executionId, try to get it from callStatuses
    if (!executionId) {
      const callStatus = candidateIdStr
        ? callStatuses.get(candidateIdStr)
        : null;

      if (callStatus?.executionId) {
        executionId = callStatus.executionId;
      } else if (jobId && candidateIdStr) {
        // Try to fetch call details from API if we have job and candidate ID
        try {
          const response = await bolnaAPI.getCallsByJob(jobId);
          const call = response.calls?.find(
            (c) => c.candidateId === candidateIdStr
          );
          if (call?.executionId) {
            executionId = call.executionId;
          } else {
            toast.error("No call information available for this candidate.");
            return;
          }
        } catch (err) {
          console.error("Error fetching call details:", err);
          toast.error(err.message || "Failed to load call details.");
          return;
        }
      } else {
        toast.error("No call information available for this candidate.");
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
      toast.error(err.message || "Failed to load call details.");
      setCallDetailsDialogOpen(false);
    } finally {
      setLoadingCallDetails(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
        <GlassBackground />
        <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden items-center justify-center">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  if (error || !jobPosting) {
    return (
      <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
        <GlassBackground />
        <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden items-center justify-center p-8">
          <Card className="max-w-md border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
            <CardContent className="pt-6 text-center">
              <p className="text-red-900">{error || "Job posting not found"}</p>
              <Button
                className="mt-4"
                onClick={() => {
                  const role = user?.role || "recruiter";
                  router.push(`/dashboard/${role}/manage-job-posting`);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Job Postings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determine current status for display - always use the status from jobPosting state
  const getCurrentStatus = () => {
    if (!jobPosting) return "draft";
    // Return the status directly from the job posting
    // Ensure we always have a valid status
    const status = jobPosting.status;
    if (status === "draft" || status === "open" || status === "closed") {
      return status;
    }
    // Default to draft if status is invalid or missing
    return "draft";
  };

  const currentStatus = getCurrentStatus();
  const statusOptions = [
    { value: "draft", label: "Draft", color: "bg-gray-500" },
    { value: "open", label: "Open", color: "bg-blue-500" },
    { value: "closed", label: "Closed", color: "bg-red-500" },
  ];

  // Check if current user has edit access
  // Admin and Manager can edit all job postings
  // Recruiters can only edit their own (primary or secondary)
  const hasEditAccess = () => {
    if (!jobPosting || !user) return false;

    // Admin and Manager can edit all job postings
    if (user.role === "admin" || user.role === "manager") {
      return true;
    }

    // For recruiters, check if they are primary or secondary recruiter
    if (user.role === "recruiter") {
      const userIdStr = user.id?.toString() || user._id?.toString();
      if (!userIdStr) return false;

      // Check if user is primary recruiter
      const primaryRecruiterId =
        jobPosting.primary_recruiter_id?._id?.toString() ||
        jobPosting.primary_recruiter_id?.toString();
      if (primaryRecruiterId === userIdStr) return true;

      // Check if user is secondary recruiter
      if (
        jobPosting.secondary_recruiter_id &&
        Array.isArray(jobPosting.secondary_recruiter_id)
      ) {
        const isSecondary = jobPosting.secondary_recruiter_id.some(
          (recruiter) =>
            (recruiter._id?.toString() || recruiter.toString()) === userIdStr
        );
        if (isSecondary) return true;
      }
    }

    return false;
  };

  // Check if current user can make calls
  // Only recruiters (primary or secondary) can make calls
  // Admin and Manager cannot make calls
  const canMakeCalls = () => {
    if (!jobPosting || !user) return false;

    // Admin and Manager cannot make calls
    if (user.role === "admin" || user.role === "manager") {
      return false;
    }

    // Only recruiters can make calls
    if (user.role === "recruiter") {
      const userIdStr = user.id?.toString() || user._id?.toString();
      if (!userIdStr) return false;

      // Check if user is primary recruiter
      const primaryRecruiterId =
        jobPosting.primary_recruiter_id?._id?.toString() ||
        jobPosting.primary_recruiter_id?.toString();
      if (primaryRecruiterId === userIdStr) return true;

      // Check if user is secondary recruiter
      if (
        jobPosting.secondary_recruiter_id &&
        Array.isArray(jobPosting.secondary_recruiter_id)
      ) {
        const isSecondary = jobPosting.secondary_recruiter_id.some(
          (recruiter) =>
            (recruiter._id?.toString() || recruiter.toString()) === userIdStr
        );
        if (isSecondary) return true;
      }
    }

    return false;
  };

  const canEdit = hasEditAccess();
  const canCall = canMakeCalls();

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
      <GlassBackground />
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Navbar
          title=""
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <Button
              variant="outline"
              className="mb-4 cursor-pointer rounded-full border-white/70 bg-white/80 backdrop-blur-xl shadow-sm hover:shadow-md hover:bg-white"
              onClick={() => {
                const role = user?.role || "recruiter";
                router.push(`/dashboard/${role}/manage-job-posting`);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Job Postings
            </Button>

            {/* Job Header */}
            <div className="mb-6 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.25)] p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4 flex-1">
                  <Briefcase className="h-8 w-8 text-slate-700" />
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                      {jobPosting.title}
                    </h1>
                    <p className="text-slate-600 mt-1">{jobPosting.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      canEdit && currentStatus !== "closed"
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-50"
                    }
                    onClick={handleEdit}
                    disabled={!canEdit || currentStatus === "closed"}
                    title={
                      currentStatus === "closed"
                        ? "Cannot edit a closed job posting"
                        : !canEdit
                        ? "You do not have permission to edit this job posting"
                        : ""
                    }
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {jobPosting?.status === "draft" ? (
                    <Button
                      size="sm"
                      className={
                        canEdit
                          ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          : "bg-blue-600 hover:bg-blue-700 text-white cursor-not-allowed opacity-50"
                      }
                      onClick={() => handleStatusChange("open")}
                      disabled={!canEdit || updatingStatus}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Post Job
                    </Button>
                  ) : jobPosting?.status === "open" ? (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Posted
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    Department
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {jobPosting.role?.join(", ") || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    Account
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {jobPosting.company}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    Target Date
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {jobPosting.target_date || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    CTC Range
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {jobPosting.ctc || "N/A"}
                  </p>
                </div>
              </div>

              {/* Status Workflow Tabs */}
              <div className="mb-6">
                <div className="inline-flex gap-2 bg-slate-100/70 border border-white/70 p-1 rounded-full shadow-inner shadow-white/50">
                  {statusOptions.map((option) => {
                    // Disable Draft button when job is open or closed
                    // Once a job is opened or closed, it cannot go back to draft
                    const isDraftDisabled =
                      option.value === "draft" &&
                      (currentStatus === "open" || currentStatus === "closed");

                    // Disable all status buttons if user doesn't have edit access
                    // Admin and Manager can change status, recruiters need edit access
                    const isDisabled =
                      !canEdit || updatingStatus || isDraftDisabled;

                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          if (option.value === "closed") {
                            handleStatusChange("closed");
                          } else {
                            handleStatusChange(option.value);
                          }
                        }}
                        disabled={isDisabled}
                        className={`px-6 py-2.5 text-sm font-medium transition-all duration-200 rounded-full ${
                          isDisabled
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer"
                        } ${
                          currentStatus === option.value
                            ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                        title={
                          isDraftDisabled
                            ? "Cannot change to Draft after job has been opened or closed"
                            : isDisabled && !canEdit
                            ? "You do not have permission to change status"
                            : ""
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-slate-600 mt-3">
                  Status:{" "}
                  <span className="font-semibold capitalize">
                    {currentStatus.replace("-", " ")}
                  </span>
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex mb-4">
              <div className="inline-flex rounded-full bg-slate-100/70 border border-white/70 p-1 shadow-inner shadow-white/40">
                {[
                  { id: "details", label: "Details" },
                  { id: "applicants", label: "Applicants" },
                  { id: "screenings", label: "Screenings" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "details" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Title
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {jobPosting.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Department
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {jobPosting.role?.join(", ") || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Experience Required
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {jobPosting.exp_req || 0} Years
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Visa Sponsorship
                      </p>
                      <p className="text-sm font-medium text-slate-900">Yes</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-2">
                      Skills Matrix
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {jobPosting.skills?.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "applicants" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle>AI Candidate Matches</CardTitle>
                </CardHeader>
                <CardContent>
                  {!jobPosting || jobPosting.status !== "open" ? (
                    <p className="text-center py-8 text-slate-500">
                      Please open the job to view applicants
                    </p>
                  ) : loadingApplicants ? (
                    <div className="text-center py-8">
                      <Loading />
                    </div>
                  ) : applicants.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      No applicants found
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Match %</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Call</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applicants.map((match, index) => {
                          const candidate = match.candidateId;
                          if (!candidate) return null;

                          const matchScore = Math.round(
                            (match.matchScore || 0) * 100
                          );
                          const candidateId = candidate._id?.toString();
                          const isScheduled =
                            scheduledCandidateIds.has(candidateId);
                          const callStatus = callStatuses.get(candidateId);

                          const handleRowClick = (e) => {
                            // Don't navigate if clicking on a button or interactive element
                            if (
                              e.target.closest("button") ||
                              e.target.closest("a") ||
                              e.target.closest('[role="button"]')
                            ) {
                              return;
                            }
                            const role = user?.role || "recruiter";
                            router.push(
                              `/dashboard/${role}/manage-job-posting/${jobId}/candidate/${candidateId}`
                            );
                          };

                          return (
                            <TableRow
                              key={candidate._id || index}
                              onClick={handleRowClick}
                              className="cursor-pointer hover:bg-slate-50/50 transition-colors"
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
                                    <p className="font-medium text-slate-900">
                                      {candidate.name || "Unknown"}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {candidate.role?.join(", ") || "N/A"}
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
                                    <span className="text-sm">
                                      {candidate.email}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-600">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {candidate.phone_no ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm">
                                      {candidate.phone_no}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-600">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {candidate.experience !== undefined ? (
                                  <span className="text-sm">
                                    {candidate.experience} years
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-600">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {callStatus &&
                                callStatus.status === "completed" ? (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Completed
                                  </div>
                                ) : isScheduled ? (
                                  <span className="text-sm text-slate-600">
                                    Scheduled
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-600">
                                    Not Scheduled
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleScheduleSingleCall(candidate)
                                  }
                                  disabled={
                                    !canCall ||
                                    currentStatus === "closed" ||
                                    callingCandidateId === candidateId ||
                                    !candidate.phone_no ||
                                    (callStatus &&
                                      callStatus.status === "completed")
                                  }
                                  className="bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={
                                    currentStatus === "closed"
                                      ? "Cannot make calls for a closed job posting"
                                      : !canCall
                                      ? "You do not have permission to make calls. Only recruiters can make calls."
                                      : !candidate.phone_no
                                      ? "No phone number available"
                                      : callStatus &&
                                        callStatus.status === "completed"
                                      ? "Call already completed"
                                      : "Schedule a call for this candidate"
                                  }
                                >
                                  {callingCandidateId === candidateId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <PhoneCall className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "screenings" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle>Completed Screenings</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingScreenings ? (
                    <div className="text-center py-8">
                      <Loading />
                    </div>
                  ) : screenings.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      No candidates have completed screening yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Match %</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Call Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {screenings.map((match, index) => {
                          const candidate = match.candidateId;
                          if (!candidate) return null;

                          const matchScore = Math.round(
                            (match.matchScore || 0) * 100
                          );
                          const candidateId = candidate._id?.toString();
                          const callStatus = callStatuses.get(candidateId);

                          return (
                            <TableRow key={candidate._id || index}>
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
                                    <p className="font-medium text-slate-900">
                                      {candidate.name || "Unknown"}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {candidate.role?.join(", ") || "N/A"}
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
                                    <span className="text-sm">
                                      {candidate.email}
                                    </span>
                                  </div>
                                ) : (
                                  "N/A"
                                )}
                              </TableCell>
                              <TableCell>
                                {candidate.phone_no ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm">
                                      {candidate.phone_no}
                                    </span>
                                  </div>
                                ) : (
                                  "N/A"
                                )}
                              </TableCell>
                              <TableCell>
                                {callStatus &&
                                callStatus.status === "completed" ? (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Completed
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-600">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {callStatus &&
                                (callStatus.callScheduledAt ||
                                  callStatus.userScheduledAt ||
                                  callStatus.executionId) ? (
                                  <button
                                    onClick={() =>
                                      handleViewCallDetails(
                                        candidateId,
                                        callStatus.executionId
                                      )
                                    }
                                    className="flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
                                    title="View call details"
                                  >
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                  </button>
                                ) : (
                                  <span className="text-sm text-slate-600">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Call Details Dialog */}
      <Dialog
        open={callDetailsDialogOpen}
        onOpenChange={setCallDetailsDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 border-white/70 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
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
                <div>
                  <p className="text-xs text-slate-600 mb-1.5 font-medium">
                    Execution ID
                  </p>
                  <p className="text-sm font-mono text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    {selectedCallDetails.call?.executionId || "N/A"}
                  </p>
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
                        {formatFullDateTimeWithAMPM(
                          selectedCallDetails.call.callScheduledAt
                        )}
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
                        {formatFullDateTimeWithAMPM(
                          selectedCallDetails.call.userScheduledAt
                        )}
                      </p>
                    </div>
                  )}
                  {selectedCallDetails.call?.createdAt && (
                    <div>
                      <p className="text-xs text-slate-600 mb-1.5 font-medium">
                        Created At
                      </p>
                      <p className="text-sm text-slate-900">
                        {formatFullDateTimeWithAMPM(
                          selectedCallDetails.call.createdAt
                        )}
                      </p>
                    </div>
                  )}
                  {selectedCallDetails.call?.updatedAt && (
                    <div>
                      <p className="text-xs text-slate-600 mb-1.5 font-medium">
                        Last Updated
                      </p>
                      <p className="text-sm text-slate-900">
                        {formatFullDateTimeWithAMPM(
                          selectedCallDetails.call.updatedAt
                        )}
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
                        <div className="p-4 bg-slate-50 rounded-lg text-sm max-h-60 overflow-y-auto border border-slate-200">
                          <div className="space-y-3">
                            {parseTranscript(
                              selectedCallDetails.execution.transcript
                            ).map((item, index) => (
                              <div
                                key={index}
                                className={`flex gap-3 ${
                                  item.speaker === "assistant"
                                    ? "justify-start"
                                    : "justify-end"
                                }`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                    item.speaker === "assistant"
                                      ? "bg-blue-100 text-blue-900"
                                      : "bg-green-100 text-green-900"
                                  }`}
                                >
                                  <p className="text-xs font-semibold mb-1 uppercase">
                                    {item.speaker === "assistant"
                                      ? "Assistant"
                                      : "User"}
                                  </p>
                                  <p className="text-sm whitespace-pre-wrap">
                                    {item.message}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
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
                          {formatFullDateTimeWithAMPM(
                            selectedCallDetails.execution.start_time
                          )}
                        </p>
                      </div>
                    )}
                    {selectedCallDetails.execution.end_time && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1.5 font-medium">
                          End Time
                        </p>
                        <p className="text-sm text-slate-900">
                          {formatFullDateTimeWithAMPM(
                            selectedCallDetails.execution.end_time
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No call details available
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Job Posting Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            // Reset form when closing
            setJobForm({
              title: "",
              description: "",
              company: "",
              role: [],
              ctc: "",
              exp_req: 0,
              job_type: "Full time",
              skills: "",
              secondary_recruiter_id: [],
            });
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 border-white/70 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Edit Job Posting
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-1">
              Update the job posting details below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-900 font-medium">
                  Job Title *
                </Label>
                <Input
                  id="title"
                  value={jobForm.title}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, title: e.target.value })
                  }
                  placeholder="e.g., Senior Software Engineer"
                  className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-slate-900 font-medium">
                  Company *
                </Label>
                <Input
                  id="company"
                  value={jobForm.company}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, company: e.target.value })
                  }
                  placeholder="Company name"
                  className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-slate-900 font-medium"
              >
                Job Description *
              </Label>
              <textarea
                id="description"
                value={jobForm.description}
                onChange={(e) =>
                  setJobForm({ ...jobForm, description: e.target.value })
                }
                className="w-full min-h-[100px] px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200 resize-none"
                placeholder="Describe the role, responsibilities, and company culture..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-slate-900 font-medium">
                  Role
                </Label>
                <Select
                  value={jobForm.role.length > 0 ? jobForm.role[0] : ""}
                  onValueChange={(value) => {
                    if (value && !jobForm.role.includes(value)) {
                      setJobForm({
                        ...jobForm,
                        role: [...jobForm.role, value],
                      });
                    }
                  }}
                >
                  <SelectTrigger className="border-slate-200 bg-white text-slate-900 hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem
                      value="SDET"
                      className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600"
                    >
                      SDET
                    </SelectItem>
                    <SelectItem
                      value="QA"
                      className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600"
                    >
                      QA
                    </SelectItem>
                    <SelectItem
                      value="DevOps"
                      className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600"
                    >
                      DevOps
                    </SelectItem>
                    <SelectItem
                      value="Frontend"
                      className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600"
                    >
                      Frontend
                    </SelectItem>
                    <SelectItem
                      value="Backend"
                      className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600"
                    >
                      Backend
                    </SelectItem>
                    <SelectItem
                      value="Full-stack"
                      className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600"
                    >
                      Full-stack
                    </SelectItem>
                  </SelectContent>
                </Select>
                {jobForm.role.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {jobForm.role.map((r, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {r}
                        <button
                          type="button"
                          onClick={() => {
                            setJobForm({
                              ...jobForm,
                              role: jobForm.role.filter((_, i) => i !== idx),
                            });
                          }}
                          className="hover:text-red-500 transition-colors"
                          title="Remove role"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctc" className="text-slate-900 font-medium">
                  CTC
                </Label>
                <Input
                  id="ctc"
                  value={jobForm.ctc}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, ctc: e.target.value })
                  }
                  placeholder="e.g., 10-15 LPA"
                  className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exp_req" className="text-slate-900 font-medium">
                  Experience Required (years)
                </Label>
                <Input
                  id="exp_req"
                  type="number"
                  min="0"
                  value={jobForm.exp_req}
                  onChange={(e) =>
                    setJobForm({
                      ...jobForm,
                      exp_req: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="job_type"
                  className="text-slate-900 font-medium"
                >
                  Job Type
                </Label>
                <Select
                  value={jobForm.job_type}
                  onValueChange={(value) =>
                    setJobForm({ ...jobForm, job_type: value })
                  }
                >
                  <SelectTrigger className="border-slate-200 bg-white text-slate-900 hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem
                      value="Full time"
                      className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600"
                    >
                      Full time
                    </SelectItem>
                    <SelectItem
                      value="Internship"
                      className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600"
                    >
                      Internship
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills" className="text-slate-900 font-medium">
                Skills (comma-separated)
              </Label>
              <Input
                id="skills"
                value={jobForm.skills}
                onChange={(e) =>
                  setJobForm({ ...jobForm, skills: e.target.value })
                }
                placeholder="e.g., React, Node.js, TypeScript"
                className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
              />
            </div>

            {/* Secondary Recruiters - Only show for recruiters */}
            {user?.role === "recruiter" && (
              <div className="space-y-3">
                <Label
                  htmlFor="secondary_recruiters"
                  className="text-slate-900 font-medium block"
                >
                  Secondary Recruiters
                </Label>
                <Select
                  onValueChange={(value) => {
                    if (
                      value &&
                      value !== "no-recruiters" &&
                      !jobForm.secondary_recruiter_id.includes(value)
                    ) {
                      setJobForm({
                        ...jobForm,
                        secondary_recruiter_id: [
                          ...jobForm.secondary_recruiter_id,
                          value,
                        ],
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-full border-slate-200 bg-white text-slate-900 hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200">
                    <SelectValue placeholder="Select recruiters to add" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto bg-white border-slate-200">
                    {recruiters.length > 0 ? (
                      recruiters
                        .filter((recruiter) => {
                          const recruiterIdStr =
                            recruiter._id?.toString() ||
                            recruiter.id?.toString();
                          const primaryRecruiterId =
                            jobPosting?.primary_recruiter_id?._id?.toString() ||
                            jobPosting?.primary_recruiter_id?.toString();
                          return (
                            recruiterIdStr !== user.id?.toString() &&
                            recruiterIdStr !== primaryRecruiterId &&
                            !jobForm.secondary_recruiter_id.includes(
                              recruiterIdStr
                            )
                          );
                        })
                        .map((recruiter) => (
                          <SelectItem
                            key={recruiter._id || recruiter.id}
                            value={
                              recruiter._id?.toString() ||
                              recruiter.id?.toString()
                            }
                            className="text-slate-900 hover:bg-cyan-50 hover:text-cyan-600"
                          >
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-500" />
                              <span>{recruiter.name}</span>
                              <span className="text-xs text-slate-500">
                                ({recruiter.email})
                              </span>
                            </div>
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="no-recruiters" disabled>
                        {loadingRecruiters
                          ? "Loading recruiters..."
                          : "No recruiters available"}
                      </SelectItem>
                    )}
                    {recruiters.filter((recruiter) => {
                      const recruiterIdStr =
                        recruiter._id?.toString() || recruiter.id?.toString();
                      const primaryRecruiterId =
                        jobPosting?.primary_recruiter_id?._id?.toString() ||
                        jobPosting?.primary_recruiter_id?.toString();
                      return (
                        recruiterIdStr !== user.id?.toString() &&
                        recruiterIdStr !== primaryRecruiterId &&
                        !jobForm.secondary_recruiter_id.includes(recruiterIdStr)
                      );
                    }).length === 0 &&
                      recruiters.length > 0 && (
                        <SelectItem value="no-recruiters" disabled>
                          No other recruiters available
                        </SelectItem>
                      )}
                  </SelectContent>
                </Select>
                {jobForm.secondary_recruiter_id.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {jobForm.secondary_recruiter_id.map((recruiterId) => {
                      const recruiter = recruiters.find(
                        (r) =>
                          (r._id?.toString() || r.id?.toString()) ===
                          recruiterId
                      );
                      return (
                        <span
                          key={recruiterId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {recruiter?.name || recruiterId}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setJobForm({
                                ...jobForm,
                                secondary_recruiter_id:
                                  jobForm.secondary_recruiter_id.filter(
                                    (id) => id !== recruiterId
                                  ),
                              });
                            }}
                            className="ml-1 hover:bg-cyan-100 rounded-full p-0.5 transition-colors"
                            title="Remove recruiter"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setJobForm({
                  title: "",
                  description: "",
                  company: "",
                  role: [],
                  ctc: "",
                  exp_req: 0,
                  job_type: "Full time",
                  skills: "",
                  secondary_recruiter_id: [],
                });
              }}
              className="border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              className="bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300"
              onClick={handleUpdateJob}
            >
              Update Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Job Confirmation Dialog */}
      <Dialog
        open={closeDialogOpen}
        onOpenChange={(open) => {
          setCloseDialogOpen(open);
          if (!open) {
            setCloseType(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Job Posting</DialogTitle>
            <DialogDescription>
              How would you like to close this job posting?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="closeType"
                  value="temporary"
                  checked={closeType === "temporary"}
                  onChange={(e) => setCloseType(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    Temporarily Close
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    The job posting will be marked as closed. All actions
                    (calling, editing) will be disabled, but you can reopen it
                    later by changing the status to "Open".
                  </div>
                </div>
              </label>
              <label className="flex items-start space-x-3 p-4 border border-red-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                <input
                  type="radio"
                  name="closeType"
                  value="permanent"
                  checked={closeType === "permanent"}
                  onChange={(e) => setCloseType(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-red-900">
                    Permanently Delete
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    The job posting will be permanently deleted from the
                    database. This action cannot be undone.
                  </div>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCloseDialogOpen(false);
                setCloseType(null);
              }}
              disabled={updatingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloseJob}
              disabled={updatingStatus || !closeType}
              className={
                closeType === "permanent"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-orange-600 hover:bg-orange-700 text-white"
              }
            >
              {closeType === "permanent"
                ? "Delete Permanently"
                : "Close Temporarily"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
