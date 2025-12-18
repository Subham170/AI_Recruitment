"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import RecruiterAvailability from "@/components/RecruiterAvailability";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  bolnaAPI,
  calcomCredentialsAPI,
  candidateAPI,
  candidateProgressAPI,
  jobPostingAPI,
  matchingAPI,
  recruiterAvailabilityAPI,
  resumeParserAPI,
  userAPI,
} from "@/lib/api";
import {
  convert24To12Hour,
  formatFullDateTimeWithAMPM,
} from "@/lib/timeFormatter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  FileText,
  Globe,
  Loader2,
  Mail,
  Phone,
  PhoneCall,
  Plus,
  Square,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  
  // Initialize activeTab from localStorage synchronously to prevent reset
  const getInitialTab = () => {
    if (typeof window !== "undefined" && jobId) {
      const stored = localStorage.getItem(`job-posting-tab-${jobId}`);
      const validTabs = ["details", "ai-match", "applicants", "screenings", "interviews", "offers", "rejected"];
      if (stored && validTabs.includes(stored)) {
        return stored;
      }
    }
    return "details";
  };
  
  const [activeTab, setActiveTab] = useState(() => getInitialTab());
  const isInitialMount = useRef(true);
  const hasLoadedFromStorage = useRef(false);
  
  // Load saved tab from localStorage when component mounts or jobId changes
  // This runs first to ensure we have the correct tab before any saves happen
  useEffect(() => {
    if (typeof window !== "undefined" && jobId) {
      const stored = localStorage.getItem(`job-posting-tab-${jobId}`);
      const validTabs = ["details", "ai-match", "applicants", "screenings", "interviews", "offers", "rejected"];
      
      // Mark as loaded immediately to prevent save useEffect from running prematurely
      hasLoadedFromStorage.current = true;
      
      if (stored && validTabs.includes(stored)) {
        // Only update if different from current to avoid unnecessary re-renders
        if (stored !== activeTab) {
          setActiveTab(stored);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]); // Only depend on jobId - this ensures it runs when navigating back
  
  // Save activeTab to localStorage whenever it changes (but skip on initial mount)
  useEffect(() => {
    // Skip saving on initial mount to prevent overwriting with default "details"
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Only save after we've loaded from storage to prevent race conditions
    if (typeof window !== "undefined" && jobId && activeTab && hasLoadedFromStorage.current) {
      const stored = localStorage.getItem(`job-posting-tab-${jobId}`);
      
      // Prevent overwriting a stored non-default value with "details" on remount
      // This protects against race conditions where "details" might be saved before the stored value loads
      if (stored && stored !== "details" && activeTab === "details") {
        // Don't overwrite a non-default stored value with "details"
        // Restore the stored value instead
        setActiveTab(stored);
        return;
      }
      
      // Only save if different to avoid unnecessary writes
      if (stored !== activeTab) {
        localStorage.setItem(`job-posting-tab-${jobId}`, activeTab);
      }
    }
  }, [activeTab, jobId]);
  const [aiMatches, setAiMatches] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loadingAiMatches, setLoadingAiMatches] = useState(false);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [loadingScreenings, setLoadingScreenings] = useState(false);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [loadingRejected, setLoadingRejected] = useState(false);
  const [applyingCandidateId, setApplyingCandidateId] = useState(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [parseResumeModalOpen, setParseResumeModalOpen] = useState(false);
  const [parseResumeFile, setParseResumeFile] = useState(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [parsedResumeData, setParsedResumeData] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [candidateSuccess, setCandidateSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_no: "",
    skills: "",
    experience: "",
    role: [],
    bio: "",
  });
  const [closeType, setCloseType] = useState(null); // "permanent" or "temporary"
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [scheduledCandidateIds, setScheduledCandidateIds] = useState(new Set());
  const [callStatuses, setCallStatuses] = useState(new Map());
  const [callingCandidateId, setCallingCandidateId] = useState(null);
  const [stoppingCandidateId, setStoppingCandidateId] = useState(null);
  const [callDetailsDialogOpen, setCallDetailsDialogOpen] = useState(false);
  const [selectedCallDetails, setSelectedCallDetails] = useState(null);
  const [selectedCallCandidateId, setSelectedCallCandidateId] = useState(null);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [scheduleInterviewDialogOpen, setScheduleInterviewDialogOpen] =
    useState(false);
  const [selectedCandidateForInterview, setSelectedCandidateForInterview] =
    useState(null);
  const [selectedRecruiter, setSelectedRecruiter] = useState("");
  const [recruiterAvailability, setRecruiterAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [jobRecruiters, setJobRecruiters] = useState([]);
  const [interviewAlreadyScheduled, setInterviewAlreadyScheduled] =
    useState(false);
  const [existingInterviewDetails, setExistingInterviewDetails] =
    useState(null);
  const [offerRejectDialogOpen, setOfferRejectDialogOpen] = useState(false);
  const [selectedInterviewForAction, setSelectedInterviewForAction] =
    useState(null);
  const [interviewDetailsDialogOpen, setInterviewDetailsDialogOpen] = useState(false);
  const [selectedInterviewDetails, setSelectedInterviewDetails] = useState(null);
  const [actionType, setActionType] = useState(""); // "offer" or "reject"
  const [feedback, setFeedback] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
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

  const normalizeCtcValue = (ctc) => {
    if (ctc === null || ctc === undefined) return "";
    if (typeof ctc === "number") return ctc.toString();
    const match = ctc.toString().match(/[\d.]+/);
    return match ? match[0] : "";
  };

  const formatCtcDisplay = (ctc, fallback = "N/A") => {
    if (ctc === null || ctc === undefined || ctc === "") {
      return fallback;
    }
    const num = typeof ctc === "number" ? ctc : parseFloat(ctc);
    if (!Number.isNaN(num)) {
      return `${num} LPA`;
    }
    return ctc;
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

  // Fetch AI matches when AI Match tab is active
  useEffect(() => {
    if (
      jobPosting &&
      jobPosting.status === "open" &&
      activeTab === "ai-match" &&
      !loadingAiMatches
    ) {
      fetchAiMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPosting?.status, activeTab]);

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
    if (jobPosting && jobPosting.status === "open") {
      if (activeTab === "screenings") {
        fetchScreenings();
      } else if (activeTab === "interviews") {
        fetchInterviews();
      } else if (activeTab === "offers") {
        fetchOffers();
      } else if (activeTab === "rejected") {
        fetchRejected();
      }
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

  // Fetch AI matches (top 20) for AI Match tab
  const fetchAiMatches = async () => {
    if (!jobId) return;

    if (!jobPosting || jobPosting.status !== "open") {
      return;
    }

    try {
      setLoadingAiMatches(true);
      // Refresh matches first
      await matchingAPI.refreshJobMatches(jobId);

      // Get top 20 matches (all statuses)
      const response = await matchingAPI.getJobMatches(jobId);
      const sortedMatches = (response.matches || [])
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 20);

      console.log("Fetched AI matches:", sortedMatches.length);
      setAiMatches(sortedMatches);
    } catch (err) {
      console.error("Error fetching AI matches:", err);
      toast.error(err.message || "Failed to load AI matches");
    } finally {
      setLoadingAiMatches(false);
    }
  };

  // Fetch applied candidates for Applicants tab
  const fetchApplicants = async (forceFetch = false) => {
    if (!jobId) return;

    if (!forceFetch && (!jobPosting || jobPosting.status !== "open")) {
      return;
    }

    try {
      setLoadingApplicants(true);
      // Get only applied candidates
      const response = await matchingAPI.getJobMatches(jobId, "", "applied");
      const sortedMatches = (response.matches || []).sort(
        (a, b) => (b.matchScore || 0) - (a.matchScore || 0)
      );

      console.log("Fetched applicants:", sortedMatches.length);
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

  // Handle Apply button click in AI Match tab
  const handleApplyCandidate = async (candidateId) => {
    if (!jobId || !candidateId) return;

    try {
      setApplyingCandidateId(candidateId);
      await matchingAPI.markCandidateAsApplied(jobId, candidateId);
      toast.success("Candidate marked as applied successfully");

      // Optimistically update AI matches list
      setAiMatches((prevMatches) => {
        const updatedMatches = prevMatches.map((match) => {
          const id = match.candidateId?._id?.toString();
          if (id === candidateId) {
            return { ...match, status: "applied" };
          }
          return match;
        });

        // Also ensure candidate appears in Applicants tab without refetch
        const appliedMatch = updatedMatches.find((match) => {
          const id = match.candidateId?._id?.toString();
          return id === candidateId;
        });

        if (appliedMatch) {
          setApplicants((prevApplicants) => {
            const alreadyExists = prevApplicants.some((match) => {
              const id = match.candidateId?._id?.toString();
              return id === candidateId;
            });

            if (alreadyExists) return prevApplicants;
            return [...prevApplicants, appliedMatch];
          });
        }

        return updatedMatches;
      });
    } catch (err) {
      console.error("Error applying candidate:", err);
      toast.error(err.message || "Failed to mark candidate as applied");
    } finally {
      setApplyingCandidateId(null);
    }
  };

  // Candidate form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (candidateError) setCandidateError("");
    if (candidateSuccess) setCandidateSuccess("");
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => {
      const currentRoles = prev.role || [];
      if (currentRoles.includes(value)) {
        return { ...prev, role: currentRoles.filter((r) => r !== value) };
      } else {
        return { ...prev, role: [...currentRoles, value] };
      }
    });
  };

  const validateResumeFile = (file) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      setCandidateError("Please upload a PDF or Word document");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCandidateError("File size must be less than 5MB");
      return false;
    }
    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateResumeFile(file)) {
        setParseResumeFile(file);
        setCandidateError("");
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateResumeFile(file)) {
        setParseResumeFile(file);
        setCandidateError("");
      }
    }
  };

  const handleParseResume = async (saveToDatabase = false) => {
    if (!parseResumeFile) {
      setCandidateError("Please select a resume file");
      return;
    }

    setIsParsingResume(true);
    setCandidateError("");
    setCandidateSuccess("");
    setParsedResumeData(null);

    try {
      const response = await resumeParserAPI.parseFromFile(
        parseResumeFile,
        parseResumeFile.name,
        saveToDatabase
      );

      if (response.success) {
        setParsedResumeData(response.data.formatted);
        setCandidateSuccess(response.message || "Resume parsed successfully!");

        // If saved to database, refresh job matches for this job
        if (saveToDatabase && response.data.candidate) {
          await matchingAPI.refreshJobMatches(jobId);
          await fetchAiMatches();
          toast.success("Candidate added and job matches refreshed!");
        }
      } else {
        if (response.data?.missingFields) {
          const missing = [];
          if (response.data.missingFields.name) missing.push("Name");
          if (response.data.missingFields.email) missing.push("Email");
          setCandidateError(
            `Required fields missing: ${missing.join(
              ", "
            )}. Cannot save candidate without these fields.`
          );
          setParsedResumeData(response.data.formatted);
        } else {
          setCandidateError(response.message || "Failed to parse resume");
        }
      }
    } catch (err) {
      setCandidateError(
        err.message || "Failed to parse resume. Please try again."
      );
    } finally {
      setIsParsingResume(false);
    }
  };

  const resetParseResumeModal = () => {
    setParseResumeFile(null);
    setParsedResumeData(null);
    setCandidateError("");
    setCandidateSuccess("");
    setDragActive(false);
    setIsParsingResume(false);
  };

  const validateForm = () => {
    if (!formData.name || !formData.email) {
      setCandidateError("Name and email are required fields");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setCandidateError("Please enter a valid email address");
      return false;
    }
    if (formData.experience && isNaN(formData.experience)) {
      setCandidateError("Experience must be a number");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCandidateError("");
    setCandidateSuccess("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const candidateData = {
        name: formData.name,
        email: formData.email,
        phone_no: formData.phone_no || undefined,
        skills: formData.skills
          ? formData.skills.split(",").map((s) => s.trim())
          : [],
        experience: formData.experience ? parseInt(formData.experience) : 0,
        role: formData.role || [],
        bio: formData.bio || undefined,
      };

      const response = await candidateAPI.createCandidate(candidateData);
      setCandidateSuccess(
        `Candidate created successfully! ${response.candidate.name} has been added.`
      );

      resetForm();
      setFormOpen(false);

      // Refresh job matches for this job ID
      await matchingAPI.refreshJobMatches(jobId);
      await fetchAiMatches();
      toast.success("Candidate added and job matches refreshed!");

      setTimeout(() => setCandidateSuccess(""), 5000);
    } catch (err) {
      setCandidateError(
        err.message || "Failed to create candidate. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone_no: "",
      skills: "",
      experience: "",
      role: [],
      bio: "",
    });
    setCandidateError("");
    setCandidateSuccess("");
  };

  const openAddForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const validRoles = [
    "SDET",
    "QA",
    "DevOps",
    "Frontend",
    "Backend",
    "Full-stack",
  ];

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

  // Helper function to fetch candidates by stage from candidate progress
  const fetchCandidatesByStage = async (stage) => {
    if (!jobId || !jobPosting || jobPosting.status !== "open") {
      return [];
    }

    try {
      const response = await candidateProgressAPI.getProgressByJob(jobId);
      const allCandidates = response.candidates || [];

      // Filter candidates where the specified stage is completed
      const candidatesAtStage = allCandidates.filter(
        (candidate) => candidate[stage]?.status === "completed"
      );

      // Get candidate details from matching API to include match scores
      const candidateIds = candidatesAtStage
        .map((c) => c.candidateId?.toString())
        .filter(Boolean);

      if (candidateIds.length === 0) {
        return [];
      }

      // Get match scores from matching API
      const matchResponse = await matchingAPI.getJobMatches(jobId);
      const matchMap = new Map();
      (matchResponse.matches || []).forEach((match) => {
        const candidateId = match.candidateId?._id?.toString();
        if (candidateId) {
          matchMap.set(candidateId, match);
        }
      });

      // Combine progress data with match data
      const enrichedCandidates = candidatesAtStage.map((candidate) => {
        const candidateId = candidate.candidateId?.toString();
        const match = matchMap.get(candidateId);
        return {
          ...candidate,
          candidateId: match?.candidateId || candidate.candidateId,
          matchScore: match?.matchScore || 0,
        };
      });

      return enrichedCandidates;
    } catch (err) {
      console.error(`Error fetching candidates by stage ${stage}:`, err);
      throw err;
    }
  };

  const fetchScreenings = async () => {
    if (!jobPosting || jobPosting.status !== "open") {
      setScreenings([]);
      return;
    }

    try {
      setLoadingScreenings(true);
      // Fetch screenings with scores from the new API endpoint
      const response = await bolnaAPI.getJobScreenings(jobId);
      const screeningsData = response.screenings || [];

      console.log("Fetched screenings with scores:", screeningsData.length);
      setScreenings(screeningsData);

      // Check scheduled calls for all screenings
      const candidateIds = screeningsData
        .map((s) => s.candidateId?._id?.toString() || s.candidateId?.toString())
        .filter(Boolean);
      if (candidateIds.length > 0) {
        const statusMap = await checkScheduledCalls(candidateIds);
        setCallStatuses(statusMap);
      }
    } catch (err) {
      console.error("Error fetching screenings:", err);
      toast.error(err.message || "Failed to load screenings");
      setScreenings([]);
    } finally {
      setLoadingScreenings(false);
    }
  };

  const fetchInterviews = async () => {
    if (!jobPosting || jobPosting.status !== "open") {
      setInterviews([]);
      return;
    }

    try {
      setLoadingInterviews(true);
      const response = await bolnaAPI.getJobInterviews(jobId);
      const interviewsData = response.interviews || [];
      console.log("Fetched interviews:", interviewsData.length);

      // Filter to only show interviews with screeningScore
      const interviewsWithScore = interviewsData.filter(
        (interview) =>
          interview.screeningScore !== null &&
          interview.screeningScore !== undefined
      );

      console.log(
        "Interviews with screening score:",
        interviewsWithScore.length
      );
      setInterviews(interviewsWithScore);
    } catch (err) {
      console.error("Error fetching interviews:", err);
      toast.error(err.message || "Failed to load interviews");
      setInterviews([]);
    } finally {
      setLoadingInterviews(false);
    }
  };

  const fetchOffers = async () => {
    if (!jobPosting || jobPosting.status !== "open") {
      setOffers([]);
      return;
    }

    try {
      setLoadingOffers(true);
      // Get all interviews and filter for offers
      const response = await bolnaAPI.getJobInterviews(jobId);
      const allInterviews = response.interviews || [];
      const offersData = allInterviews.filter(
        (i) => i.interviewOutcome === "offer"
      );

      // Get match scores
      const candidateIds = offersData
        .map((i) => i.candidateId?._id?.toString() || i.candidateId?.toString())
        .filter(Boolean);

      if (candidateIds.length > 0) {
        const matchResponse = await matchingAPI.getJobMatches(jobId);
        const matchMap = new Map();
        (matchResponse.matches || []).forEach((match) => {
          const candidateId = match.candidateId?._id?.toString();
          if (candidateId) {
            matchMap.set(candidateId, match);
          }
        });

        const enrichedOffers = offersData.map((offer) => {
          const candidateId =
            offer.candidateId?._id?.toString() || offer.candidateId?.toString();
          const match = matchMap.get(candidateId);
          return {
            ...offer,
            matchScore: match?.matchScore || 0,
          };
        });

        setOffers(enrichedOffers);
      } else {
        setOffers([]);
      }

      console.log("Fetched offers:", offersData.length);
    } catch (err) {
      console.error("Error fetching offers:", err);
      toast.error(err.message || "Failed to load offers");
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchRejected = async () => {
    if (!jobPosting || jobPosting.status !== "open") {
      setRejected([]);
      return;
    }

    try {
      setLoadingRejected(true);
      // Get all interviews and filter for rejected
      const response = await bolnaAPI.getJobInterviews(jobId);
      const allInterviews = response.interviews || [];
      const rejectedData = allInterviews.filter(
        (i) => i.interviewOutcome === "reject"
      );

      // Get match scores
      const candidateIds = rejectedData
        .map((i) => i.candidateId?._id?.toString() || i.candidateId?.toString())
        .filter(Boolean);

      if (candidateIds.length > 0) {
        const matchResponse = await matchingAPI.getJobMatches(jobId);
        const matchMap = new Map();
        (matchResponse.matches || []).forEach((match) => {
          const candidateId = match.candidateId?._id?.toString();
          if (candidateId) {
            matchMap.set(candidateId, match);
          }
        });

        const enrichedRejected = rejectedData.map((rejected) => {
          const candidateId =
            rejected.candidateId?._id?.toString() ||
            rejected.candidateId?.toString();
          const match = matchMap.get(candidateId);
          return {
            ...rejected,
            matchScore: match?.matchScore || 0,
          };
        });

        setRejected(enrichedRejected);
      } else {
        setRejected([]);
      }

      console.log("Fetched rejected:", rejectedData.length);
    } catch (err) {
      console.error("Error fetching rejected:", err);
      toast.error(err.message || "Failed to load rejected candidates");
      setRejected([]);
    } finally {
      setLoadingRejected(false);
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

      // Prepare comprehensive user_data with candidate information
      const userData = {
        candidate_name: candidate.name || "",
        candidate_email: candidate.email || "",
        candidate_phone: candidate.phone_no || "",
        bio: candidate.bio || "",
        role: candidate.role?.join(", ") || "",
        experience: candidate.experience ? `${candidate.experience} years` : "",
        skills:
          candidate.skills?.join(", ") ||
          (typeof candidate.skills === "string" ? candidate.skills : ""),
        company_name: jobPosting.company || "", // Add company name from the job posting
      };

      // Get job description from job posting
      const jobDescription = jobPosting.description || "";

      // Schedule the call
      const callData = {
        candidateId,
        jobId: jobPosting._id,
        recipient_phone_number: candidate.phone_no,
        scheduled_at: scheduledTime.toISOString(),
        job_description: jobDescription, // Add job description to payload
        user_data: userData, // Include comprehensive candidate data
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

  const handleStopCall = async (candidateId, executionId) => {
    if (!executionId) {
      toast.error("No execution ID found for this call");
      return;
    }

    try {
      setStoppingCandidateId(candidateId);
      await bolnaAPI.stopCall(executionId);
      toast.success("Call stopped successfully!");

      // Refresh call statuses for all tabs
      const allCandidateIds = new Set();

      // Add applicants candidate IDs
      applicants.forEach((m) => {
        const id = m.candidateId?._id?.toString();
        if (id) allCandidateIds.add(id);
      });

      // Add screenings candidate IDs
      screenings.forEach((c) => {
        const id = c.candidateId?._id?.toString() || c.candidateId?.toString();
        if (id) allCandidateIds.add(id);
      });

      // Add interviews candidate IDs
      interviews.forEach((c) => {
        const id = c.candidateId?._id?.toString() || c.candidateId?.toString();
        if (id) allCandidateIds.add(id);
      });

      if (allCandidateIds.size > 0) {
        await checkScheduledCalls(Array.from(allCandidateIds));
      }
    } catch (err) {
      console.error("Error stopping call:", err);
      toast.error(err.message || "Failed to stop call");
    } finally {
      setStoppingCandidateId(null);
    }
  };

  const handleViewProfile = (candidate) => {
    // Navigate to candidate profile or open a dialog
    router.push(`/dashboard/recruiter/candidate/${candidate._id}`);
  };

  const handleOpenScheduleInterview = async (screeningData) => {
    setSelectedCandidateForInterview(screeningData);
    setScheduleInterviewDialogOpen(true);
    setSelectedRecruiter("");
    setRecruiterAvailability(null);
    setSelectedSlot("");
    setInterviewAlreadyScheduled(false);
    setExistingInterviewDetails(null);

    // Check if interview is already scheduled
    const isScheduled = screeningData.emailSent || screeningData.meetLink;
    if (isScheduled) {
      setInterviewAlreadyScheduled(true);
      setExistingInterviewDetails({
        recruiterId:
          screeningData.assignRecruiter?._id?.toString() ||
          screeningData.assignRecruiter?.toString() ||
          screeningData.assignRecruiter,
        recruiterName: screeningData.assignRecruiter?.name || "Recruiter",
        scheduledTime:
          screeningData.userScheduledAt || screeningData.emailSentAt,
        meetLink: screeningData.meetLink,
        emailSentAt: screeningData.emailSentAt,
      });

      // Pre-populate with existing data
      if (screeningData.assignRecruiter) {
        const recruiterId =
          screeningData.assignRecruiter._id?.toString() ||
          screeningData.assignRecruiter.toString();
        setSelectedRecruiter(recruiterId);
        // Fetch availability for display
        if (screeningData.userScheduledAt) {
          setSelectedSlot(
            new Date(screeningData.userScheduledAt).toISOString()
          );
        }
      }
    }

    // Get recruiters for this job (primary + secondary)
    const recruitersList = [];
    if (jobPosting?.primary_recruiter_id) {
      const primaryId =
        typeof jobPosting.primary_recruiter_id === "object"
          ? jobPosting.primary_recruiter_id._id?.toString()
          : jobPosting.primary_recruiter_id.toString();
      const primaryName =
        typeof jobPosting.primary_recruiter_id === "object"
          ? jobPosting.primary_recruiter_id.name
          : "Primary Recruiter";
      recruitersList.push({
        id: primaryId,
        name: primaryName,
        type: "primary",
      });
    }
    if (
      jobPosting?.secondary_recruiter_id &&
      Array.isArray(jobPosting.secondary_recruiter_id)
    ) {
      jobPosting.secondary_recruiter_id.forEach((sec) => {
        if (sec) {
          const secId =
            typeof sec === "object" ? sec._id?.toString() : sec.toString();
          const secName =
            typeof sec === "object" ? sec.name : "Secondary Recruiter";
          recruitersList.push({ id: secId, name: secName, type: "secondary" });
        }
      });
    }
    setJobRecruiters(recruitersList);

    // If interview is scheduled, fetch availability for display
    if (isScheduled && screeningData.assignRecruiter) {
      const recruiterId =
        screeningData.assignRecruiter._id?.toString() ||
        screeningData.assignRecruiter.toString();
      await handleRecruiterChange(recruiterId);
    }
  };

  const handleRecruiterChange = async (recruiterId) => {
    if (!recruiterId || !jobId) return;

    setSelectedRecruiter(recruiterId);
    setRecruiterAvailability(null);
    setSelectedSlot("");

    try {
      setLoadingAvailability(true);
      // Get all availability for the job and filter by recruiter
      const allResponse =
        await recruiterAvailabilityAPI.getAllAvailabilityByJob(jobId);
      const allAvail = allResponse?.availabilities || [];
      const recruiterAvail = allAvail.find((avail) => {
        const availRecruiterId =
          avail.recruiter_id?._id?.toString() || avail.recruiter_id?.toString();
        return availRecruiterId === recruiterId;
      });

      if (recruiterAvail && recruiterAvail.availability_slots) {
        // Filter only available slots
        const availableSlots = recruiterAvail.availability_slots.filter(
          (slot) => slot.is_available !== false
        );
        setRecruiterAvailability(availableSlots);
      } else {
        setRecruiterAvailability([]);
        toast.warning(
          "No availability found for this recruiter. Please ask them to set their availability."
        );
      }
    } catch (err) {
      console.error("Error fetching availability:", err);
      toast.error(err.message || "Failed to load recruiter availability");
      setRecruiterAvailability([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleSendInterviewEmail = async () => {
    if (!selectedCandidateForInterview || !selectedRecruiter || !selectedSlot) {
      toast.error("Please select recruiter and time slot");
      return;
    }

    const candidateId =
      selectedCandidateForInterview.candidateId?._id?.toString() ||
      selectedCandidateForInterview.candidateId?.toString();

    if (!candidateId) {
      toast.error("Candidate ID not found");
      return;
    }

    // Check if recruiter has Cal.com credentials
    try {
      const credentials = await calcomCredentialsAPI.getCredentials(
        selectedRecruiter
      );
      if (!credentials.credentials || !credentials.credentials.eventTypeId) {
        toast.error(
          "Please configure Cal.com credentials for this recruiter. Go to Cal.com Setup page."
        );
        return;
      }
    } catch (err) {
      // If credentials not found, the backend will handle the error
      // But we can show a helpful message
      if (err.message?.includes("not found")) {
        toast.error(
          "Cal.com credentials not configured for this recruiter. Please ask them to configure it in Cal.com Setup."
        );
        return;
      }
      // Continue - backend will check credentials and return proper error
    }

    try {
      setSendingEmail(true);

      // Format the slot as ISO string
      const slotDate = new Date(selectedSlot);

      await bolnaAPI.sendEmail({
        candidateId,
        recruiterId: selectedRecruiter,
        slot: slotDate.toISOString(),
      });

      toast.success("Interview email sent successfully!");
      setScheduleInterviewDialogOpen(false);
      setSelectedCandidateForInterview(null);
      setSelectedRecruiter("");
      setRecruiterAvailability(null);
      setSelectedSlot("");

      // Refresh screenings
      await fetchScreenings();
    } catch (err) {
      console.error("Error sending interview email:", err);
      toast.error(err.message || "Failed to send interview email");
    } finally {
      setSendingEmail(false);
    }
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
      ctc: normalizeCtcValue(jobPosting.ctc),
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
      setSelectedCallCandidateId(candidateIdStr);
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
                      {jobPosting?.title || "Loading..."}
                    </h1>
                    <p className="text-slate-600 mt-1">
                      {jobPosting?.company || ""}
                    </p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      canEdit && currentStatus !== "closed"
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-50"
                    }
                    onClick={() => setAvailabilityDialogOpen(true)}
                    disabled={!canEdit || currentStatus === "closed"}
                    title={
                      currentStatus === "closed"
                        ? "Cannot set availability for a closed job posting"
                        : !canEdit
                        ? "You do not have permission to set availability"
                        : "Select your availability for interviews"
                    }
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Select Availability
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
                    {formatCtcDisplay(jobPosting.ctc, "N/A")}
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
                  { id: "ai-match", label: "AI Match" },
                  { id: "applicants", label: "Applicants" },
                  { id: "screenings", label: "Screenings" },
                  { id: "interviews", label: "Interviews" },
                  { id: "offers", label: "Offers" },
                  { id: "rejected", label: "Rejected" },
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
                  {jobPosting ? (
                    <>
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
                            Job Type
                          </p>
                          <p className="text-sm font-medium text-slate-900">
                            {jobPosting.job_type || "N/A"}
                          </p>
                        </div>
                      </div>

                      {jobPosting.description && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase mb-2">
                            Job Description
                          </p>
                          <p className="text-sm text-slate-900 whitespace-pre-wrap">
                            {jobPosting.description}
                          </p>
                        </div>
                      )}

                      {jobPosting.skills && jobPosting.skills.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase mb-2">
                            Skills Matrix
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {jobPosting.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Loading job details...
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "ai-match" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>AI Candidate Matches (Top 20)</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={openAddForm}
                        className="cursor-pointer gap-2 rounded-lg bg-linear-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
                      >
                        <Plus className="h-4 w-4" />
                        Add Candidate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer gap-2 rounded-lg border-slate-200 bg-white/70 backdrop-blur-xl hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all duration-200 shadow-sm"
                        onClick={() => {
                          resetParseResumeModal();
                          setParseResumeModalOpen(true);
                        }}
                      >
                        <Upload className="h-4 w-4" />
                        Parse Resume
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!jobPosting || jobPosting.status !== "open" ? (
                    <p className="text-center py-8 text-slate-500">
                      Please open the job to view AI matches
                    </p>
                  ) : loadingAiMatches ? (
                    <div className="text-center py-8">
                      <Loading />
                    </div>
                  ) : aiMatches.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      No AI matches found
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
                          <TableHead className="text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aiMatches.map((match, index) => {
                          const candidate = match.candidateId;
                          if (!candidate) return null;

                          const matchScore = Math.round(
                            (match.matchScore || 0) * 100
                          );
                          const candidateId = candidate._id?.toString();
                          const isApplied = match.status === "applied";
                          const isApplying =
                            applyingCandidateId === candidateId;

                          const handleRowClick = (e) => {
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
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isApplied
                                      ? "bg-green-100 text-green-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {isApplied ? "Applied" : "Pending"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApplyCandidate(candidateId);
                                  }}
                                  disabled={isApplied || isApplying}
                                  className={`${
                                    isApplied
                                      ? "bg-green-100 text-green-700 hover:bg-green-100 cursor-not-allowed"
                                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                  }`}
                                >
                                  {isApplying ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Applying...
                                    </>
                                  ) : isApplied ? (
                                    "Applied"
                                  ) : (
                                    "Apply"
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

            {activeTab === "applicants" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle>Applied Candidates</CardTitle>
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
                          <TableHead className="text-center">
                            Call Status
                          </TableHead>
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
                              <TableCell className="text-center">
                                {callStatus && callStatus.executionId ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewCallDetails(
                                        candidateId,
                                        callStatus.executionId
                                      );
                                    }}
                                    className="bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/50"
                                    title="View call details and status"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-sm text-slate-500">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleScheduleSingleCall(candidate);
                                    }}
                                    disabled={
                                      !canCall ||
                                      currentStatus === "closed" ||
                                      callingCandidateId === candidateId ||
                                      !candidate.phone_no ||
                                      (callStatus &&
                                        callStatus.status === "completed") ||
                                      (callStatus &&
                                        callStatus.status === "scheduled")
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
                                        : callStatus &&
                                          callStatus.status === "scheduled"
                                        ? "Call already scheduled"
                                        : callStatus &&
                                          (callStatus.status === "no-answer" ||
                                            callStatus.status === "call-disconnected" ||
                                            callStatus.status === "busy")
                                        ? "Retry call"
                                        : "Schedule a call for this candidate"
                                    }
                                  >
                                    {callingCandidateId === candidateId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <PhoneCall className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
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
                  {(() => {
                    if (loadingScreenings) {
                      return (
                        <div className="text-center py-8">
                          <Loading />
                        </div>
                      );
                    }

                    if (screenings.length === 0) {
                      return (
                        <p className="text-center py-8 text-slate-500">
                          No candidates have completed screening yet
                        </p>
                      );
                    }

                    return (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Candidate</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Experience</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Call</TableHead>
                            <TableHead className="text-center">
                              Schedule Interview
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {screenings.map((screeningData, index) => {
                            const candidate = screeningData.candidateId;
                            if (!candidate) return null;

                            const screeningScore =
                              screeningData.screeningScore || 0;
                            const candidateId =
                              candidate._id?.toString() ||
                              screeningData.candidateId?.toString();
                            const callStatus = callStatuses.get(candidateId);
                            const isScheduled =
                              scheduledCandidateIds.has(candidateId);

                            const handleRowClick = (e) => {
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
                                key={candidate._id || candidateId || index}
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
                                  {screeningScore !== null &&
                                  screeningScore !== undefined ? (
                                    <div
                                      className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                                        screeningScore / 100
                                      )}`}
                                    >
                                      {Math.round(screeningScore)}%
                                    </div>
                                  ) : (
                                    <span className="text-sm text-slate-500">
                                      Pending
                                    </span>
                                  )}
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
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScheduleSingleCall(candidate);
                                      }}
                                      disabled={
                                        !canCall ||
                                        currentStatus === "closed" ||
                                        callingCandidateId === candidateId ||
                                        !candidate.phone_no ||
                                        (callStatus &&
                                          callStatus.status === "completed") ||
                                        (callStatus &&
                                          callStatus.status === "scheduled")
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
                                          : callStatus &&
                                            callStatus.status === "scheduled"
                                          ? "Call already scheduled"
                                          : callStatus &&
                                            (callStatus.status === "no-answer" ||
                                              callStatus.status === "call-disconnected" ||
                                              callStatus.status === "busy")
                                          ? "Retry call"
                                          : "Schedule a call for this candidate"
                                      }
                                    >
                                      {callingCandidateId === candidateId ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <PhoneCall className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenScheduleInterview(
                                        screeningData
                                      );
                                    }}
                                    disabled={
                                      !screeningScore || screeningScore === 0
                                    }
                                    className="bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={
                                      !screeningScore || screeningScore === 0
                                        ? "Screening not completed yet"
                                        : "Schedule interview with recruiter"
                                    }
                                  >
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {activeTab === "interviews" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle>Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingInterviews ? (
                    <div className="text-center py-8">
                      <Loading />
                    </div>
                  ) : interviews.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      No interviews scheduled yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Interview Status</TableHead>
                          <TableHead className="text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interviews.map((interviewData, index) => {
                          const candidate = interviewData.candidateId;
                          if (!candidate) return null;

                          // Use screeningScore instead of matchScore
                          const screeningScore =
                            interviewData.screeningScore !== null &&
                            interviewData.screeningScore !== undefined
                              ? Math.round(interviewData.screeningScore)
                              : null;

                          const candidateId =
                            candidate._id?.toString() ||
                            interviewData.candidateId?.toString();

                          // Determine interview status based on interview times
                          const getInterviewStatus = () => {
                            const now = new Date();
                            const interviewTime = interviewData.interviewTime
                              ? new Date(interviewData.interviewTime)
                              : null;
                            const interviewEndTime = interviewData.interviewEndTime
                              ? new Date(interviewData.interviewEndTime)
                              : null;
                            const emailSent = interviewData.emailSent;

                            // If email is sent and interview time exists
                            if (emailSent && interviewTime) {
                              // If current time is before interview start time -> Pending
                              if (now < interviewTime) {
                                return "pending";
                              }
                              // If interview end time exists and current time is between start and end -> Running
                              else if (interviewEndTime && now >= interviewTime && now <= interviewEndTime) {
                                return "running";
                              }
                              // If current time is after end time (or no end time and after start time) -> Completed
                              else if (interviewEndTime ? now > interviewEndTime : now > interviewTime) {
                                return "completed";
                              }
                            }
                            // If email not sent or no interview time
                            return "not_scheduled";
                          };

                          const interviewStatus = getInterviewStatus();

                          const handleRowClick = (e) => {
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

                          const handleOpenOfferReject = (e) => {
                            e.stopPropagation();
                            setSelectedInterviewForAction(interviewData);
                            setActionType("");
                            setFeedback("");
                            setOfferRejectDialogOpen(true);
                          };

                          const handleViewInterviewDetails = (e) => {
                            e.stopPropagation();
                            setSelectedInterviewDetails(interviewData);
                            setInterviewDetailsDialogOpen(true);
                          };

                          // Check if action button should be disabled
                          // Disable if interview is pending, running, not scheduled, or outcome already set
                          const isActionDisabled =
                            interviewStatus === "pending" ||
                            interviewStatus === "running" ||
                            interviewStatus === "not_scheduled" ||
                            interviewData.interviewOutcome === "offer" ||
                            interviewData.interviewOutcome === "reject";

                          return (
                            <TableRow
                              key={candidate._id || candidateId || index}
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleViewInterviewDetails}
                                  className="bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
                                  title="View interview details"
                                >
                                  <Calendar className="h-4 w-4" /> Details
                                </Button>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleOpenOfferReject}
                                  disabled={isActionDisabled}
                                  className="bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={
                                    interviewStatus === "pending"
                                      ? "Interview is still pending. Please wait for the interview to start."
                                      : interviewStatus === "running"
                                      ? "Interview is currently running. Please wait for it to complete."
                                      : interviewStatus === "not_scheduled"
                                      ? "Interview is not scheduled yet."
                                      : interviewData.interviewOutcome === "offer"
                                      ? "Offer already sent"
                                      : interviewData.interviewOutcome === "reject"
                                      ? "Candidate already rejected"
                                      : "Select offer or reject"
                                  }
                                >
                                  {interviewData.interviewOutcome ===
                                  "offer" ? (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Offered
                                    </>
                                  ) : interviewData.interviewOutcome ===
                                    "reject" ? (
                                    <>
                                      <X className="h-4 w-4 mr-1" />
                                      Rejected
                                    </>
                                  ) : (
                                    <>
                                      <Briefcase className="h-4 w-4 mr-1" />
                                      Action
                                    </>
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

            {activeTab === "offers" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle>Offers</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingOffers ? (
                    <div className="text-center py-8">
                      <Loading />
                    </div>
                  ) : offers.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      No candidates have received offers yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {offers.map((candidateData, index) => {
                          const candidate = candidateData.candidateId;
                          if (!candidate) return null;

                          // Use screeningScore instead of matchScore
                          const screeningScore =
                            candidateData.screeningScore !== null &&
                            candidateData.screeningScore !== undefined
                              ? Math.round(candidateData.screeningScore)
                              : null;

                          const candidateId =
                            candidate._id?.toString() ||
                            candidateData.candidateId?.toString();

                          const handleRowClick = (e) => {
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
                              key={candidate._id || candidateId || index}
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
                                {screeningScore !== null ? (
                                  <div
                                    className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                                      screeningScore / 100
                                    )}`}
                                  >
                                    {screeningScore}%
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-600">
                                    N/A
                                  </span>
                                )}
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
                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Selected
                                </div>
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

            {activeTab === "rejected" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle>Rejected Candidates</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingRejected ? (
                    <div className="text-center py-8">
                      <Loading />
                    </div>
                  ) : rejected.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      No candidates have been rejected yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rejected.map((candidateData, index) => {
                          const candidate = candidateData.candidateId;
                          if (!candidate) return null;

                          // Use screeningScore instead of matchScore
                          const screeningScore =
                            candidateData.screeningScore !== null &&
                            candidateData.screeningScore !== undefined
                              ? Math.round(candidateData.screeningScore)
                              : null;

                          const candidateId =
                            candidate._id?.toString() ||
                            candidateData.candidateId?.toString();

                          const handleRowClick = (e) => {
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
                              key={candidate._id || candidateId || index}
                              onClick={handleRowClick}
                              className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 border border-red-200">
                                    <span className="text-sm font-semibold text-red-700">
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
                                {screeningScore !== null ? (
                                  <div
                                    className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                                      screeningScore / 100
                                    )}`}
                                  >
                                    {screeningScore}%
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-600">
                                    N/A
                                  </span>
                                )}
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
                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-500 text-white">
                                  <X className="h-3 w-3" />
                                  Rejected
                                </div>
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

              {/* Transcript from Database */}
              {selectedCallDetails.call?.transcript &&
                !selectedCallDetails.execution?.transcript && (
                  <div className="p-5 rounded-xl border border-slate-200 bg-white">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                      Transcript
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-lg text-sm max-h-60 overflow-y-auto border border-slate-200">
                      <p className="whitespace-pre-wrap text-slate-900">
                        {selectedCallDetails.call.transcript}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No call details available
            </div>
          )}

          {/* Dialog Footer */}
          {selectedCallDetails?.call && (
            <DialogFooter className="mt-6 border-t border-slate-200 pt-4">
              <div className="flex gap-2 w-full justify-end">
                {selectedCallDetails.call?.executionId &&
                  selectedCallDetails.call?.status !== "completed" &&
                  selectedCallDetails.call?.status !== "stopped" &&
                  selectedCallDetails.call?.status !== "cancelled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (
                          selectedCallDetails.call?.executionId &&
                          selectedCallCandidateId
                        ) {
                          await handleStopCall(
                            selectedCallCandidateId,
                            selectedCallDetails.call.executionId
                          );
                          // Refresh call details after stopping
                          if (selectedCallDetails.call?.executionId) {
                            try {
                              const response = await bolnaAPI.getCallStatus(
                                selectedCallDetails.call.executionId
                              );
                              setSelectedCallDetails(response);
                            } catch (err) {
                              console.error(
                                "Error refreshing call details:",
                                err
                              );
                            }
                          }
                        }
                      }}
                      disabled={stoppingCandidateId === selectedCallCandidateId}
                      className="bg-linear-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Stop the call"
                    >
                      {stoppingCandidateId === selectedCallCandidateId ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Square className="h-4 w-4 mr-2" />
                      )}
                      Stop Call
                    </Button>
                  )}
                <Button
                  variant="outline"
                  onClick={() => setCallDetailsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
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
                  Job Role
                </Label>
                <Input
                  id="role"
                  value={jobForm.role[0] || ""}
                  onChange={(e) =>
                    setJobForm({
                      ...jobForm,
                      role: e.target.value ? [e.target.value] : [],
                    })
                  }
                  placeholder="e.g., SDE / Backend Engineer"
                  className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                />
                <p className="text-xs text-slate-500">
                  Each job ID should have a single primary role.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctc" className="text-slate-900 font-medium">
                  CTC (LPA)
                </Label>
                <Input
                  id="ctc"
                  type="number"
                  min="0"
                  value={jobForm.ctc}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, ctc: e.target.value })
                  }
                  placeholder="e.g., 10"
                  className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                />
                <p className="text-xs text-slate-500">
                  Enter CTC in LPA (e.g., 10 for 10 LPA)
                </p>
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

      {/* Add Candidate Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <div className="p-2 rounded-lg bg-linear-to-br from-cyan-400/20 to-blue-500/20">
                <UserPlus className="h-6 w-6 text-cyan-600" />
              </div>
              Add New Candidate
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Fill in the details to create a new candidate profile
            </DialogDescription>
          </DialogHeader>

          {candidateError && (
            <Alert
              variant="destructive"
              className="mt-4 border-red-200 bg-red-50"
            >
              <AlertDescription className="text-red-800">
                {candidateError}
              </AlertDescription>
            </Alert>
          )}

          {candidateSuccess && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {candidateSuccess}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-900 font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-900 font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_no" className="text-slate-900 font-medium">
                Phone Number
              </Label>
              <Input
                id="phone_no"
                name="phone_no"
                type="tel"
                value={formData.phone_no}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="experience"
                className="text-slate-900 font-medium"
              >
                Experience (Years)
              </Label>
              <Input
                id="experience"
                name="experience"
                type="number"
                min="0"
                value={formData.experience}
                onChange={handleChange}
                placeholder="Enter years of experience"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-900 font-medium">Roles</Label>
              <div className="flex flex-wrap gap-2">
                {validRoles.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant={
                      formData.role?.includes(role) ? "default" : "outline"
                    }
                    onClick={() => handleRoleChange(role)}
                    className={
                      formData.role?.includes(role)
                        ? "bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                        : ""
                    }
                  >
                    {role}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Select one or more roles for this candidate
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills" className="text-slate-900 font-medium">
                Skills
              </Label>
              <Input
                id="skills"
                name="skills"
                type="text"
                value={formData.skills}
                onChange={handleChange}
                placeholder="Enter skills separated by commas (e.g., React, Node.js, Python)"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
              <p className="text-xs text-slate-500">
                Separate multiple skills with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-slate-900 font-medium">
                Bio
              </Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Enter a short bio about the candidate"
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isSubmitting ? "Creating..." : "Create Candidate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Parse Resume Dialog */}
      <Dialog
        open={parseResumeModalOpen}
        onOpenChange={(open) => {
          setParseResumeModalOpen(open);
          if (!open) {
            resetParseResumeModal();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <div className="p-2 rounded-lg bg-linear-to-br from-cyan-400/20 to-blue-500/20">
                <FileText className="h-6 w-6 text-cyan-600" />
              </div>
              Parse Resume
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Upload a resume file to automatically extract candidate
              information
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {candidateError && (
              <Alert
                variant="destructive"
                className="mt-4 border-red-200 bg-red-50"
              >
                <AlertDescription className="text-red-800">
                  {candidateError}
                </AlertDescription>
              </Alert>
            )}

            {candidateSuccess && (
              <Alert className="mt-4 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {candidateSuccess}
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-6 space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
                  dragActive
                    ? "border-cyan-500 bg-cyan-50/50 scale-[1.02]"
                    : "border-slate-300 bg-slate-50/50 hover:border-cyan-400 hover:bg-cyan-50/30"
                }`}
              >
                <input
                  type="file"
                  id="parse-resume-file-input"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {isParsingResume ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="relative">
                      <Loader2 className="h-16 w-16 text-cyan-600 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <p className="mt-6 text-lg font-medium text-slate-700 animate-pulse">
                      Parsing resume...
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Extracting information from your document
                    </p>
                  </div>
                ) : parsedResumeData ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="p-4 rounded-full bg-green-100 mb-4 animate-bounce">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">
                      Resume Parsed Successfully!
                    </p>
                    <div className="mt-6 w-full space-y-3">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm font-medium text-slate-600 mb-2">
                          Extracted Information:
                        </p>
                        <div className="space-y-2 text-sm text-slate-700">
                          <p>
                            <span className="font-semibold">Name:</span>{" "}
                            {parsedResumeData.name || (
                              <span className="text-red-500 italic">
                                Missing
                              </span>
                            )}
                          </p>
                          <p>
                            <span className="font-semibold">Email:</span>{" "}
                            {parsedResumeData.email || (
                              <span className="text-red-500 italic">
                                Missing
                              </span>
                            )}
                          </p>
                          <p>
                            <span className="font-semibold">Phone:</span>{" "}
                            {parsedResumeData.phone_no || (
                              <span className="text-slate-400 italic">
                                Not provided
                              </span>
                            )}
                          </p>
                          <div>
                            <span className="font-semibold">Skills:</span>{" "}
                            {parsedResumeData.skills?.length > 0 ? (
                              <div className="mt-1 max-h-32 overflow-y-auto">
                                <p className="text-sm text-slate-700 wrap-break-word">
                                  {parsedResumeData.skills.join(", ")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">
                                Not provided
                              </span>
                            )}
                          </div>
                          <p>
                            <span className="font-semibold">Experience:</span>{" "}
                            {parsedResumeData.experience || 0} years
                          </p>
                          {parsedResumeData.bio && (
                            <p>
                              <span className="font-semibold">Bio:</span>{" "}
                              {parsedResumeData.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      {(!parsedResumeData.name || !parsedResumeData.email) && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertDescription>
                            <strong>Required fields missing:</strong>{" "}
                            {!parsedResumeData.name && "Name "}
                            {!parsedResumeData.email && "Email "}- Cannot save
                            candidate without these fields.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ) : parseResumeFile ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="p-4 rounded-full bg-cyan-100 mb-4">
                      <FileText className="h-12 w-12 text-cyan-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      {parseResumeFile.name}
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                      {(parseResumeFile.size / 1024).toFixed(2)} KB
                    </p>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setParseResumeFile(null)}
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleParseResume(false)}
                        className="bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                      >
                        Parse Resume
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-4 rounded-full bg-linear-to-br from-cyan-400/20 to-blue-500/20 mb-6">
                      <Upload className="h-12 w-12 text-cyan-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      Drag and drop your resume here
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                      or click to browse from your device
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        document
                          .getElementById("parse-resume-file-input")
                          ?.click();
                      }}
                      className="border-slate-200 hover:bg-cyan-50 hover:border-cyan-300"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select File
                    </Button>
                    <p className="mt-4 text-xs text-slate-500">
                      Supported formats: PDF, DOC, DOCX (Max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200 mt-6 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setParseResumeModalOpen(false);
                resetParseResumeModal();
              }}
              className="border-slate-200 hover:bg-slate-50"
            >
              {parsedResumeData ? "Close" : "Cancel"}
            </Button>
            {parsedResumeData && (
              <>
                {parsedResumeData.name && parsedResumeData.email ? (
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsParsingResume(true);
                        await handleParseResume(true);
                        setCandidateSuccess("Candidate saved successfully!");
                        setTimeout(() => {
                          setParseResumeModalOpen(false);
                          resetParseResumeModal();
                        }, 2000);
                      } catch (err) {
                        setCandidateError(
                          err.message || "Failed to save candidate"
                        );
                      } finally {
                        setIsParsingResume(false);
                      }
                    }}
                    disabled={isParsingResume}
                    className="bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    {isParsingResume ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save to Database"
                    )}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => {
                    // Auto-populate the add candidate form
                    setFormData((prev) => ({
                      ...prev,
                      name: parsedResumeData.name || prev.name,
                      email: parsedResumeData.email || prev.email,
                      phone_no: parsedResumeData.phone_no || prev.phone_no,
                      skills:
                        parsedResumeData.skills?.join(", ") || prev.skills,
                      experience:
                        parsedResumeData.experience?.toString() ||
                        prev.experience,
                      bio: parsedResumeData.bio || prev.bio,
                    }));
                    setParseResumeModalOpen(false);
                    setFormOpen(true);
                    resetParseResumeModal();
                  }}
                  className="bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                >
                  Use This Data
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Availability Dialog */}
      <Dialog
        open={availabilityDialogOpen}
        onOpenChange={setAvailabilityDialogOpen}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white/95 border-white/70 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Select Availability
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-1">
              Set your available time slots for interviews for this job posting.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <RecruiterAvailability jobId={jobId} user={user} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog
        open={scheduleInterviewDialogOpen}
        onOpenChange={(open) => {
          setScheduleInterviewDialogOpen(open);
          if (!open) {
            setSelectedCandidateForInterview(null);
            setSelectedRecruiter("");
            setRecruiterAvailability(null);
            setSelectedSlot("");
            setInterviewAlreadyScheduled(false);
            setExistingInterviewDetails(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 border-white/70 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              {interviewAlreadyScheduled
                ? "Interview Scheduled"
                : "Schedule Interview"}
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-1">
              {interviewAlreadyScheduled
                ? `Interview has already been scheduled for ${
                    selectedCandidateForInterview?.candidateId?.name ||
                    "the candidate"
                  }.`
                : `Select a recruiter and available time slot to schedule an interview with ${
                    selectedCandidateForInterview?.candidateId?.name ||
                    "the candidate"
                  }.`}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {/* Show existing interview details if already scheduled */}
            {interviewAlreadyScheduled && existingInterviewDetails && (
              <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-900">
                    Interview Already Scheduled
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-slate-900">
                      Recruiter:
                    </span>{" "}
                    <span className="text-slate-700">
                      {existingInterviewDetails.recruiterName}
                    </span>
                  </p>
                  {existingInterviewDetails.scheduledTime && (
                    <p>
                      <span className="font-medium text-slate-900">
                        Scheduled Time:
                      </span>{" "}
                      <span className="text-slate-700">
                        {format(
                          new Date(existingInterviewDetails.scheduledTime),
                          "EEEE, MMMM d, yyyy 'at' h:mm a"
                        )}
                      </span>
                    </p>
                  )}
                  {existingInterviewDetails.emailSentAt && (
                    <p>
                      <span className="font-medium text-slate-900">
                        Email Sent:
                      </span>{" "}
                      <span className="text-slate-700">
                        {format(
                          new Date(existingInterviewDetails.emailSentAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </span>
                    </p>
                  )}
                  {existingInterviewDetails.meetLink && (
                    <p>
                      <span className="font-medium text-slate-900">
                        Meeting Link:
                      </span>{" "}
                      <a
                        href={existingInterviewDetails.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {existingInterviewDetails.meetLink}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recruiter Selection */}
            <div className="space-y-2">
              <Label
                htmlFor="recruiter"
                className="text-slate-900 font-semibold"
              >
                {interviewAlreadyScheduled
                  ? "Selected Recruiter"
                  : "Select Recruiter *"}
              </Label>
              <Select
                value={selectedRecruiter}
                onValueChange={handleRecruiterChange}
                disabled={loadingAvailability || interviewAlreadyScheduled}
              >
                <SelectTrigger
                  id="recruiter"
                  className="bg-white border-slate-200"
                >
                  <SelectValue placeholder="Choose a recruiter" />
                </SelectTrigger>
                <SelectContent>
                  {jobRecruiters.map((recruiter) => (
                    <SelectItem key={recruiter.id} value={recruiter.id}>
                      {recruiter.name} (
                      {recruiter.type === "primary" ? "Primary" : "Secondary"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {jobRecruiters.length === 0 && (
                <p className="text-sm text-slate-500">
                  No recruiters assigned to this job posting.
                </p>
              )}
            </div>

            {/* Availability Slots */}
            {selectedRecruiter && (
              <div className="space-y-2">
                <Label className="text-slate-900 font-semibold">
                  {interviewAlreadyScheduled
                    ? "Selected Time Slot"
                    : "Available Time Slots *"}
                </Label>
                {loadingAvailability ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-slate-600">
                      Loading availability...
                    </span>
                  </div>
                ) : recruiterAvailability &&
                  recruiterAvailability.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-4 bg-slate-50">
                    {recruiterAvailability.map((slot, index) => {
                      const slotDate = new Date(slot.date);
                      const slotDateTime = new Date(slotDate);
                      const [hours, minutes] = slot.start_time
                        .split(":")
                        .map(Number);
                      slotDateTime.setHours(hours, minutes, 0, 0);
                      const slotValue = slotDateTime.toISOString();
                      const isSelected = selectedSlot === slotValue;
                      // Check if this is the scheduled slot
                      const isScheduledSlot =
                        interviewAlreadyScheduled &&
                        existingInterviewDetails?.scheduledTime &&
                        Math.abs(
                          new Date(slotValue).getTime() -
                            new Date(
                              existingInterviewDetails.scheduledTime
                            ).getTime()
                        ) < 60000; // Within 1 minute

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            !interviewAlreadyScheduled &&
                            setSelectedSlot(slotValue)
                          }
                          disabled={interviewAlreadyScheduled}
                          className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                            isSelected || isScheduledSlot
                              ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20"
                              : interviewAlreadyScheduled
                              ? "bg-slate-100 border-slate-300 opacity-60 cursor-not-allowed"
                              : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-1.5 rounded ${
                                isSelected || isScheduledSlot
                                  ? "bg-blue-100"
                                  : "bg-slate-100"
                              }`}
                            >
                              <Clock
                                className={`h-4 w-4 ${
                                  isSelected || isScheduledSlot
                                    ? "text-blue-600"
                                    : "text-slate-600"
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">
                                {format(slotDate, "EEEE, MMMM d, yyyy")}
                              </p>
                              <p className="text-sm text-slate-600">
                                {convert24To12Hour(slot.start_time)} -{" "}
                                {convert24To12Hour(slot.end_time)}
                              </p>
                            </div>
                            {(isSelected || isScheduledSlot) && (
                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <p className="text-sm text-slate-600 text-center">
                      No available time slots found for this recruiter. Please
                      ask them to set their availability.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Candidate Info */}
            {selectedCandidateForInterview && (
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  Candidate Information
                </p>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {selectedCandidateForInterview.candidateId?.name || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {selectedCandidateForInterview.candidateId?.email || "N/A"}
                  </p>
                  {selectedCandidateForInterview.screeningScore !== null && (
                    <p>
                      <span className="font-medium">Screening Score:</span>{" "}
                      {Math.round(selectedCandidateForInterview.screeningScore)}
                      %
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setScheduleInterviewDialogOpen(false);
                setSelectedCandidateForInterview(null);
                setSelectedRecruiter("");
                setRecruiterAvailability(null);
                setSelectedSlot("");
              }}
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInterviewEmail}
              disabled={
                interviewAlreadyScheduled ||
                !selectedRecruiter ||
                !selectedSlot ||
                sendingEmail
              }
              className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : interviewAlreadyScheduled ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Interview Already Scheduled
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Interview Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer/Reject Dialog */}
      <Dialog
        open={offerRejectDialogOpen}
        onOpenChange={(open) => {
          setOfferRejectDialogOpen(open);
          if (!open) {
            setSelectedInterviewForAction(null);
            setActionType("");
            setFeedback("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 border-white/70 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-purple-600" />
              Interview Outcome
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-1">
              Select the outcome for{" "}
              {selectedInterviewForAction?.candidateId?.name || "the candidate"}
              's interview.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {/* Action Type Selection */}
            <div className="space-y-2">
              <Label className="text-slate-900 font-semibold">
                Select Outcome *
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setActionType("offer")}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    actionType === "offer"
                      ? "bg-green-50 border-green-500 ring-2 ring-green-500/20"
                      : "bg-white border-slate-200 hover:border-green-300 hover:bg-green-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded ${
                        actionType === "offer" ? "bg-green-100" : "bg-slate-100"
                      }`}
                    >
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          actionType === "offer"
                            ? "text-green-600"
                            : "text-slate-600"
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900">Offer</p>
                      <p className="text-sm text-slate-600">
                        Candidate selected and got offer
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType("reject")}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    actionType === "reject"
                      ? "bg-red-50 border-red-500 ring-2 ring-red-500/20"
                      : "bg-white border-slate-200 hover:border-red-300 hover:bg-red-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded ${
                        actionType === "reject" ? "bg-red-100" : "bg-slate-100"
                      }`}
                    >
                      <X
                        className={`h-5 w-5 ${
                          actionType === "reject"
                            ? "text-red-600"
                            : "text-slate-600"
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900">Reject</p>
                      <p className="text-sm text-slate-600">
                        Candidate rejected
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Feedback Input */}
            {actionType && (
              <div className="space-y-2">
                <Label
                  htmlFor="feedback"
                  className="text-slate-900 font-semibold"
                >
                  {actionType === "offer"
                    ? "Offer Details"
                    : "Rejection Feedback"}{" "}
                  *
                </Label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    actionType === "offer"
                      ? "Enter offer details, salary, start date, etc."
                      : "Enter feedback for rejection..."
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  required
                />
              </div>
            )}

            {/* Candidate Info */}
            {selectedInterviewForAction && (
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  Candidate Information
                </p>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {selectedInterviewForAction.candidateId?.name || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {selectedInterviewForAction.candidateId?.email || "N/A"}
                  </p>
                  {selectedInterviewForAction.userScheduledAt && (
                    <p>
                      <span className="font-medium">Interview Scheduled:</span>{" "}
                      {format(
                        new Date(selectedInterviewForAction.userScheduledAt),
                        "EEEE, MMMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setOfferRejectDialogOpen(false);
                setSelectedInterviewForAction(null);
                setActionType("");
                setFeedback("");
              }}
              disabled={submittingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!actionType || !feedback.trim()) {
                  toast.error(
                    `Please select an outcome and provide ${
                      actionType === "offer"
                        ? "offer details"
                        : "rejection feedback"
                    }`
                  );
                  return;
                }

                try {
                  setSubmittingAction(true);
                  await bolnaAPI.updateInterviewOutcome(
                    selectedInterviewForAction.executionId,
                    actionType,
                    feedback
                  );

                  toast.success(
                    `Candidate ${
                      actionType === "offer" ? "offered" : "rejected"
                    } successfully!`
                  );
                  setOfferRejectDialogOpen(false);
                  setSelectedInterviewForAction(null);
                  setActionType("");
                  setFeedback("");

                  // Refresh interviews and offers/rejected lists
                  await fetchInterviews();
                  await fetchOffers();
                  await fetchRejected();
                } catch (err) {
                  console.error("Error updating interview outcome:", err);
                  toast.error(
                    err.message || "Failed to update interview outcome"
                  );
                } finally {
                  setSubmittingAction(false);
                }
              }}
              disabled={!actionType || !feedback.trim() || submittingAction}
              className={`bg-linear-to-r text-white border-0 ${
                actionType === "offer"
                  ? "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  : "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submittingAction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  {actionType === "offer" ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Send Offer
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Reject Candidate
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Details Dialog */}
      <Dialog
        open={interviewDetailsDialogOpen}
        onOpenChange={setInterviewDetailsDialogOpen}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 border-white/70 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                <Calendar className="h-6 w-6 text-indigo-600" />
              </div>
              Interview Details
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Complete information about the scheduled interview
            </DialogDescription>
          </DialogHeader>

          {selectedInterviewDetails ? (
            <div className="space-y-6 mt-6">
              {/* Candidate Information */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                  Candidate Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Name
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedInterviewDetails.candidateId?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Email
                    </p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <p className="text-sm text-slate-900">
                        {selectedInterviewDetails.candidateId?.email || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Phone
                    </p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <p className="text-sm text-slate-900">
                        {selectedInterviewDetails.candidateId?.phone_no || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Role
                    </p>
                    <p className="text-sm text-slate-900">
                      {selectedInterviewDetails.candidateId?.role?.join(", ") || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Experience
                    </p>
                    <p className="text-sm text-slate-900">
                      {selectedInterviewDetails.candidateId?.experience !== undefined
                        ? `${selectedInterviewDetails.candidateId.experience} years`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Screening Score
                    </p>
                    {selectedInterviewDetails.screeningScore !== null &&
                    selectedInterviewDetails.screeningScore !== undefined ? (
                      <div
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                          Math.round(selectedInterviewDetails.screeningScore) / 100
                        )}`}
                      >
                        {Math.round(selectedInterviewDetails.screeningScore)}%
                      </div>
                    ) : (
                      <span className="text-sm text-slate-600">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Interview Schedule */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                  Interview Schedule
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Interview Start Time
                    </p>
                    <p className="text-sm text-slate-900">
                      {selectedInterviewDetails.interviewTime
                        ? formatFullDateTimeWithAMPM(
                            new Date(selectedInterviewDetails.interviewTime)
                          )
                        : "Not scheduled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Interview End Time
                    </p>
                    <p className="text-sm text-slate-900">
                      {selectedInterviewDetails.interviewEndTime
                        ? formatFullDateTimeWithAMPM(
                            new Date(selectedInterviewDetails.interviewEndTime)
                          )
                        : selectedInterviewDetails.interviewTime
                        ? "Not set"
                        : "Not scheduled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Email Sent At
                    </p>
                    <p className="text-sm text-slate-900">
                      {selectedInterviewDetails.emailSentAt
                        ? formatFullDateTimeWithAMPM(
                            new Date(selectedInterviewDetails.emailSentAt)
                          )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Interview Status
                    </p>
                    {(() => {
                      const now = new Date();
                      const interviewTime = selectedInterviewDetails.interviewTime
                        ? new Date(selectedInterviewDetails.interviewTime)
                        : null;
                      const interviewEndTime = selectedInterviewDetails.interviewEndTime
                        ? new Date(selectedInterviewDetails.interviewEndTime)
                        : null;
                      const emailSent = selectedInterviewDetails.emailSent;

                      // If email is sent and interview time exists
                      if (emailSent && interviewTime) {
                        // If current time is before interview start time -> Pending
                        if (now < interviewTime) {
                          return (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500 text-white">
                              <Clock className="h-3 w-3" />
                              Pending
                            </div>
                          );
                        }
                        // If interview end time exists and current time is between start and end -> Running
                        else if (interviewEndTime && now >= interviewTime && now <= interviewEndTime) {
                          return (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">
                              <Clock className="h-3 w-3" />
                              Running
                            </div>
                          );
                        }
                        // If current time is after end time (or no end time and after start time) -> Completed
                        else if (interviewEndTime ? now > interviewEndTime : now > interviewTime) {
                          return (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </div>
                          );
                        }
                      }
                      // If email not sent or no interview time
                      return (
                        <span className="text-sm text-slate-600">Not scheduled</span>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1.5 font-medium">
                      Call Status
                    </p>
                    <div
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        selectedInterviewDetails.status === "completed"
                          ? "bg-green-500 text-white"
                          : selectedInterviewDetails.status === "stopped" ||
                            selectedInterviewDetails.status === "cancelled"
                          ? "bg-red-500 text-white"
                          : selectedInterviewDetails.status === "in_progress"
                          ? "bg-yellow-500 text-white"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {selectedInterviewDetails.status || "Unknown"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Meeting Details */}
              {selectedInterviewDetails.meetLink && (
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                    Meeting Link
                  </h3>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-500" />
                    <a
                      href={selectedInterviewDetails.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-800 underline break-all"
                    >
                      {selectedInterviewDetails.meetLink}
                    </a>
                  </div>
                </div>
              )}

              {/* Recruiter Information */}
              {selectedInterviewDetails.assignRecruiter && (
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                    Assigned Recruiter
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 mb-1.5 font-medium">
                        Name
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedInterviewDetails.assignRecruiter?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1.5 font-medium">
                        Email
                      </p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <p className="text-sm text-slate-900">
                          {selectedInterviewDetails.assignRecruiter?.email || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Interview Outcome */}
              {selectedInterviewDetails.interviewOutcome && (
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                    Interview Outcome
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-600 mb-1.5 font-medium">
                        Outcome
                      </p>
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          selectedInterviewDetails.interviewOutcome === "offer"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {selectedInterviewDetails.interviewOutcome === "offer"
                          ? "Offer Sent"
                          : "Rejected"}
                      </div>
                    </div>
                    {selectedInterviewDetails.interviewFeedback && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1.5 font-medium">
                          Feedback
                        </p>
                        <p className="text-sm text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200">
                          {selectedInterviewDetails.interviewFeedback}
                        </p>
                      </div>
                    )}
                    {selectedInterviewDetails.interviewOutcomeAt && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1.5 font-medium">
                          Outcome Date
                        </p>
                        <p className="text-sm text-slate-900">
                          {formatFullDateTimeWithAMPM(
                            new Date(selectedInterviewDetails.interviewOutcomeAt)
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
