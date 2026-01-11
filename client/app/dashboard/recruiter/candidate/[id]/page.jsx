"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { bolnaAPI, candidateAPI, recruiterTasksAPI } from "@/lib/api";
import { formatFullDateTimeWithAMPM } from "@/lib/timeFormatter";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Edit,
  FileText,
  Github,
  Globe,
  Linkedin,
  Mail,
  Phone,
  PhoneCall,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CandidateDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const candidateId = params.id;
  const { sidebarOpen, setSidebarOpen } = useSidebarState();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingAppliedJobs, setLoadingAppliedJobs] = useState(false);
  const [loadingScreenings, setLoadingScreenings] = useState(false);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [callDetailsDialogOpen, setCallDetailsDialogOpen] = useState(false);
  const [selectedCallDetails, setSelectedCallDetails] = useState(null);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_no: "",
    skills: "",
    experience: "",
    role: "",
    currentCTC: "",
    expectedCTC: "",
    location: "",
    lookingForJobChange: "",
    availabilityForInterview: "",
    joinDate: "",
    overallNote: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && !["recruiter", "admin", "manager"].includes(user.role)) {
      router.push(`/dashboard/${user.role}`);
    } else if (user && candidateId) {
      fetchCandidate();
    }
  }, [user, authLoading, candidateId, router]);

  // Fetch top matches when tab is active
  useEffect(() => {
    if (
      candidate &&
      activeTab === "top-matches" &&
      matchedJobs.length === 0 &&
      !loadingJobs
    ) {
      fetchMatchedJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, activeTab]);

  // Fetch applied jobs when tab is active (don't refresh matches)
  useEffect(() => {
    if (
      candidate &&
      activeTab === "applied-jobs" &&
      appliedJobs.length === 0 &&
      !loadingAppliedJobs
    ) {
      fetchAppliedJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, activeTab]);

  // Fetch applied jobs when tab is active
  useEffect(() => {
    if (
      candidate &&
      activeTab === "applied-jobs" &&
      appliedJobs.length === 0 &&
      !loadingAppliedJobs
    ) {
      fetchAppliedJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, activeTab]);

  // Fetch screenings when screenings tab is active
  useEffect(() => {
    if (candidate && activeTab === "screenings" && !loadingScreenings) {
      fetchScreenings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, activeTab]);

  // Fetch interviews when interviews tab is active
  useEffect(() => {
    if (candidate && activeTab === "interviews" && !loadingInterviews) {
      fetchInterviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, activeTab]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await candidateAPI.getCandidateById(candidateId);
      setCandidate(response);
      // Fetch matched jobs after candidate is loaded (for details tab)
      if (activeTab === "details") {
        fetchMatchedJobs();
      }
    } catch (err) {
      console.error("Error fetching candidate:", err);
      setError(err.message || "Failed to load candidate");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (candidate) {
      setFormData({
        name: candidate.name || "",
        email: candidate.email || "",
        phone_no: candidate.phone_no || "",
        skills: candidate.skills?.join(", ") || "",
        experience: candidate.experience?.toString() || "",
        role: candidate.role?.join(", ") || "",
        currentCTC: candidate.currentCTC || "",
        expectedCTC: candidate.expectedCTC || "",
        location: candidate.location || "",
        lookingForJobChange: candidate.lookingForJobChange || "",
        availabilityForInterview: candidate.availabilityForInterview || "",
        joinDate: candidate.joinDate || "",
        overallNote: candidate.overallNote || "",
      });
      setError(null);
      setEditModalOpen(true);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const candidateData = {
        name: formData.name,
        email: formData.email,
        phone_no: formData.phone_no || undefined,
        skills: formData.skills
          ? formData.skills
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s)
          : [],
        experience: formData.experience
          ? parseFloat(formData.experience)
          : undefined,
        role: formData.role
          ? formData.role
              .split(",")
              .map((r) => r.trim())
              .filter((r) => r)
          : [],
        currentCTC: formData.currentCTC || undefined,
        expectedCTC: formData.expectedCTC || undefined,
        location: formData.location || undefined,
        lookingForJobChange: formData.lookingForJobChange || undefined,
        availabilityForInterview: formData.availabilityForInterview || undefined,
        joinDate: formData.joinDate || undefined,
        overallNote: formData.overallNote || undefined,
      };

      await candidateAPI.updateCandidate(candidateId, candidateData);
      toast.success("Candidate updated successfully!");
      setEditModalOpen(false);
      // Refresh candidate data
      await fetchCandidate();
    } catch (err) {
      console.error("Error updating candidate:", err);
      setError(err.message || "Failed to update candidate");
      toast.error(err.message || "Failed to update candidate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await candidateAPI.deleteCandidate(candidateId);
      toast.success("Candidate deleted successfully!");
      setDeleteDialogOpen(false);
      // Redirect to candidates list
      const role = user?.role || "recruiter";
      router.push(`/dashboard/${role}/candidate`);
    } catch (err) {
      console.error("Error deleting candidate:", err);
      setError(err.message || "Failed to delete candidate");
      toast.error(err.message || "Failed to delete candidate");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchMatchedJobs = async () => {
    try {
      setLoadingJobs(true);

      // Only refresh if we don't have any matches yet (first load)
      // This prevents resetting applied status on subsequent visits
      if (matchedJobs.length === 0) {
        try {
          await candidateAPI.refreshCandidateMatches(candidateId);
        } catch (refreshErr) {
          // Log but don't fail - continue to fetch existing matches
          console.warn("Error refreshing candidate matches:", refreshErr);
        }
      }

      // Then fetch the updated matches
      const response = await candidateAPI.getCandidateMatchedJobs(candidateId);
      // Filter out any matches with null or undefined jobId
      const validMatches = (response.matches || []).filter(
        (match) => match && match.jobId
      );
      // Sort by match score descending
      const sortedMatches = validMatches.sort(
        (a, b) => (b.matchScore || 0) - (a.matchScore || 0)
      );
      setMatchedJobs(sortedMatches);
    } catch (err) {
      console.error("Error fetching matched jobs:", err);
      setMatchedJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchScreenings = async () => {
    if (!candidateId) return;

    try {
      setLoadingScreenings(true);
      // Use the new API endpoint to get candidate screenings
      const response = await recruiterTasksAPI.getCandidateScreenings(
        candidateId
      );
      const screeningsData = response.screenings || [];

      // Optionally fetch call details for each screening
      const screeningDataWithDetails = await Promise.all(
        screeningsData.map(async (screening) => {
          // Check for executionId in multiple possible locations
          const executionId =
            screening.executionId ||
            screening.bolna_call_id?.executionId ||
            screening.bolna_call_id?._id?.executionId;

          if (executionId) {
            try {
              const callResponse = await bolnaAPI.getCallStatus(executionId);
              return {
                ...screening,
                callDetails: callResponse,
              };
            } catch (err) {
              console.error("Error fetching call details:", err);
              // Still include the screening even if call details fail
              return screening;
            }
          }
          return screening;
        })
      );

      setScreenings(screeningDataWithDetails);
    } catch (err) {
      console.error("Error fetching screenings:", err);
      toast.error(err.message || "Failed to load screenings");
      setScreenings([]);
    } finally {
      setLoadingScreenings(false);
    }
  };

  const fetchAppliedJobs = async () => {
    if (!candidateId) return;

    try {
      setLoadingAppliedJobs(true);
      const response = await candidateAPI.getCandidateAppliedJobs(candidateId);
      const appliedJobsData = response.appliedJobs || [];
      setAppliedJobs(appliedJobsData);
    } catch (err) {
      console.error("Error fetching applied jobs:", err);
      toast.error(err.message || "Failed to load applied jobs");
      setAppliedJobs([]);
    } finally {
      setLoadingAppliedJobs(false);
    }
  };

  const fetchInterviews = async () => {
    if (!candidateId) return;

    try {
      setLoadingInterviews(true);
      // Use the new API endpoint to get candidate interviews
      const response = await recruiterTasksAPI.getCandidateInterviews(
        candidateId
      );
      const interviewsData = response.interviews || [];

      setInterviews(interviewsData);
    } catch (err) {
      console.error("Error fetching interviews:", err);
      toast.error(err.message || "Failed to load interviews");
      setInterviews([]);
    } finally {
      setLoadingInterviews(false);
    }
  };

  const handleJobClick = (jobId) => {
    const role = user?.role || "recruiter";
    router.push(`/dashboard/${role}/manage-job-posting/${jobId}`);
  };

  const handleViewCallDetails = async (executionId) => {
    if (!executionId) {
      toast.error("No call execution ID available");
      return;
    }

    try {
      setLoadingCallDetails(true);
      setCallDetailsDialogOpen(true);
      const response = await bolnaAPI.getCallStatus(executionId);
      console.log("Call details response:", response);
      console.log("Execution data:", response.execution);
      console.log("Transcript:", response.execution?.transcript);
      setSelectedCallDetails(response);
    } catch (err) {
      console.error("Error fetching call details:", err);
      toast.error(err.message || "Failed to load call details.");
      setCallDetailsDialogOpen(false);
    } finally {
      setLoadingCallDetails(false);
    }
  };

  const getMatchScoreColor = (score) => {
    if (score >= 0.8) return "bg-green-500 text-white";
    if (score >= 0.6) return "bg-blue-500 text-white";
    if (score >= 0.4) return "bg-yellow-500 text-white";
    return "bg-gray-500 text-white";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white";
      case "scheduled":
        return "bg-blue-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      case "rescheduled":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const parseTranscript = (transcriptText) => {
    if (!transcriptText || typeof transcriptText !== "string") {
      return [];
    }

    const parts = transcriptText.split(/(?=assistant:|user:)/i);
    const messages = [];

    parts.forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;

      if (trimmed.toLowerCase().startsWith("assistant:")) {
        const message = trimmed.substring(10).trim();
        if (message) {
          messages.push({ speaker: "assistant", message });
        }
      } else if (trimmed.toLowerCase().startsWith("user:")) {
        const message = trimmed.substring(5).trim();
        if (message) {
          messages.push({ speaker: "user", message });
        }
      }
    });

    return messages;
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

  if (error || !candidate) {
    return (
      <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
        <GlassBackground />
        <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden items-center justify-center p-8">
          <Card className="max-w-md border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
            <CardContent className="pt-6 text-center">
              <p className="text-red-900">{error || "Candidate not found"}</p>
              <Button
                className="mt-4"
                onClick={() => {
                  const role = user?.role || "recruiter";
                  router.push(`/dashboard/${role}/candidate`);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Candidates
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                router.push(`/dashboard/${role}/candidate`);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Candidates
            </Button>

            {/* Candidate Header */}
            <div className="mb-6 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.25)] p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-16 w-16 rounded-full bg-linear-to-br from-cyan-400 to-blue-500 flex items-center justify-center border-4 border-white shadow-lg shadow-cyan-500/40">
                    <span className="text-2xl font-bold text-white">
                      {candidate.name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      {candidate.name}
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      {candidate.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={openEditModal}
                    className="cursor-pointer rounded-lg border-indigo-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setDeleteDialogOpen(true);
                    }}
                    className="cursor-pointer rounded-lg border-red-200 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Candidate Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Role</p>
                  <p className="text-sm font-medium text-slate-900">
                    {candidate.role?.join(", ") || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    Experience
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {candidate.experience !== undefined
                      ? `${candidate.experience} years`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Phone</p>
                  <p className="text-sm font-medium text-slate-900">
                    {candidate.phone_no || "N/A"}
                  </p>
                </div>
                {/* <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    Expected CTC
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {candidate.expected_ctc
                      ? `₹${candidate.expected_ctc} LPA`
                      : "N/A"}
                  </p>
                </div> */}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 mb-4 flex">
              <div className="inline-flex rounded-full bg-slate-100/70 border border-white/70 p-1 shadow-inner shadow-white/40">
                {[
                  { id: "details", label: "Details" },
                  { id: "top-matches", label: "Top Matches" },
                  { id: "applied-jobs", label: "Applied Jobs" },
                  { id: "screenings", label: "Screenings" },
                  { id: "interviews", label: "Interviews" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (
                        tab.id === "top-matches" &&
                        matchedJobs.length === 0
                      ) {
                        fetchMatchedJobs();
                      }
                      if (
                        tab.id === "applied-jobs" &&
                        appliedJobs.length === 0
                      ) {
                        fetchAppliedJobs();
                      }
                    }}
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
                  <CardTitle>Candidate Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Full Name
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {candidate.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Email
                      </p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <p className="text-sm font-medium text-slate-900">
                          {candidate.email || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Phone Number
                      </p>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-500" />
                        <p className="text-sm font-medium text-slate-900">
                          {candidate.phone_no || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Experience
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {candidate.experience !== undefined
                          ? `${candidate.experience} years`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Roles */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-2">
                      Roles
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.role && candidate.role.length > 0 ? (
                        candidate.role.map((role, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="capitalize px-3 py-1"
                          >
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-slate-400 text-sm">
                          No roles specified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-2">
                      Skills Matrix
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills && candidate.skills.length > 0 ? (
                        candidate.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-sm">
                          No skills specified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {candidate.bio && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-2">
                        Bio
                      </p>
                      <p className="text-slate-900 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        {candidate.bio}
                      </p>
                    </div>
                  )}

                  {/* Resume */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Resume
                    </p>
                    {candidate.resume_url ? (
                      <a
                        href={candidate.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 transition-colors font-medium"
                      >
                        <FileText className="h-5 w-5" />
                        <span>View Resume</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-sm">
                        No resume available
                      </span>
                    )}
                  </div>

                  {/* Social Links */}
                  {(candidate.social_links?.linkedin ||
                    candidate.social_links?.github ||
                    candidate.social_links?.portfolio) && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-2">
                        Social Links
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {candidate.social_links?.linkedin && (
                          <a
                            href={candidate.social_links.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors font-medium"
                          >
                            <Linkedin className="h-5 w-5" />
                            <span>LinkedIn</span>
                          </a>
                        )}
                        {candidate.social_links?.github && (
                          <a
                            href={candidate.social_links.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-slate-900 hover:text-slate-700 transition-colors font-medium"
                          >
                            <Github className="h-5 w-5" />
                            <span>GitHub</span>
                          </a>
                        )}
                        {candidate.social_links?.portfolio && (
                          <a
                            href={candidate.social_links.portfolio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 transition-colors font-medium"
                          >
                            <Globe className="h-5 w-5" />
                            <span>Portfolio</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Candidate Information */}
                  <div className="border-t border-slate-200 pt-6 mt-6">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase mb-4">
                      Additional Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">
                          Current CTC
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {candidate.currentCTC || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">
                          Expected CTC
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {candidate.expectedCTC || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">
                          Location
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {candidate.location || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">
                          Looking for Job Change
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {candidate.lookingForJobChange || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">
                          Availability for Interview
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {candidate.availabilityForInterview || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">
                          Join Date
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {candidate.joinDate || "N/A"}
                        </p>
                      </div>
                    </div>
                    {candidate.overallNote && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-500 uppercase mb-2">
                          Overall Note
                        </p>
                        <p className="text-slate-900 bg-slate-50 p-4 rounded-lg border border-slate-200">
                          {candidate.overallNote}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "top-matches" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-600" />
                    Top Job Matches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingJobs ? (
                    <div className="text-center py-8">
                      <Loading />
                    </div>
                  ) : matchedJobs.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      No matching jobs found
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {matchedJobs.map((match) => {
                        const job = match.jobId;
                        if (!job) return null;

                        const matchPercentage = Math.round(
                          (match.matchScore || 0) * 100
                        );
                        return (
                          <div
                            key={match._id || Math.random()}
                            onClick={() => job._id && handleJobClick(job._id)}
                            className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 hover:border-cyan-300 transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-slate-900">
                                    {job.title || "Untitled Job"}
                                  </h3>
                                  <div
                                    className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${getMatchScoreColor(
                                      match.matchScore || 0
                                    )}`}
                                  >
                                    {matchPercentage}%
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <span className="font-medium">
                                    {job.company || "N/A"}
                                  </span>
                                  {job.ctc && (
                                    <span className="flex items-center gap-1">
                                      <span>₹{job.ctc}</span>
                                    </span>
                                  )}
                                  {job.exp_req !== undefined && (
                                    <span>
                                      {job.exp_req}{" "}
                                      {job.exp_req === 1 ? "year" : "years"} exp
                                    </span>
                                  )}
                                </div>
                                {job.role && job.role.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {job.role.map((role, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {role}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "applied-jobs" && (
              <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Applied Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAppliedJobs ? (
                    <div className="text-center py-8">
                      <Loading />
                    </div>
                  ) : appliedJobs.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      No applied jobs found
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {appliedJobs.map((appliedJob) => {
                        const job = appliedJob.jobId;
                        if (!job) return null;

                        const matchPercentage = Math.round(
                          (appliedJob.matchScore || 0) * 100
                        );
                        const appliedDate = appliedJob.matchedAt
                          ? new Date(appliedJob.matchedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "N/A";

                        return (
                          <div
                            key={appliedJob._id || Math.random()}
                            onClick={() => job._id && handleJobClick(job._id)}
                            className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 hover:border-green-300 transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-slate-900">
                                    {job.title || "Untitled Job"}
                                  </h3>
                                  <Badge
                                    variant="default"
                                    className="bg-green-500 text-white"
                                  >
                                    Applied
                                  </Badge>
                                  <div
                                    className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${getMatchScoreColor(
                                      appliedJob.matchScore || 0
                                    )}`}
                                  >
                                    {matchPercentage}%
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                                  <span className="font-medium">
                                    {job.company || "N/A"}
                                  </span>
                                  {job.ctc && (
                                    <span className="flex items-center gap-1">
                                      <span>₹{job.ctc}</span>
                                    </span>
                                  )}
                                  {job.exp_req !== undefined && (
                                    <span>
                                      {job.exp_req}{" "}
                                      {job.exp_req === 1 ? "year" : "years"} exp
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mb-2">
                                  Applied on: {appliedDate}
                                </div>
                                {job.role && job.role.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {job.role.map((role, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {role}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                      No completed screenings found
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job Title</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Scheduled At</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Call Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {screenings.map((screening, index) => {
                          const job = screening.job_id || {
                            title: screening.job_title,
                            company: screening.job_company,
                          };
                          const callDetails = screening.callDetails;
                          return (
                            <TableRow key={screening._id || index}>
                              <TableCell>
                                <p className="font-medium text-slate-900">
                                  {job?.title || "N/A"}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-slate-600">
                                  {job?.company || "N/A"}
                                </p>
                              </TableCell>
                              <TableCell>
                                {screening.call_scheduled_at ? (
                                  <p className="text-sm text-slate-600">
                                    {formatFullDateTimeWithAMPM(
                                      screening.call_scheduled_at
                                    )}
                                  </p>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                    screening.status
                                  )}`}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  {screening.status || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell>
                                {screening.executionId ||
                                screening.bolna_call_id?.executionId ||
                                callDetails?.call?.executionId ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleViewCallDetails(
                                        screening.executionId ||
                                          screening.bolna_call_id
                                            ?.executionId ||
                                          callDetails?.call?.executionId
                                      )
                                    }
                                  >
                                    <PhoneCall className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                ) : (
                                  <span className="text-sm text-slate-400">
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
                      No interviews scheduled
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job Title</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Interview Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interviews.map((interview, index) => {
                          const job = interview.job_id || {
                            title: interview.job_title,
                            company: interview.job_company,
                          };
                          return (
                            <TableRow key={interview._id || index}>
                              <TableCell>
                                <p className="font-medium text-slate-900">
                                  {job?.title || "N/A"}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-slate-600">
                                  {job?.company || "N/A"}
                                </p>
                              </TableCell>
                              <TableCell>
                                {interview.interview_time ? (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-500" />
                                    <p className="text-sm text-slate-600">
                                      {formatFullDateTimeWithAMPM(
                                        interview.interview_time
                                      )}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                    interview.status
                                  )}`}
                                >
                                  {interview.status === "completed" && (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                  {interview.status || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-slate-600 max-w-xs truncate">
                                  {interview.notes || "No notes"}
                                </p>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <PhoneCall className="h-6 w-6 text-cyan-600" />
              Call Details
            </DialogTitle>
          </DialogHeader>

          {loadingCallDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loading />
            </div>
          ) : selectedCallDetails ? (
            <div className="space-y-6 mt-6">
              {/* Call Status */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase">
                    Call Status
                  </h3>
                  <div
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
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
              {selectedCallDetails.call?.callScheduledAt && (
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase">
                    Schedule Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </div>
              )}

              {/* Transcript */}
              {(() => {
                // Check multiple possible locations for transcript
                const transcript =
                  selectedCallDetails.execution?.transcript ||
                  selectedCallDetails.execution?.data?.transcript ||
                  selectedCallDetails.transcript ||
                  selectedCallDetails.execution?.result?.transcript;

                if (transcript) {
                  const parsedMessages = parseTranscript(transcript);
                  if (parsedMessages.length > 0) {
                    return (
                      <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase">
                          Transcript
                        </h3>
                        <div className="p-4 bg-slate-50 rounded-lg text-sm max-h-60 overflow-y-auto border border-slate-200">
                          <div className="space-y-3">
                            {parsedMessages.map((item, index) => (
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
                    );
                  }
                }
                return (
                  <div className="p-5 rounded-xl border border-slate-200 bg-white">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase">
                      Transcript
                    </h3>
                    <p className="text-sm text-slate-600 text-center py-4">
                      No transcript available for this call.
                    </p>
                    {process.env.NODE_ENV === "development" && (
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer">Debug Info</summary>
                        <pre className="mt-2 p-2 bg-slate-100 rounded overflow-auto max-h-40">
                          {JSON.stringify(
                            {
                              hasExecution: !!selectedCallDetails.execution,
                              executionKeys: selectedCallDetails.execution
                                ? Object.keys(selectedCallDetails.execution)
                                : [],
                              fullResponse: selectedCallDetails,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-slate-600">
                No call details available
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Candidate Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <div className="p-2 rounded-lg bg-linear-to-br from-cyan-400/20 to-blue-500/20">
                <Edit className="h-6 w-6 text-cyan-600" />
              </div>
              Edit Candidate
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Update the candidate information below
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-slate-900 font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Enter full name"
                required
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-email"
                className="text-slate-900 font-medium"
              >
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="Enter email address"
                required
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-phone"
                className="text-slate-900 font-medium"
              >
                Phone Number
              </Label>
              <Input
                id="edit-phone"
                name="phone_no"
                type="tel"
                value={formData.phone_no}
                onChange={handleFormChange}
                placeholder="Enter phone number"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-experience"
                className="text-slate-900 font-medium"
              >
                Experience (Years)
              </Label>
              <Input
                id="edit-experience"
                name="experience"
                type="number"
                min="0"
                step="0.5"
                value={formData.experience}
                onChange={handleFormChange}
                placeholder="Enter years of experience"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-slate-900 font-medium">
                Roles
              </Label>
              <Textarea
                id="edit-role"
                name="role"
                value={formData.role}
                onChange={handleFormChange}
                placeholder="Enter roles separated by commas (e.g., Frontend, Backend, Full-stack)"
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-900 rounded-md focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/70"
              />
              <p className="text-xs text-slate-500">
                Separate multiple roles with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-skills"
                className="text-slate-900 font-medium"
              >
                Skills
              </Label>
              <Input
                id="edit-skills"
                name="skills"
                type="text"
                value={formData.skills}
                onChange={handleFormChange}
                placeholder="Enter skills separated by commas (e.g., React, Node.js, Python)"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
              <p className="text-xs text-slate-500">
                Separate multiple skills with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-currentCTC"
                className="text-slate-900 font-medium"
              >
                Current CTC
              </Label>
              <Input
                id="edit-currentCTC"
                name="currentCTC"
                type="text"
                value={formData.currentCTC}
                onChange={handleFormChange}
                placeholder="e.g., 10 LPA or ₹10 LPA"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-expectedCTC"
                className="text-slate-900 font-medium"
              >
                Expected CTC
              </Label>
              <Input
                id="edit-expectedCTC"
                name="expectedCTC"
                type="text"
                value={formData.expectedCTC}
                onChange={handleFormChange}
                placeholder="e.g., 15 LPA or ₹15 LPA"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-location"
                className="text-slate-900 font-medium"
              >
                Location
              </Label>
              <Input
                id="edit-location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleFormChange}
                placeholder="Enter current location"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-lookingForJobChange"
                className="text-slate-900 font-medium"
              >
                Looking for Job Change
              </Label>
              <Input
                id="edit-lookingForJobChange"
                name="lookingForJobChange"
                type="text"
                value={formData.lookingForJobChange}
                onChange={handleFormChange}
                placeholder="Are you looking for any job change?"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-availabilityForInterview"
                className="text-slate-900 font-medium"
              >
                Availability for Interview
              </Label>
              <Input
                id="edit-availabilityForInterview"
                name="availabilityForInterview"
                type="text"
                value={formData.availabilityForInterview}
                onChange={handleFormChange}
                placeholder="What's your availability to join for Interview Call?"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-joinDate"
                className="text-slate-900 font-medium"
              >
                Join Date
              </Label>
              <Input
                id="edit-joinDate"
                name="joinDate"
                type="text"
                value={formData.joinDate}
                onChange={handleFormChange}
                placeholder="How soon can you able to join?"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-overallNote"
                className="text-slate-900 font-medium"
              >
                Overall Note
              </Label>
              <Textarea
                id="edit-overallNote"
                name="overallNote"
                value={formData.overallNote}
                onChange={handleFormChange}
                placeholder="Any additional notes about the candidate"
                rows={4}
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditModalOpen(false);
                  setError(null);
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
                {isSubmitting ? "Updating..." : "Update Candidate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl text-slate-900">
              <div className="p-2 rounded-lg bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              Delete Candidate
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {candidate?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setError(null);
              }}
              className="border-slate-200 hover:bg-slate-50"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
