"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { jobPostingAPI, userAPI } from "@/lib/api";
import RecruiterAvailability from "@/components/RecruiterAvailability";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  User,
  FileQuestion,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
        <aside className="hidden lg:block">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center p-8">
          <Card className="max-w-md border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-red-900 dark:text-red-100 text-center">
                {error}
              </p>
              <Button
                className="mt-4 w-full"
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
      <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
        <aside className="hidden lg:block">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center p-8">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <FileQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Job posting not found</p>
              <Button className="mt-4" onClick={() => router.push("/jobs")}>
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
            (recruiter._id?.toString() === user.id?.toString() ||
              recruiter.toString() === user.id?.toString())
        )));

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
          title=""
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-white dark:bg-white">
          <div className="max-w-5xl mx-auto">
            {/* Back and Edit Buttons */}
            <div className="mb-8 flex gap-3 items-center justify-between">
              <Button
                variant="outline"
                className="flex-1 lg:flex-initial shadow-sm"
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
                    className="flex items-center gap-2 shadow-sm border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/20"
                    title="Set your available dates and times for interviews"
                  >
                    <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Set Availability</span>
                  </Button>
                )}
                {isOwner && (
                  <Button
                    className="flex-1 lg:flex-initial bg-black hover:bg-gray-800 text-white shadow-sm"
                    onClick={handleEdit}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Main Job Content */}
            <div className="space-y-8">
              {/* Header Section */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold mb-3 text-gray-900 dark:text-gray-100">
                      {jobPosting.title}
                    </h1>
                    <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      {jobPosting.company}
                    </p>
                    {jobPosting.id && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Job ID
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {jobPosting.id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Roles Section */}
              {jobPosting.role && jobPosting.role.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
                    Roles
                  </h2>
                  <div className="flex flex-wrap gap-2.5">
                    {jobPosting.role.map((r, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Details Grid */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-6 uppercase tracking-wide">
                  Job Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {jobPosting.ctc && (
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          CTC
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {jobPosting.ctc}
                        </p>
                      </div>
                    </div>
                  )}

                  {jobPosting.exp_req !== undefined &&
                    jobPosting.exp_req > 0 && (
                      <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                            Experience Required
                          </p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {jobPosting.exp_req} years
                          </p>
                        </div>
                      </div>
                    )}

                  {jobPosting.job_type && (
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                        <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Job Type
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {jobPosting.job_type}
                        </p>
                      </div>
                    </div>
                  )}

                  {jobPosting.createdAt && (
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Posted Date
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {new Date(jobPosting.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {jobPosting.updatedAt && (
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Last Updated
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {new Date(jobPosting.updatedAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description Section */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
                  Job Description
                </h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-base leading-7 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {jobPosting.description}
                  </p>
                </div>
              </div>

              {/* Skills Section */}
              {jobPosting.skills && jobPosting.skills.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
                    Required Skills
                  </h2>
                  <div className="flex flex-wrap gap-2.5">
                    {jobPosting.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
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
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-6 uppercase tracking-wide">
                    Recruiters
                  </h2>
                  <div className="space-y-4">
                    {jobPosting.primary_recruiter_id && (
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            Primary Recruiter
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
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
                      </div>
                    )}

                    {jobPosting.secondary_recruiter_id &&
                      Array.isArray(jobPosting.secondary_recruiter_id) &&
                      jobPosting.secondary_recruiter_id.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Secondary Recruiters
                          </p>
                          <div className="space-y-2">
                            {jobPosting.secondary_recruiter_id
                              .filter((recruiter) => recruiter !== null)
                              .map((recruiter, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                                >
                                  <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {typeof recruiter === "object" &&
                                    recruiter.name
                                      ? `${recruiter.name}${
                                          recruiter.email
                                            ? ` (${recruiter.email})`
                                            : ""
                                        }`
                                      : "N/A"}
                                  </p>
                                </div>
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
        <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Job Posting</DialogTitle>
              <DialogDescription>
                Update the job posting details below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Job Title *</Label>
                  <Input
                    id="edit-title"
                    value={jobForm.title}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, title: e.target.value })
                    }
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company *</Label>
                  <Input
                    id="edit-company"
                    value={jobForm.company}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, company: e.target.value })
                    }
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Job Description *</Label>
                <textarea
                  id="edit-description"
                  value={jobForm.description}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, description: e.target.value })
                  }
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Describe the role, responsibilities, and company culture..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SDET">SDET</SelectItem>
                      <SelectItem value="QA">QA</SelectItem>
                      <SelectItem value="DevOps">DevOps</SelectItem>
                      <SelectItem value="Frontend">Frontend</SelectItem>
                      <SelectItem value="Backend">Backend</SelectItem>
                      <SelectItem value="Full-stack">Full-stack</SelectItem>
                    </SelectContent>
                  </Select>
                  {jobForm.role.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {jobForm.role.map((r, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1"
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
                            className="ml-1 hover:text-blue-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-ctc">CTC</Label>
                  <Input
                    id="edit-ctc"
                    value={jobForm.ctc}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, ctc: e.target.value })
                    }
                    placeholder="e.g., 10-15 LPA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-exp_req">Experience Required (years)</Label>
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-job_type">Job Type</Label>
                  <Select
                    value={jobForm.job_type}
                    onValueChange={(value) =>
                      setJobForm({ ...jobForm, job_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full time">Full time</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-skills">Skills (comma-separated)</Label>
                <Input
                  id="edit-skills"
                  value={jobForm.skills}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, skills: e.target.value })
                  }
                  placeholder="e.g., React, Node.js, TypeScript"
                />
              </div>

              {/* Secondary Recruiters */}
              <div className="space-y-2">
                <Label htmlFor="edit-secondary_recruiters">
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select recruiters to add" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
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
                          className="truncate"
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
                          recruiter._id?.toString() ||
                            recruiter.id?.toString()
                        )
                    ).length === 0 && (
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
                          className="px-2 py-1 text-xs rounded-full bg-black text-white dark:bg-black/30 dark:text-white flex items-center gap-1"
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
                            className="ml-1 hover:text-purple-600"
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
              >
                Cancel
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600 text-white"
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
