"use client";

import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Loading from "@/components/ui/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { bolnaAPI, candidateAPI, recruiterTasksAPI } from "@/lib/api";
import { formatFullDateTimeWithAMPM } from "@/lib/timeFormatter";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Github,
  Globe,
  Linkedin,
  Mail,
  Phone,
  PhoneCall,
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
  const [screenings, setScreenings] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingScreenings, setLoadingScreenings] = useState(false);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [callDetailsDialogOpen, setCallDetailsDialogOpen] = useState(false);
  const [selectedCallDetails, setSelectedCallDetails] = useState(null);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);

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

  const fetchMatchedJobs = async () => {
    try {
      setLoadingJobs(true);
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
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center p-8">
          <Card className="max-w-md">
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
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          title=""
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <Button
              variant="outline"
              className="mb-6 cursor-pointer"
              onClick={() => {
                const role = user?.role || "recruiter";
                router.push(`/dashboard/${role}/candidate`);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {/* Candidate Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {candidate.name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                      {candidate.name}
                    </h1>
                    <p className="text-slate-600 mt-1">{candidate.email}</p>
                  </div>
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
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    Expected CTC
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {candidate.expected_ctc
                      ? `₹${candidate.expected_ctc} LPA`
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-slate-200 mb-6">
                {[
                  { id: "details", label: "Details" },
                  { id: "top-matches", label: "Top Matches" },
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
                    }}
                    className={`px-6 py-3 text-sm font-medium transition-colors cursor-pointer ${
                      activeTab === tab.id
                        ? "border-b-2 border-blue-600 text-blue-600"
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
              <Card>
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
                </CardContent>
              </Card>
            )}

            {activeTab === "top-matches" && (
              <Card>
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

            {activeTab === "screenings" && (
              <Card>
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
                          const job = screening.job_id;
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
              <Card>
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
                          const job = interview.job_id;
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
    </div>
  );
}
