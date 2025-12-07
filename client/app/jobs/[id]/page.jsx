"use client";

import Navbar from "@/components/Navbar";
import RecruiterAvailability from "@/components/RecruiterAvailability";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { jobPostingAPI, userAPI } from "@/lib/api";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Clock,
  DollarSign,
  Edit,
  FileQuestion,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JobDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobPosting, setJobPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [recruiters, setRecruiters] = useState([]);
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && jobId) {
      fetchJobPosting();
      if (user.role === "recruiter") {
        fetchRecruiters();
      }
    }
  }, [user, authLoading, jobId, router]);

  const fetchRecruiters = async () => {
    try {
      const response = await userAPI.getRecruiters();
      setRecruiters(response.recruiters || []);
    } catch (err) {
      console.error("Error fetching recruiters:", err);
    }
  };

  const fetchJobPosting = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await jobPostingAPI.getJobPostingById(jobId);
      setJobPosting(response);
    } catch (err) {
      console.error("Error fetching job posting:", err);
      setError(err.message || "Failed to load job posting");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!jobPosting) return;

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
      fetchJobPosting(); // Refresh the job posting
    } catch (err) {
      console.error("Error updating job posting:", err);
      alert(err.message || "Failed to update job posting");
    }
  };

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        <aside className="hidden lg:block relative z-10">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center p-8 relative z-10">
          <Card className="max-w-md border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-950/20 backdrop-blur-sm">
            <CardContent className="pt-6">
              <p className="text-red-900 dark:text-red-100 text-center">
                {error}
              </p>
              <Button
                className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                onClick={() => router.push("/jobs")}
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

  if (!jobPosting) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        <aside className="hidden lg:block relative z-10">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center p-8 relative z-10">
          <Card className="max-w-md border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="pt-6 text-center">
              <FileQuestion className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
              <p className="text-slate-600 dark:text-slate-400">
                Job posting not found
              </p>
              <Button
                className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                onClick={() => router.push("/jobs")}
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

  const isRecruiter = user.role === "recruiter";
  const isOwner =
    isRecruiter &&
    jobPosting.primary_recruiter_id &&
    jobPosting.primary_recruiter_id._id?.toString() === user.id?.toString();

  // Check if user is assigned as primary or secondary recruiter
  const isAssignedRecruiter =
    isRecruiter &&
    (isOwner ||
      (jobPosting.secondary_recruiter_id &&
        Array.isArray(jobPosting.secondary_recruiter_id) &&
        jobPosting.secondary_recruiter_id.some(
          (recruiter) =>
            recruiter._id?.toString() === user.id?.toString() ||
            recruiter.toString() === user.id?.toString()
        )));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <aside className="hidden lg:block relative z-10">
        <Sidebar />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-52 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Navbar
          title=""
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {/* Back and Edit Buttons */}
            <div className="mb-8 flex gap-3 items-center justify-between">
              <Button
                variant="outline"
                className="flex-1 lg:flex-initial border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-200 hover:scale-105 hover:shadow-md"
                onClick={() => router.push("/jobs")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-3">
                {isAssignedRecruiter && (
                  <Button
                    variant="outline"
                    onClick={() => setAvailabilityDialogOpen(true)}
                    className="flex items-center gap-2 border-slate-300 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-cyan-500/20"
                    title="Set your available dates and times for interviews"
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span>Set Availability</span>
                  </Button>
                )}
                {isOwner && (
                  <Button
                    className="flex-1 lg:flex-initial bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/50"
                    onClick={handleEdit}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Main Job Content */}
            <div className="space-y-6">
              {/* Header Section */}
              <div>
                <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
                  {jobPosting.title}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                  {jobPosting.company}
                </p>
                {jobPosting.id && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white rounded-md border border-slate-600 dark:border-slate-700">
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Job ID
                    </span>
                    <span className="text-sm font-semibold">
                      {jobPosting.id}
                    </span>
                  </div>
                )}
              </div>

              {/* Roles Section */}
              {jobPosting.role && jobPosting.role.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wide">
                    Roles
                  </h2>
                  <div className="flex flex-wrap gap-2.5">
                    {jobPosting.role.map((r, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300/30 dark:border-cyan-600/30 hover:from-cyan-400/30 hover:to-blue-500/30 transition-all duration-200"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Details */}
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wide">
                  Job Details
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                  {jobPosting.ctc && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-slate-900 dark:text-white">
                        {jobPosting.ctc}
                      </span>
                    </div>
                  )}
                  {jobPosting.exp_req !== undefined &&
                    jobPosting.exp_req > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span className="text-slate-900 dark:text-white">
                          {jobPosting.exp_req} years
                        </span>
                      </div>
                    )}
                  {jobPosting.job_type && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-slate-900 dark:text-white">
                        {jobPosting.job_type}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description Section */}
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wide">
                  Job Description
                </h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-base leading-7 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {jobPosting.description}
                  </p>
                </div>
              </div>

              {/* Skills Section */}
              {jobPosting.skills && jobPosting.skills.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wide">
                    Required Skills
                  </h2>
                  <div className="flex flex-wrap gap-2.5">
                    {jobPosting.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 transition-all duration-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recruiter Information Section */}
              {(jobPosting.primary_recruiter_id ||
                (jobPosting.secondary_recruiter_id &&
                  Array.isArray(jobPosting.secondary_recruiter_id) &&
                  jobPosting.secondary_recruiter_id.length > 0)) && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wide">
                    Recruiters
                  </h2>
                  <div className="space-y-3">
                    {jobPosting.primary_recruiter_id && (
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900 dark:text-white mb-1">
                          Primary Recruiter
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          {typeof jobPosting.primary_recruiter_id ===
                            "object" && jobPosting.primary_recruiter_id.name
                            ? `${jobPosting.primary_recruiter_id.name}${
                                jobPosting.primary_recruiter_id.email
                                  ? ` (${jobPosting.primary_recruiter_id.email})`
                                  : ""
                              }`
                            : "N/A"}
                        </p>
                      </div>
                    )}

                    {jobPosting.secondary_recruiter_id &&
                      Array.isArray(jobPosting.secondary_recruiter_id) &&
                      jobPosting.secondary_recruiter_id.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Secondary Recruiters
                          </p>
                          <div className="space-y-1">
                            {jobPosting.secondary_recruiter_id
                              .filter((recruiter) => recruiter !== null)
                              .map((recruiter, idx) => (
                                <p
                                  key={idx}
                                  className="text-sm text-slate-600 dark:text-slate-400"
                                >
                                  {typeof recruiter === "object" &&
                                  recruiter.name
                                    ? `${recruiter.name}${
                                        recruiter.email
                                          ? ` (${recruiter.email})`
                                          : ""
                                      }`
                                    : "N/A"}
                                </p>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Recruiter Availability Dialog */}
      {isAssignedRecruiter && (
        <Dialog
          open={availabilityDialogOpen}
          onOpenChange={setAvailabilityDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>My Availability</DialogTitle>
            </DialogHeader>
            <RecruiterAvailability jobId={jobId} user={user} />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Job Posting Dialog */}
      {isOwner && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                Edit Job Posting
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Update the job posting details below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-title"
                    className="text-slate-900 dark:text-white font-medium"
                  >
                    Job Title *
                  </Label>
                  <Input
                    id="edit-title"
                    value={jobForm.title}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, title: e.target.value })
                    }
                    placeholder="e.g., Senior Software Engineer"
                    className="border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-company"
                    className="text-slate-900 dark:text-white font-medium"
                  >
                    Company *
                  </Label>
                  <Input
                    id="edit-company"
                    value={jobForm.company}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, company: e.target.value })
                    }
                    placeholder="Company name"
                    className="border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-description"
                  className="text-slate-900 dark:text-white font-medium"
                >
                  Job Description *
                </Label>
                <textarea
                  id="edit-description"
                  value={jobForm.description}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, description: e.target.value })
                  }
                  className="w-full min-h-[100px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200 resize-none"
                  placeholder="Describe the role, responsibilities, and company culture..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-role"
                    className="text-slate-900 dark:text-white font-medium"
                  >
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
                    <SelectTrigger className="border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-white hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-700">
                      <SelectItem
                        value="SDET"
                        className="text-slate-900 dark:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400"
                      >
                        SDET
                      </SelectItem>
                      <SelectItem
                        value="QA"
                        className="text-slate-900 dark:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400"
                      >
                        QA
                      </SelectItem>
                      <SelectItem
                        value="DevOps"
                        className="text-slate-900 dark:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400"
                      >
                        DevOps
                      </SelectItem>
                      <SelectItem
                        value="Frontend"
                        className="text-slate-900 dark:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400"
                      >
                        Frontend
                      </SelectItem>
                      <SelectItem
                        value="Backend"
                        className="text-slate-900 dark:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400"
                      >
                        Backend
                      </SelectItem>
                      <SelectItem
                        value="Full-stack"
                        className="text-slate-900 dark:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400"
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
                          className="px-3 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300/30 dark:border-cyan-600/30 flex items-center gap-1.5 hover:from-cyan-400/30 hover:to-blue-500/30 transition-all duration-200"
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
                            className="ml-0.5 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-ctc"
                    className="text-slate-900 dark:text-white font-medium"
                  >
                    CTC
                  </Label>
                  <Input
                    id="edit-ctc"
                    value={jobForm.ctc}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, ctc: e.target.value })
                    }
                    placeholder="e.g., 10-15 LPA"
                    className="border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-exp_req"
                    className="text-slate-900 dark:text-white font-medium"
                  >
                    Experience Required (years)
                  </Label>
                  <Input
                    id="edit-exp_req"
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
                    className="border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-job_type"
                    className="text-slate-900 dark:text-white font-medium"
                  >
                    Job Type
                  </Label>
                  <Select
                    value={jobForm.job_type}
                    onValueChange={(value) =>
                      setJobForm({ ...jobForm, job_type: value })
                    }
                  >
                    <SelectTrigger className="border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-white hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200">
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-700">
                      <SelectItem
                        value="Full time"
                        className="text-slate-900 dark:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400"
                      >
                        Full time
                      </SelectItem>
                      <SelectItem
                        value="Internship"
                        className="text-slate-900 dark:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400"
                      >
                        Internship
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-skills"
                  className="text-slate-900 dark:text-white font-medium"
                >
                  Skills (comma-separated)
                </Label>
                <Input
                  id="edit-skills"
                  value={jobForm.skills}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, skills: e.target.value })
                  }
                  placeholder="e.g., React, Node.js, TypeScript"
                  className="border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Secondary Recruiters */}
              <div className="space-y-2">
                <Label
                  htmlFor="edit-secondary_recruiters"
                  className="text-slate-900 dark:text-white font-medium"
                >
                  Secondary Recruiters
                </Label>
                <Select
                  onValueChange={(value) => {
                    if (
                      value &&
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
                  <SelectTrigger className="w-full border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-white hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20">
                    <SelectValue placeholder="Select recruiters to add" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-700">
                    {recruiters
                      .filter(
                        (recruiter) =>
                          recruiter._id?.toString() !== user.id?.toString() &&
                          !jobForm.secondary_recruiter_id.includes(
                            recruiter._id?.toString() ||
                              recruiter.id?.toString()
                          )
                      )
                      .map((recruiter) => (
                        <SelectItem
                          key={recruiter._id || recruiter.id}
                          value={
                            recruiter._id?.toString() ||
                            recruiter.id?.toString()
                          }
                          className="text-slate-900 dark:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400 truncate"
                        >
                          <span className="truncate block">
                            {recruiter.name} ({recruiter.email})
                          </span>
                        </SelectItem>
                      ))}
                    {recruiters.filter(
                      (recruiter) =>
                        recruiter._id?.toString() !== user.id?.toString() &&
                        !jobForm.secondary_recruiter_id.includes(
                          recruiter._id?.toString() || recruiter.id?.toString()
                        )
                    ).length === 0 && (
                      <SelectItem
                        value="no-recruiters"
                        disabled
                        className="text-slate-600 dark:text-white"
                      >
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
                          className="px-3 py-1.5 text-sm font-medium rounded-md bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white border border-slate-600 dark:border-slate-700 flex items-center gap-1.5 hover:from-slate-700 hover:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 transition-all duration-200"
                        >
                          {recruiter?.name || recruiterId}
                          <button
                            type="button"
                            onClick={() => {
                              setJobForm({
                                ...jobForm,
                                secondary_recruiter_id:
                                  jobForm.secondary_recruiter_id.filter(
                                    (id) => id !== recruiterId
                                  ),
                              });
                            }}
                            className="ml-0.5 hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-200 hover:scale-105"
              >
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/50"
                onClick={handleUpdateJob}
              >
                Update Job
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
