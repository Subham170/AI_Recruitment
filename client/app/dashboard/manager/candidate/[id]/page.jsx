"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Loading from "@/components/ui/loading";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { candidateAPI } from "@/lib/api";
import {
  ArrowLeft,
  Briefcase,
  ChevronRight,
  FileText,
  Github,
  Globe,
  Linkedin,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CandidateDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const candidateId = params.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && user.role !== "manager") {
      router.push(`/dashboard/${user.role}/candidate/${candidateId}`);
    } else if (user && candidateId) {
      fetchCandidate();
    }
  }, [user, authLoading, candidateId, router]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await candidateAPI.getCandidateById(candidateId);
      setCandidate(response);
      // Fetch matched jobs after candidate is loaded
      fetchMatchedJobs();
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
      setMatchedJobs(response.matches || []);
    } catch (err) {
      console.error("Error fetching matched jobs:", err);
      // Don't show error for matched jobs, just log it
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleJobClick = (jobId) => {
    router.push(`/dashboard/${user.role}/top-applicants/${jobId}`);
  };

  const getRoleBadgeVariant = (roles) => {
    if (!roles || roles.length === 0) return "outline";
    return "secondary";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "manager") {
    return null;
  }

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-white text-slate-900">
        <aside className="hidden lg:block relative z-10">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-white text-slate-900">
            <div className="max-w-7xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-800">{error}</p>
                <Button
                  onClick={() => router.push("/dashboard/manager/candidate")}
                  className="mt-4"
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Candidates
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
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

      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-white text-slate-900">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push("/dashboard/manager/candidate")}
                variant="ghost"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Candidates
              </Button>
            </div>

            {/* Candidate Details Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {candidate.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                      {candidate.name}
                    </h1>
                    <p className="text-slate-600 mt-1">{candidate.email}</p>
                    {candidate.status && (
                      <Badge
                        variant={
                          candidate.status === "offer"
                            ? "default"
                            : candidate.status === "rejected"
                            ? "destructive"
                            : candidate.status === "screening"
                            ? "secondary"
                            : "outline"
                        }
                        className="mt-2 capitalize"
                      >
                        {candidate.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-cyan-600" />
                    Basic Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-sm font-medium">
                        Full Name
                      </Label>
                      <p className="text-slate-900 font-semibold">
                        {candidate.name || "-"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-sm font-medium">
                        Email
                      </Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-cyan-600" />
                        <p className="text-slate-900">
                          {candidate.email || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-sm font-medium">
                        Phone Number
                      </Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-cyan-600" />
                        <p className="text-slate-900">
                          {candidate.phone_no || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-500 text-sm font-medium">
                        Experience
                      </Label>
                      <p className="text-slate-900">
                        {candidate.experience !== undefined
                          ? `${candidate.experience} years`
                          : "-"}
                      </p>
                    </div>
                    {candidate.expected_ctc && (
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-sm font-medium">
                          Expected CTC
                        </Label>
                        <p className="text-slate-900">
                          ₹{candidate.expected_ctc} LPA
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">
                    Roles
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {candidate.role && candidate.role.length > 0 ? (
                      candidate.role.map((role, idx) => (
                        <Badge
                          key={idx}
                          variant={getRoleBadgeVariant([role])}
                          className="capitalize px-3 py-1 border border-slate-200 bg-white text-slate-700"
                        >
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400">No roles specified</span>
                    )}
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">
                    Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills && candidate.skills.length > 0 ? (
                      candidate.skills.map((skill, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="px-3 py-1 text-slate-700"
                        >
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400">
                        No skills specified
                      </span>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {candidate.bio && (
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">
                      Bio
                    </h2>
                    <p className="text-slate-900 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      {candidate.bio}
                    </p>
                  </div>
                )}

                {/* Resume */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-600" />
                    Resume
                  </h2>
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
                    <span className="text-slate-400">No resume available</span>
                  )}
                </div>

                {/* Social Links */}
                {(candidate.social_links?.linkedin ||
                  candidate.social_links?.github ||
                  candidate.social_links?.portfolio) && (
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">
                      Social Links
                    </h2>
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

                {/* Best Fit Jobs */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-cyan-600" />
                    Best Fit Jobs
                  </h2>
                  {loadingJobs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loading size="sm" />
                    </div>
                  ) : matchedJobs.length > 0 ? (
                    <div className="space-y-3">
                      {matchedJobs.map((match) => {
                        const job = match.jobId;
                        const matchPercentage = Math.round(
                          match.matchScore * 100
                        );
                        return (
                          <div
                            key={match._id}
                            onClick={() => handleJobClick(job._id)}
                            className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 hover:border-cyan-300 transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-slate-900">
                                    {job.title}
                                  </h3>
                                  <span
                                    className={`text-sm font-medium px-2 py-1 rounded ${
                                      matchPercentage >= 70
                                        ? "bg-green-100 text-green-700"
                                        : matchPercentage >= 50
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-orange-100 text-orange-700"
                                    }`}
                                  >
                                    {matchPercentage}% Match
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <span className="font-medium">
                                    {job.company}
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
                              <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm py-4">
                      No matching jobs found
                    </p>
                  )}
                </div>

                {/* Timestamps */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {candidate.createdAt && (
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-sm font-medium">
                          Created At
                        </Label>
                        <p className="text-slate-600 text-sm">
                          {new Date(candidate.createdAt).toLocaleDateString()}{" "}
                          {new Date(candidate.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                    {candidate.updatedAt && (
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-sm font-medium">
                          Last Updated
                        </Label>
                        <p className="text-slate-600 text-sm">
                          {new Date(candidate.updatedAt).toLocaleDateString()}{" "}
                          {new Date(candidate.updatedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
