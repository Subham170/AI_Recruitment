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
import Loading from "@/components/ui/loading";
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
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JobsPageContent() {
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
    job_type: "Full time",
    skills: "",
    secondary_recruiter_id: [],
  });

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Fetch data when user is available
    fetchJobPostings();
    if (user.role === "recruiter") {
      fetchRecruiters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]); // Removed router from dependencies to prevent re-renders

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
          window.history.replaceState({}, "", window.location.pathname);
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
        job_type: jobForm.job_type || "Full time",
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
        job_type: jobForm.job_type || "Full time",
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
      job_type: "Full time",
      skills: "",
      secondary_recruiter_id: [],
    });
  };

  const openEditDialog = (job) => {
    setEditingJob(job);
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
      job_type: job.job_type || "Full time",
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
  const canCreate = isRecruiter; // Only recruiters can create jobs

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
        className="group border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.02] hover:border-cyan-300 dark:hover:border-cyan-700 cursor-pointer"
        onClick={() => handleJobClick(job._id)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {job.title}
              </CardTitle>
              <CardDescription className="text-base font-semibold text-slate-700 dark:text-slate-300">
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
                    className="px-2 py-1 text-xs rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300/30 dark:border-cyan-600/30"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}
            {job.ctc && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <DollarSign className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span>{job.ctc}</span>
              </div>
            )}
            {job.exp_req !== undefined && job.exp_req > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span>{job.exp_req} years experience</span>
              </div>
            )}
            {job.createdAt && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span>
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
            {job.description}
          </p>

          {job.skills && job.skills.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                Skills:
              </p>
              <div className="flex flex-wrap gap-1">
                {job.skills.slice(0, 5).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {skill}
                  </span>
                ))}
                {job.skills.length > 5 && (
                  <span className="px-2 py-1 text-xs text-slate-500 dark:text-slate-500">
                    +{job.skills.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <Button
              variant="outline"
              className="w-full border-slate-300 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all"
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
                className="w-full border-slate-300 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all"
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
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-1/2 h-1/2"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(6, 182, 212, 0.05), transparent 70%)",
          }}
        ></div>
        <div
          className="absolute bottom-0 left-0 w-1/2 h-1/2"
          style={{
            background:
              "radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.05), transparent 70%)",
          }}
        ></div>
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(14, 165, 233, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
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
          title="Job Postings"
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {loading || loadingJobs ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loading />
            </div>
          ) : (
            <>
              {canCreate && (
                <div className="lg:hidden mb-4">
                  <Button
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
                    onClick={openCreateDialog}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Job Posting
                  </Button>
                </div>
              )}

              {error && (
                <div className="mb-6 border-2 border-red-300 bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-200 font-medium">
                    {error}
                  </p>
                </div>
              )}

              <div className="mb-6 flex gap-3 items-center">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search job postings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm hover:shadow-md"
                  />
                </div>
                {canCreate && (
                  <div className="hidden lg:block">
                    <Button
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
                      onClick={openCreateDialog}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Job Posting
                    </Button>
                  </div>
                )}
              </div>

              {isRecruiter && (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                      Your Job Postings
                    </h2>
                    {filterJobs(jobPostings.myJobPostings).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filterJobs(jobPostings.myJobPostings).map((job) => (
                          <JobCard key={job._id} job={job} showEdit={true} />
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-800/50 rounded-lg p-8 text-center">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          No job postings created by you yet.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
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
                      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-800/50 rounded-lg p-8 text-center">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          You are not assigned as a secondary recruiter to any
                          job postings.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
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
                      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-800/50 rounded-lg p-8 text-center">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          No other job postings available.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {isAdminOrManager && (
                <div>
                  {filterJobs(jobPostings.allJobPostings).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filterJobs(jobPostings.allJobPostings).map((job) => (
                        <JobCard key={job._id} job={job} showEdit={false} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-800/50 rounded-lg p-8 text-center">
                      <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        No job postings available.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

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
                    <Label htmlFor="job_type">Job Type</Label>
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

                {isRecruiter && (
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
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select recruiters to add" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {recruiters
                          .filter(
                            (recruiter) =>
                              recruiter._id?.toString() !==
                                user.id?.toString() &&
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
                              className="px-2 py-1 text-xs rounded-full bg-black/80 text-white hover:bg-black/80 dark:bg-black/30 dark:text-white flex items-center gap-1"
                            >
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
                                className="ml-1 hover:text-black/80"
                              >
                                <X className="h-3.5 w-3.5 text-black/80" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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
                  className="bg-black hover:bg-black/80 text-white"
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
