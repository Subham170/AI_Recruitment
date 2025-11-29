"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  Eye,
  Plus,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JobsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobPostings, setJobPostings] = useState({
    myJobPostings: [],
    secondaryJobPostings: [],
    remainingJobPostings: [],
    allJobPostings: [],
  });
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [loadingRecruiters, setLoadingRecruiters] = useState(false);

  // Form state
  const [jobForm, setJobForm] = useState({
    id: "",
    title: "",
    description: "",
    company: "",
    role: [],
    ctc: "",
    exp_req: 0,
    skills: "",
    secondary_recruiter_id: [],
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchJobPostings();
      fetchRecruiters();
    }
  }, [user, loading, router]);

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

  // Handle edit mode from detail page - check URL after jobs are loaded
  useEffect(() => {
    if (!loadingJobs && jobPostings.allJobPostings.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get("edit");
      if (editId) {
        const allJobs = [
          ...jobPostings.myJobPostings,
          ...jobPostings.secondaryJobPostings,
          ...jobPostings.remainingJobPostings,
          ...jobPostings.allJobPostings,
        ];
        const jobToEdit = allJobs.find((job) => job._id === editId);
        if (jobToEdit) {
          openEditDialog(jobToEdit);
          // Remove the edit param from URL
          window.history.replaceState({}, "", "/jobs");
        }
      }
    }
  }, [loadingJobs, jobPostings]);

  const fetchJobPostings = async () => {
    try {
      setLoadingJobs(true);
      setError(null);
      const response = await jobPostingAPI.getAllJobPostings();

      if (user.role === "recruiter") {
        setJobPostings({
          myJobPostings: response.myJobPostings || [],
          secondaryJobPostings: response.secondaryJobPostings || [],
          remainingJobPostings: response.remainingJobPostings || [],
          allJobPostings: response.allJobPostings || [],
        });
      } else {
        setJobPostings({
          myJobPostings: [],
          secondaryJobPostings: [],
          remainingJobPostings: [],
          allJobPostings: response.jobPostings || [],
        });
      }
    } catch (err) {
      console.error("Error fetching job postings:", err);
      setError(err.message || "Failed to load job postings");
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleCreateJob = async () => {
    try {
      const skillsArray = jobForm.skills
        ? jobForm.skills
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : [];

      const jobData = {
        id: jobForm.id,
        title: jobForm.title,
        description: jobForm.description,
        company: jobForm.company,
        role: jobForm.role,
        ctc: jobForm.ctc || undefined,
        exp_req: jobForm.exp_req || 0,
        skills: skillsArray,
        secondary_recruiter_id: jobForm.secondary_recruiter_id || [],
      };

      await jobPostingAPI.createJobPosting(jobData);
      resetForm();
      setEditingJob(null);
      setShowCreateDialog(false);
      fetchJobPostings();
    } catch (err) {
      console.error("Error creating job posting:", err);
      alert(err.message || "Failed to create job posting");
    }
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
        skills: skillsArray,
        secondary_recruiter_id: jobForm.secondary_recruiter_id || [],
      };

      await jobPostingAPI.updateJobPosting(editingJob._id, jobData);
      resetForm();
      setEditingJob(null);
      setShowCreateDialog(false);
      fetchJobPostings();
    } catch (err) {
      console.error("Error updating job posting:", err);
      alert(err.message || "Failed to update job posting");
    }
  };

  const resetForm = () => {
    setJobForm({
      id: "",
      title: "",
      description: "",
      company: "",
      role: [],
      ctc: "",
      exp_req: 0,
      skills: "",
      secondary_recruiter_id: [],
    });
  };

  const openEditDialog = (job) => {
    setEditingJob(job);
    // Extract secondary recruiter IDs
    const secondaryIds = job.secondary_recruiter_id
      ? Array.isArray(job.secondary_recruiter_id)
        ? job.secondary_recruiter_id.map((r) =>
            r._id ? r._id.toString() : r.toString()
          )
        : []
      : [];

    setJobForm({
      id: job.id,
      title: job.title,
      description: job.description,
      company: job.company,
      role: job.role || [],
      ctc: job.ctc || "",
      exp_req: job.exp_req || 0,
      skills: (job.skills || []).join(", "),
      secondary_recruiter_id: secondaryIds,
    });
    setShowCreateDialog(true);
  };

  const openCreateDialog = () => {
    setEditingJob(null);
    resetForm();
    setShowCreateDialog(true);
  };

  const handleJobClick = (jobId) => {
    router.push(`/jobs/${jobId}`);
  };

  if (!user) {
    return null;
  }

  const isRecruiter = user.role === "recruiter";
  const isAdminOrManager = user.role === "admin" || user.role === "manager";

  // Filter jobs based on search query
  const filterJobs = (jobs) => {
    if (!searchQuery) return jobs;
    const query = searchQuery.toLowerCase();
    return jobs.filter(
      (job) =>
        job.title?.toLowerCase().includes(query) ||
        job.company?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query)
    );
  };

  // Job card component
  const JobCard = ({ job, showEdit = false }) => {
    const isOwner =
      isRecruiter &&
      job.primary_recruiter_id &&
      job.primary_recruiter_id._id?.toString() === user.id?.toString();

    return (
      <Card
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => handleJobClick(job._id)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
              <CardDescription className="text-base font-semibold text-foreground">
                {job.company}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {job.role && job.role.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {job.role.map((r, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}
            {job.ctc && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>{job.ctc}</span>
              </div>
            )}
            {job.exp_req !== undefined && job.exp_req > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{job.exp_req} years experience</span>
              </div>
            )}
            {job.createdAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {job.description}
          </p>

          {job.skills && job.skills.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1">Skills:</p>
              <div className="flex flex-wrap gap-1">
                {job.skills.slice(0, 5).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {skill}
                  </span>
                ))}
                {job.skills.length > 5 && (
                  <span className="px-2 py-1 text-xs text-muted-foreground">
                    +{job.skills.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleJobClick(job._id);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
            {showEdit && isOwner && (
              <Button
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog(job);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
          title="Job Postings"
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Mobile Add Button */}
          {isRecruiter && (
            <div className="lg:hidden mb-4">
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Job Posting
              </Button>
            </div>
          )}

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-6">
                <p className="text-red-900 dark:text-red-100">{error}</p>
              </CardContent>
            </Card>
          )}

          {loading || loadingJobs ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-xl">Loading...</div>
            </div>
          ) : (
            <>
              {/* Search */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search job postings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Recruiter View - 3 Sections */}
              {isRecruiter && (
                <>
                  {/* My Job Postings */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">
                      Your Job Postings
                    </h2>
                    {filterJobs(jobPostings.myJobPostings).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filterJobs(jobPostings.myJobPostings).map((job) => (
                          <JobCard key={job._id} job={job} showEdit={true} />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No job postings created by you yet.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Secondary Job Postings */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">
                      Job Postings (You are Secondary Recruiter)
                    </h2>
                    {filterJobs(jobPostings.secondaryJobPostings).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filterJobs(jobPostings.secondaryJobPostings).map(
                          (job) => (
                            <JobCard key={job._id} job={job} showEdit={false} />
                          )
                        )}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            You are not assigned as a secondary recruiter to any
                            job postings.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Remaining Job Postings */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">
                      Other Job Postings
                    </h2>
                    {filterJobs(jobPostings.remainingJobPostings).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filterJobs(jobPostings.remainingJobPostings).map(
                          (job) => (
                            <JobCard key={job._id} job={job} showEdit={false} />
                          )
                        )}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No other job postings available.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}

              {/* Admin/Manager View - Single Section */}
              {isAdminOrManager && (
                <div>
                  {filterJobs(jobPostings.allJobPostings).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filterJobs(jobPostings.allJobPostings).map((job) => (
                        <JobCard key={job._id} job={job} showEdit={false} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No job postings available.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}

          {/* Create/Edit Dialog */}
          <Dialog
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) {
                setEditingJob(null);
                resetForm();
              }
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingJob ? "Edit Job Posting" : "Create New Job Posting"}
                </DialogTitle>
                <DialogDescription>
                  {editingJob
                    ? "Update the job posting details below."
                    : "Fill in the details to create a new job posting."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {!editingJob && (
                  <div className="space-y-2">
                    <Label htmlFor="id">Job ID *</Label>
                    <Input
                      id="id"
                      value={jobForm.id}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, id: e.target.value })
                      }
                      placeholder="e.g., JOB-1001"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={jobForm.title}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, title: e.target.value })
                      }
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      value={jobForm.company}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, company: e.target.value })
                      }
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Job Description *</Label>
                  <textarea
                    id="description"
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
                    <Label htmlFor="role">Role</Label>
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
                                  role: jobForm.role.filter(
                                    (_, i) => i !== idx
                                  ),
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
                    <Label htmlFor="ctc">CTC</Label>
                    <Input
                      id="ctc"
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
                    <Label htmlFor="exp_req">Experience Required (years)</Label>
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      value={jobForm.skills}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, skills: e.target.value })
                      }
                      placeholder="e.g., React, Node.js, TypeScript"
                    />
                  </div>
                </div>

                {/* Secondary Recruiters */}
                <div className="space-y-2">
                  <Label htmlFor="secondary_recruiters">
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select recruiters to add" />
                    </SelectTrigger>
                    <SelectContent>
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
                          >
                            {recruiter.name} ({recruiter.email})
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
                            className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1"
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

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingJob(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={editingJob ? handleUpdateJob : handleCreateJob}
                >
                  {editingJob ? "Update Job" : "Create Job"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
