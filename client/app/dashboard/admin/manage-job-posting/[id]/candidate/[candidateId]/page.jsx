"use client";

import { GlassBackground } from "@/components/GlassShell";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { bolnaAPI, candidateAPI, candidateProgressAPI, jobPostingAPI } from "@/lib/api";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STAGES = [
  { key: "applied", label: "Applied", icon: Briefcase },
  { key: "screening", label: "Screening", icon: Clock },
  { key: "interviews", label: "Interviews", icon: CheckCircle2 },
  { key: "offer", label: "Offer", icon: Briefcase },
  { key: "rejected", label: "Rejected", icon: XCircle },
];

export default function CandidateProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id;
  const candidateId = params.candidateId;
  const { sidebarOpen, setSidebarOpen } = useSidebarState();

  const [progress, setProgress] = useState(null);
  const [jobPosting, setJobPosting] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [bolnaCallData, setBolnaCallData] = useState(null);
  const [loadingBolnaCall, setLoadingBolnaCall] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== "admin") {
        router.push(`/dashboard/${user.role}`);
        return;
      }
      fetchData();
    }
  }, [authLoading, user, jobId, candidateId, router]);

  useEffect(() => {
    if (candidate && matchedJobs.length === 0) {
      fetchMatchedJobs();
    }
  }, [candidate]);

  useEffect(() => {
    if (jobId && candidateId) {
      fetchBolnaCallData();
    }
  }, [jobId, candidateId]);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [progressRes, jobRes, candidateRes] = await Promise.all([
        candidateProgressAPI.getOrCreateProgress(candidateId, jobId),
        jobPostingAPI.getJobPostingById(jobId),
        candidateAPI.getCandidateById(candidateId),
      ]);
      setProgress(progressRes.progress);
      setJobPosting(jobRes);
      setCandidate(candidateRes);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(error.message || "Failed to load candidate progress");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchMatchedJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await candidateAPI.getCandidateMatchedJobs(candidateId);
      const validMatches = (response.matches || []).filter(
        (match) => match && match.jobId
      );
      const sortedMatches = validMatches
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 5);
      setMatchedJobs(sortedMatches);
    } catch (error) {
      console.error("Error fetching matched jobs:", error);
      setMatchedJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchBolnaCallData = async () => {
    try {
      setLoadingBolnaCall(true);
      // Get all calls for this job and candidate
      const [screeningsRes, interviewsRes] = await Promise.all([
        bolnaAPI.getJobScreenings(jobId).catch(() => ({ screenings: [] })),
        bolnaAPI.getJobInterviews(jobId).catch(() => ({ interviews: [] })),
      ]);

      // Find the call for this specific candidate
      const candidateIdStr = candidateId.toString();
      const screening = (screeningsRes.screenings || []).find(
        (s) =>
          (s.candidateId?._id?.toString() || s.candidateId?.toString()) ===
          candidateIdStr
      );
      const interview = (interviewsRes.interviews || []).find(
        (i) =>
          (i.candidateId?._id?.toString() || i.candidateId?.toString()) ===
          candidateIdStr
      );

      setBolnaCallData({
        screening,
        interview,
      });
    } catch (error) {
      console.error("Error fetching BolnaCall data:", error);
      setBolnaCallData(null);
    } finally {
      setLoadingBolnaCall(false);
    }
  };

  const getStageStatus = (stage) => {
    // Sync with BolnaCall data to match job posting page tabs
    // This ensures the progress shown here matches which tab the candidate appears in on the job posting page
    if (bolnaCallData) {
      const { screening, interview } = bolnaCallData;

      // Rejected stage - check interview outcome first
      if (stage === "rejected") {
        return interview?.interviewOutcome === "reject" ? "completed" : "pending";
      }

      // Offer stage - check interview outcome
      if (stage === "offer") {
        return interview?.interviewOutcome === "offer" ? "completed" : "pending";
      }

      // Interviews stage - candidate appears in interviews tab if emailSent is true
      if (stage === "interviews") {
        // If interview exists and emailSent is true, interviews stage is completed
        // Also, if they have an offer or rejection, they must have completed interviews
        if (
          interview?.emailSent === true ||
          interview?.interviewOutcome === "offer" ||
          interview?.interviewOutcome === "reject"
        ) {
          return "completed";
        }
        return "pending";
      }

      // Screening stage - candidate appears in screenings tab if screeningStatus is completed
      if (stage === "screening") {
        // If screening is completed, or if they've moved to interviews/offer/rejected, screening must be completed
        if (
          screening?.screeningStatus === "completed" ||
          interview?.emailSent === true ||
          interview?.interviewOutcome === "offer" ||
          interview?.interviewOutcome === "reject"
        ) {
          return "completed";
        }
        return "pending";
      }

      // Applied stage - always completed if we have any data
      if (stage === "applied") {
        return "completed";
      }
    }
    // Fallback to progress data
    return progress?.[stage]?.status || "pending";
  };

  const isStageCompleted = (stage) => {
    return getStageStatus(stage) === "completed";
  };

  const isStageEnabled = (stage) => {
    if (stage === "rejected") return true;
    const stageIndex = STAGES.findIndex((s) => s.key === stage);
    if (stageIndex === 0) return true;
    for (let i = 0; i < stageIndex; i++) {
      const prevStage = STAGES[i].key;
      if (prevStage !== "rejected" && !isStageCompleted(prevStage)) {
        return false;
      }
    }
    return true;
  };

  const getCompletedStagesCount = () => {
    return STAGES.filter(
      (stage) => stage.key !== "rejected" && isStageCompleted(stage.key)
    ).length;
  };

  const progressPercentage = () => {
    const totalStages = STAGES.filter((s) => s.key !== "rejected").length;
    return (getCompletedStagesCount() / totalStages) * 100;
  };

  const getCurrentStage = () => {
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (isStageCompleted(STAGES[i].key) && STAGES[i].key !== "rejected") {
        return STAGES[i].key;
      }
    }
    return "applied";
  };

  const handleJobClick = (jobId) => {
    router.push(`/dashboard/admin/manage-job-posting/${jobId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const job = progress?.jobPostingId || jobPosting;
  const candidateData = candidate || progress?.candidateId;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="relative flex-1 overflow-y-auto">
          <GlassBackground />
          <div className="relative z-10 p-6">
            <div className="mx-auto max-w-7xl space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="h-9 rounded-full bg-white/80 backdrop-blur-sm border border-white/60 text-slate-700 hover:bg-white/90 shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>

              {/* Job Posting Card */}
              {jobPosting && (
                <Card className="bg-white/80 backdrop-blur-xl border-white/60 shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Briefcase className="h-5 w-5 text-indigo-600" />
                          <h2 className="text-2xl font-bold text-slate-900">
                            {jobPosting.title || "Untitled Job"}
                          </h2>
                        </div>
                        <p className="text-lg text-slate-600 mb-4">
                          {jobPosting.company || "Unknown Company"}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                              CTC Range
                            </p>
                            <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {jobPosting.ctc
                                ? `${jobPosting.ctc} LPA`
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">
                              Experience Required
                            </p>
                            <p className="text-sm font-medium text-slate-900">
                              {jobPosting.exp_req
                                ? `${jobPosting.exp_req} years`
                                : "N/A"}
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
                        {jobPosting.skills && Array.isArray(jobPosting.skills) && jobPosting.skills.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-xs text-slate-500 uppercase mb-2">
                              Required Skills
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {jobPosting.skills
                                .slice(0, 8)
                                .map((skill, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="bg-indigo-100 text-indigo-700"
                                  >
                                    {typeof skill === 'string' ? skill.trim() : skill}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Candidate Header Card */}
              <Card className="bg-white/80 backdrop-blur-xl border-white/60 shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-r from-indigo-500 to-sky-500 text-white text-2xl font-bold shadow-lg">
                      {candidateData?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "N/A"}
                    </div>
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {candidateData?.name || "Unknown Candidate"}
                      </h1>
                      <div className="flex items-center gap-4 text-slate-600">
                        {candidateData?.role?.[0] && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <span>{candidateData.role[0]}</span>
                          </div>
                        )}
                        {candidateData?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{candidateData.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress/Stage Bar */}
              <Card className="bg-white/80 backdrop-blur-xl border-white/60 shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Main Flow Stages */}
                    <div className="flex items-center gap-2 flex-1">
                      {STAGES.filter((s) => s.key !== "rejected").map(
                        (stage, index) => {
                          const isCompleted = isStageCompleted(stage.key);
                          const isCurrent = getCurrentStage() === stage.key;
                          const isEnabled = isStageEnabled(stage.key);

                          return (
                            <div key={stage.key} className="flex items-center">
                              <div
                                className={`
                                  px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                                  ${
                                    isCurrent
                                      ? "bg-indigo-600 text-white shadow-md"
                                      : isCompleted
                                      ? "bg-indigo-100 text-indigo-700"
                                      : isEnabled
                                      ? "bg-slate-100 text-slate-500"
                                      : "bg-slate-100 text-slate-400 opacity-60"
                                  }
                                `}
                                title="Progress is automatically updated from call status"
                              >
                                {stage.label.toUpperCase()}
                              </div>
                              {index <
                                STAGES.filter((s) => s.key !== "rejected")
                                  .length -
                                  1 && (
                                <div className="w-2 h-0.5 bg-slate-300 mx-1" />
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Separator */}
                    <div className="w-px h-8 bg-slate-300" />

                    {/* Rejected Stage - Separated */}
                    {STAGES.filter((s) => s.key === "rejected").map((stage) => {
                      const isCompleted = isStageCompleted(stage.key);

                      return (
                        <div
                          key={stage.key}
                          className={`
                            px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap
                            ${
                              isCompleted
                                ? "bg-red-500 text-white shadow-md"
                                : "bg-red-50 text-red-600 border-2 border-red-200"
                            }
                          `}
                          title="Progress is automatically updated from call status"
                        >
                          {stage.label.toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Professional Summary */}
                <Card className="bg-white/80 backdrop-blur-xl border-white/60 shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      Professional Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {candidateData?.bio ? (
                      <p className="text-slate-700 leading-relaxed">
                        {candidateData.bio}
                      </p>
                    ) : (
                      <p className="text-slate-500 italic">
                        {candidateData?.name || "This candidate"} is a{" "}
                        {candidateData?.role?.join(", ") || "professional"} with{" "}
                        {candidateData?.experience !== undefined
                          ? `${candidateData.experience} years`
                          : "relevant"}{" "}
                        of experience.
                        {candidateData?.skills &&
                          candidateData.skills.length > 0 &&
                          ` Specializing in ${candidateData.skills
                            .slice(0, 3)
                            .join(", ")}.`}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">
                          Current CTC
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {candidateData?.current_ctc
                            ? `₹${candidateData.current_ctc} LPA`
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">
                          Expected CTC
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {candidateData?.expected_ctc
                            ? `₹${candidateData.expected_ctc} LPA`
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      {candidateData?.skills &&
                        candidateData.skills.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase mb-2">
                              Skills
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {candidateData.skills
                                .slice(0, 10)
                                .map((skill, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="bg-slate-100 text-slate-700"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}

                      {candidateData?.phone_no && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="h-4 w-4" />
                          <span>{candidateData.phone_no}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Recommendations */}
                <Card className="bg-white/80 backdrop-blur-xl border-white/60 shadow-[0_18px_60px_rgba(15,23,42,0.3)]">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingJobs ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      </div>
                    ) : matchedJobs.length > 0 ? (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {matchedJobs.map((match, index) => {
                          const job = match.jobId;
                          if (!job) return null;
                          const matchScore = Math.round(
                            (match.matchScore || 0) * 100
                          );

                          return (
                            <div
                              key={job._id || index}
                              onClick={() => handleJobClick(job._id)}
                              className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-900">
                                    {job.title || "Untitled Job"}
                                  </h3>
                                  <p className="text-sm text-slate-600">
                                    {job.company || "Unknown Company"}
                                  </p>
                                </div>
                                <Badge
                                  className={`${
                                    matchScore >= 80
                                      ? "bg-green-500 text-white"
                                      : matchScore >= 60
                                      ? "bg-blue-500 text-white"
                                      : "bg-yellow-500 text-white"
                                  }`}
                                >
                                  {matchScore}%
                                </Badge>
                              </div>
                              {job.role && job.role.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {job.role.slice(0, 3).map((role, idx) => (
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
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <p>No matching jobs found for this candidate.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
