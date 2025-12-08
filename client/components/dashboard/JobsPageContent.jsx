"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { jobPostingAPI, userAPI } from "@/lib/api";
import {
  Briefcase,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function JobsPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingSecondaryRecruiters, setEditingSecondaryRecruiters] =
    useState(false);
  const [tempSecondaryRecruiters, setTempSecondaryRecruiters] = useState([]);
  const [savingRecruiters, setSavingRecruiters] = useState(false);
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

  // Applied filters (used for API calls)
  const [filters, setFilters] = useState({
    job_type: "",
    role: [],
    min_exp: "",
    max_exp: "",
    min_ctc: "",
    max_ctc: "",
    company: "",
    skills: [],
    date_from: "",
    date_to: "",
  });

  // Temporary filters (for sidebar inputs, not applied until Apply is clicked)
  const [tempFilters, setTempFilters] = useState({
    job_type: "",
    role: [],
    min_exp: "",
    max_exp: "",
    min_ctc: "",
    max_ctc: "",
    company: "",
    skills: [],
    date_from: "",
    date_to: "",
  });

  const [showFilters, setShowFilters] = useState(false);

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
    // Fetch recruiters for recruiters, admins, and managers
    if (
      user.role === "recruiter" ||
      user.role === "admin" ||
      user.role === "manager"
    ) {
      fetchRecruiters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]); // Removed router from dependencies to prevent re-renders

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch jobs when filters or debounced search change
  useEffect(() => {
    if (user && !loading) {
      fetchJobPostings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, filters, user, loading]);

  // Initialize tempFilters when sidebar opens
  useEffect(() => {
    if (showFilters) {
      setTempFilters(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFilters]);

  // Fetch recruiters when view dialog opens for recruiters
  useEffect(() => {
    if (
      showViewDialog &&
      user &&
      user.role === "recruiter" &&
      recruiters.length === 0
    ) {
      fetchRecruiters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showViewDialog, user]);

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

  const fetchJobPostings = useCallback(async () => {
    try {
      setLoadingJobs(true);
      setError(null);

      // Build filter object
      const filterParams = {
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(filters.job_type && { job_type: filters.job_type }),
        ...(filters.role.length > 0 && { role: filters.role }),
        ...(filters.min_exp && { min_exp: filters.min_exp }),
        ...(filters.max_exp && { max_exp: filters.max_exp }),
        ...(filters.min_ctc && { min_ctc: filters.min_ctc }),
        ...(filters.max_ctc && { max_ctc: filters.max_ctc }),
        ...(filters.company && { company: filters.company }),
        ...(filters.skills.length > 0 && { skills: filters.skills }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      };

      const response = await jobPostingAPI.getAllJobPostings(filterParams);

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
  }, [debouncedSearchQuery, filters, user]);

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
      toast.success("Job posting created successfully!");
    } catch (err) {
      console.error("Error creating job posting:", err);
      toast.error(err.message || "Failed to create job posting");
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
      toast.success("Job posting updated successfully!");
    } catch (err) {
      console.error("Error updating job posting:", err);
      const errorMessage = err.message || "Failed to update job posting";
      toast.error(errorMessage);
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
    router.push(`/dashboard/${user.role}/manage-job-posting/${jobId}`);
  };

  const handleViewDetails = (job) => {
    setViewingJob(job);
    // Initialize temp secondary recruiters from the job
    const currentRecruiters = job.secondary_recruiter_id
      ? Array.isArray(job.secondary_recruiter_id)
        ? job.secondary_recruiter_id.map((r) => {
            if (typeof r === "object" && r !== null) {
              return r._id?.toString() || r.toString();
            }
            return r?.toString();
          })
        : []
      : [];
    setTempSecondaryRecruiters(currentRecruiters);
    setEditingSecondaryRecruiters(false);
    setShowViewDialog(true);
  };

  const handleAddSecondaryRecruiter = (recruiterId) => {
    const recruiterIdStr = recruiterId.toString();
    if (!tempSecondaryRecruiters.includes(recruiterIdStr)) {
      setTempSecondaryRecruiters([...tempSecondaryRecruiters, recruiterIdStr]);
    }
  };

  const handleRemoveSecondaryRecruiter = (recruiterId) => {
    setTempSecondaryRecruiters(
      tempSecondaryRecruiters.filter((id) => id !== recruiterId.toString())
    );
  };

  const handleSaveSecondaryRecruiters = async () => {
    if (!viewingJob) return;

    try {
      setSavingRecruiters(true);
      const jobData = {
        secondary_recruiter_id: tempSecondaryRecruiters,
      };
      await jobPostingAPI.updateJobPosting(viewingJob._id, jobData);
      setEditingSecondaryRecruiters(false);
      // Refresh job data
      fetchJobPostings();
      // Update viewing job with new data
      const updatedJob = {
        ...viewingJob,
        secondary_recruiter_id: tempSecondaryRecruiters,
      };
      setViewingJob(updatedJob);
      toast.success("Secondary recruiters updated successfully!");
    } catch (err) {
      console.error("Error updating secondary recruiters:", err);
      const errorMessage =
        err.message || "Failed to update secondary recruiters";
      toast.error(errorMessage);
    } finally {
      setSavingRecruiters(false);
    }
  };

  if (!user) {
    return null;
  }

  const isRecruiter = user.role === "recruiter";
  const isAdminOrManager = user.role === "admin" || user.role === "manager";
  const canCreate = isRecruiter; // Only recruiters can create jobs

  // Filter jobs based on search query
  const filterJobs = (jobs) => {
    // Backend handles most filtering now, but keep this for any client-side filtering if needed
    return jobs;
  };

  const handleTempFilterChange = (key, value) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTempRoleToggle = (role) => {
    setTempFilters((prev) => ({
      ...prev,
      role: prev.role.includes(role)
        ? prev.role.filter((r) => r !== role)
        : [...prev.role, role],
    }));
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const emptyFilters = {
      job_type: "",
      role: [],
      min_exp: "",
      max_exp: "",
      min_ctc: "",
      max_ctc: "",
      company: "",
      skills: [],
      date_from: "",
      date_to: "",
    };
    setTempFilters(emptyFilters);
    setFilters(emptyFilters);
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  const hasActiveFilters = () => {
    return (
      filters.job_type ||
      filters.role.length > 0 ||
      filters.min_exp ||
      filters.max_exp ||
      filters.min_ctc ||
      filters.max_ctc ||
      filters.company ||
      filters.skills.length > 0 ||
      filters.date_from ||
      filters.date_to ||
      searchQuery
    );
  };

  // Job table component
  const JobTable = ({ jobs, showEdit = false }) => {
    if (!jobs || jobs.length === 0) {
      return null;
    }

    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80">
                <th className="text-left p-4 font-semibold text-slate-800">
                  Job Role
                </th>
                <th className="text-left p-4 font-semibold text-slate-800">
                  Company Name
                </th>
                <th className="text-left p-4 font-semibold text-slate-800">
                  Job Type
                </th>
                <th className="text-left p-4 font-semibold text-slate-800">
                  Salary Range
                </th>
                {isRecruiter && (
                  <th className="text-left p-4 font-semibold text-slate-800">
                    Your Role
                  </th>
                )}
                <th className="text-right p-4 font-semibold text-slate-800">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const isOwner =
                  isRecruiter &&
                  job.primary_recruiter_id &&
                  job.primary_recruiter_id._id?.toString() ===
                    user.id?.toString();

                return (
                  <tr
                    key={job._id}
                    className="border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors duration-150"
                  >
                    <td className="p-4">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {job.title}
                        </div>
                        {job.createdAt && (
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-700">
                        {typeof job.company === "string"
                          ? job.company
                          : job.company?.name || "N/A"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {job.job_type || "Full time"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-700">
                        {job.ctc || "Not specified"}
                      </span>
                    </td>
                    {isRecruiter && (
                      <td className="p-4">
                        {(() => {
                          const userId = user.id?.toString();
                          const primaryRecruiterId =
                            job.primary_recruiter_id?._id?.toString() ||
                            job.primary_recruiter_id?.toString();
                          const secondaryRecruiterIds =
                            job.secondary_recruiter_id?.map(
                              (recruiter) =>
                                recruiter._id?.toString() ||
                                recruiter?.toString()
                            ) || [];

                          if (userId === primaryRecruiterId) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-600">
                                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                Primary
                              </span>
                            );
                          } else if (secondaryRecruiterIds.includes(userId)) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                                Secondary
                              </span>
                            );
                          }
                          return (
                            <span className="text-xs text-slate-400 italic">
                              Not assigned
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(job)}
                          className="border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(job);
                          }}
                          className="border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                          title="Edit Job"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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

              <div className="mb-6 space-y-4">
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search job postings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm hover:shadow-md"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`border-slate-200 bg-white hover:bg-slate-50 transition-all text-slate-700 ${
                      hasActiveFilters() ? "border-cyan-500 bg-cyan-50" : ""
                    }`}
                  >
                    <Filter className="h-4 w-4 mr-2 text-slate-700" />
                    <span className="text-slate-700">Filters</span>
                    {hasActiveFilters() && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500 text-white text-xs font-medium">
                        {
                          [
                            filters.job_type,
                            filters.role.length,
                            filters.min_exp || filters.max_exp,
                            filters.min_ctc || filters.max_ctc,
                            filters.company,
                            filters.skills.length,
                            filters.date_from || filters.date_to,
                          ].filter((v) => v && v !== "" && v !== 0).length
                        }
                      </span>
                    )}
                  </Button>
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

                {/* Filter Sidebar */}
                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetContent
                    side="right"
                    className="w-full sm:w-[400px] overflow-y-auto bg-white p-0"
                  >
                    <SheetHeader className="border-b border-slate-200 pb-4 px-6 pt-6">
                      <SheetTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                        <div className="p-2 rounded-lg bg-slate-100">
                          <Filter className="h-5 w-5 text-cyan-600" />
                        </div>
                        Filter Jobs
                      </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 py-6 px-6 space-y-6 overflow-y-auto">
                      {/* Job Type */}
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-2 block">
                          Job Type
                        </Label>
                        <Select
                          value={tempFilters.job_type || undefined}
                          onValueChange={(value) =>
                            handleTempFilterChange(
                              "job_type",
                              value === "all" ? "" : value
                            )
                          }
                        >
                          <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Full time">Full time</SelectItem>
                            <SelectItem value="Internship">
                              Internship
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Role - Multi-select Dropdown */}
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-2 block">
                          Role
                        </Label>
                        <Select
                          value={undefined}
                          onValueChange={(value) => {
                            if (!tempFilters.role.includes(value)) {
                              handleTempFilterChange("role", [
                                ...tempFilters.role,
                                value,
                              ]);
                            }
                          }}
                        >
                          <SelectTrigger className="!w-full bg-white border-slate-200 text-slate-900">
                            <SelectValue
                              placeholder={
                                tempFilters.role.length > 0
                                  ? `${tempFilters.role.length} role(s) selected`
                                  : "Select roles"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {[
                              "Frontend",
                              "Backend",
                              "Full-stack",
                              "SDET",
                              "QA",
                              "DevOps",
                            ]
                              .filter(
                                (role) => !tempFilters.role.includes(role)
                              )
                              .map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            {tempFilters.role.length === 6 && (
                              <div className="px-2 py-1.5 text-sm text-slate-500">
                                All roles selected
                              </div>
                            )}
                            {tempFilters.role.length === 0 && (
                              <div className="px-2 py-1.5 text-sm text-slate-500">
                                No roles available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {tempFilters.role.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {tempFilters.role.map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium"
                              >
                                {role}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTempFilterChange(
                                      "role",
                                      tempFilters.role.filter((r) => r !== role)
                                    )
                                  }
                                  className="ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Experience Range */}
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-2 block">
                          Experience (years)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={tempFilters.min_exp}
                            onChange={(e) =>
                              handleTempFilterChange("min_exp", e.target.value)
                            }
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
                            min="0"
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={tempFilters.max_exp}
                            onChange={(e) =>
                              handleTempFilterChange("max_exp", e.target.value)
                            }
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* CTC Range */}
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-2 block">
                          CTC (LPA)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={tempFilters.min_ctc}
                            onChange={(e) =>
                              handleTempFilterChange("min_ctc", e.target.value)
                            }
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
                            min="0"
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={tempFilters.max_ctc}
                            onChange={(e) =>
                              handleTempFilterChange("max_ctc", e.target.value)
                            }
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* Company */}
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-2 block">
                          Company
                        </Label>
                        <Input
                          type="text"
                          placeholder="Filter by company..."
                          value={tempFilters.company}
                          onChange={(e) =>
                            handleTempFilterChange("company", e.target.value)
                          }
                          className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
                        />
                      </div>

                      {/* Skills - Multi-select Dropdown */}
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-2 block">
                          Skills
                        </Label>
                        <Select
                          value={undefined}
                          onValueChange={(value) => {
                            if (!tempFilters.skills.includes(value)) {
                              handleTempFilterChange("skills", [
                                ...tempFilters.skills,
                                value,
                              ]);
                            }
                          }}
                        >
                          <SelectTrigger className="!w-full bg-white border-slate-200 text-slate-900">
                            <SelectValue
                              placeholder={
                                tempFilters.skills.length > 0
                                  ? `${tempFilters.skills.length} skill(s) selected`
                                  : "Select skills"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {[
                              "React",
                              "Next.js",
                              "Node.js",
                              "Express.js",
                              "MongoDB",
                              "SQL",
                              "JavaScript",
                              "TypeScript",
                              "Python",
                              "Java",
                              "C++",
                              "Go",
                              "AWS",
                              "Docker",
                              "Kubernetes",
                              "Git",
                              "GraphQL",
                              "Redis",
                            ]
                              .filter(
                                (skill) => !tempFilters.skills.includes(skill)
                              )
                              .map((skill) => (
                                <SelectItem key={skill} value={skill}>
                                  {skill}
                                </SelectItem>
                              ))}
                            {tempFilters.skills.length === 18 && (
                              <div className="px-2 py-1.5 text-sm text-slate-500">
                                All skills selected
                              </div>
                            )}
                            {tempFilters.skills.length === 0 && (
                              <div className="px-2 py-1.5 text-sm text-slate-500">
                                No skills available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {tempFilters.skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {tempFilters.skills.map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium"
                              >
                                {skill}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTempFilterChange(
                                      "skills",
                                      tempFilters.skills.filter(
                                        (s) => s !== skill
                                      )
                                    )
                                  }
                                  className="ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Date From */}
                      {/* <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Posted From
                        </Label>
                        <Input
                          type="date"
                          value={tempFilters.date_from}
                          onChange={(e) => handleTempFilterChange("date_from", e.target.value)}
                          className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                        />
                      </div> */}

                      {/* Date To */}
                      {/* <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Posted To
                        </Label>
                        <Input
                          type="date"
                          value={tempFilters.date_to}
                          onChange={(e) => handleTempFilterChange("date_to", e.target.value)}
                          className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                        />
                      </div> */}
                    </div>

                    <SheetFooter className="border-t border-slate-200 pt-4 px-6 pb-6 gap-2">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                      <Button
                        onClick={applyFilters}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25"
                      >
                        Apply Filters
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>

              {isRecruiter && (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                      Your Job Postings
                    </h2>
                    {filterJobs(jobPostings.myJobPostings).length > 0 ? (
                      <JobTable
                        jobs={filterJobs(jobPostings.myJobPostings)}
                        showEdit={true}
                      />
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
                      <JobTable
                        jobs={filterJobs(jobPostings.secondaryJobPostings)}
                        showEdit={false}
                      />
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
                      <JobTable
                        jobs={filterJobs(jobPostings.remainingJobPostings)}
                        showEdit={false}
                      />
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
                    <JobTable
                      jobs={filterJobs(jobPostings.allJobPostings)}
                      showEdit={false}
                    />
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader className="pb-4 border-b border-slate-200">
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  {editingJob ? "Edit Job Posting" : "Create New Job Posting"}
                </DialogTitle>
                <DialogDescription className="text-slate-600 mt-1">
                  {editingJob
                    ? "Update the job posting details below."
                    : "Fill in the details to create a new job posting."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {!editingJob && (
                  <div className="space-y-2">
                    <Label htmlFor="id" className="text-slate-900 font-medium">
                      Job ID *
                    </Label>
                    <Input
                      id="id"
                      value={jobForm.id}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, id: e.target.value })
                      }
                      placeholder="e.g., JOB-1001"
                      className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="title"
                      className="text-slate-900 font-medium"
                    >
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
                    <Label
                      htmlFor="company"
                      className="text-slate-900 font-medium"
                    >
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
                    <Label
                      htmlFor="role"
                      className="text-slate-900 font-medium"
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
                                  role: jobForm.role.filter(
                                    (_, i) => i !== idx
                                  ),
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
                    <Label
                      htmlFor="exp_req"
                      className="text-slate-900 font-medium"
                    >
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
                  <Label
                    htmlFor="skills"
                    className="text-slate-900 font-medium"
                  >
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

                {/* Secondary Recruiters - Available for all roles */}
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
                              editingJob?.primary_recruiter_id?._id?.toString() ||
                              editingJob?.primary_recruiter_id?.toString();
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
                          editingJob?.primary_recruiter_id?._id?.toString() ||
                          editingJob?.primary_recruiter_id?.toString();
                        return (
                          recruiterIdStr !== user.id?.toString() &&
                          recruiterIdStr !== primaryRecruiterId &&
                          !jobForm.secondary_recruiter_id.includes(
                            recruiterIdStr
                          )
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
              </div>

              <DialogFooter className="border-t border-slate-200 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingJob(null);
                    resetForm();
                  }}
                  className="border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300"
                  onClick={editingJob ? handleUpdateJob : handleCreateJob}
                >
                  {editingJob ? "Update Job" : "Create Job"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Job Details View Dialog */}
          <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
              {viewingJob && (
                <>
                  <DialogHeader className="pb-4 border-b border-slate-200">
                    <DialogTitle className="text-3xl font-bold text-slate-900">
                      {viewingJob.title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 mt-1">
                      Complete job posting details
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Basic Information Grid */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                          Company
                        </Label>
                        <p className="text-base text-slate-900 font-medium">
                          {typeof viewingJob.company === "string"
                            ? viewingJob.company
                            : viewingJob.company?.name || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                          Job Type
                        </Label>
                        <p className="text-base text-slate-900 font-medium">
                          {viewingJob.job_type || "Full time"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                          Salary (CTC)
                        </Label>
                        <p className="text-base text-slate-900 font-medium">
                          {viewingJob.ctc || "Not specified"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                          Experience Required
                        </Label>
                        <p className="text-base text-slate-900 font-medium">
                          {viewingJob.exp_req !== undefined &&
                          viewingJob.exp_req > 0
                            ? `${viewingJob.exp_req} years`
                            : "Not specified"}
                        </p>
                      </div>
                      {viewingJob.createdAt && (
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                            Posted Date
                          </Label>
                          <p className="text-base text-slate-900 font-medium">
                            {new Date(
                              viewingJob.createdAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Roles */}
                    {viewingJob.role && viewingJob.role.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide block">
                          Roles
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {viewingJob.role.map((r, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 text-sm font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {typeof r === "string" ? r : r?.name || String(r)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {viewingJob.description && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide block">
                          Description
                        </Label>
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {viewingJob.description}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {viewingJob.skills && viewingJob.skills.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide block">
                          Required Skills
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {viewingJob.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 text-sm font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {typeof skill === "string"
                                ? skill
                                : skill?.name || String(skill)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Secondary Recruiters */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                          Secondary Recruiters
                        </Label>
                        {isRecruiter &&
                          viewingJob.primary_recruiter_id &&
                          viewingJob.primary_recruiter_id._id?.toString() ===
                            user.id?.toString() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setEditingSecondaryRecruiters(
                                  !editingSecondaryRecruiters
                                )
                              }
                              className="h-8 text-xs"
                            >
                              {editingSecondaryRecruiters ? (
                                <>
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </>
                              ) : (
                                <>
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </>
                              )}
                            </Button>
                          )}
                      </div>

                      {editingSecondaryRecruiters ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {tempSecondaryRecruiters.map((recruiterId, idx) => {
                              const recruiterIdStr = recruiterId.toString();
                              const recruiter = recruiters.find(
                                (r) => r._id?.toString() === recruiterIdStr
                              );
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200"
                                >
                                  {recruiter?.name || recruiterIdStr}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveSecondaryRecruiter(
                                        recruiterIdStr
                                      )
                                    }
                                    className="hover:bg-cyan-100 rounded-full p-0.5 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>

                          {isRecruiter && recruiters.length > 0 && (
                            <Select
                              value=""
                              onValueChange={(value) => {
                                handleAddSecondaryRecruiter(value);
                              }}
                            >
                              <SelectTrigger className="bg-white border-slate-200">
                                <SelectValue placeholder="Add a recruiter..." />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                {recruiters
                                  .filter((recruiter) => {
                                    const recruiterIdStr =
                                      recruiter._id?.toString();
                                    return (
                                      recruiterIdStr !== user.id?.toString() &&
                                      !tempSecondaryRecruiters.includes(
                                        recruiterIdStr
                                      ) &&
                                      viewingJob.primary_recruiter_id?._id?.toString() !==
                                        recruiterIdStr
                                    );
                                  })
                                  .map((recruiter) => (
                                    <SelectItem
                                      key={recruiter._id}
                                      value={recruiter._id?.toString()}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-slate-500" />
                                        <span>{recruiter.name}</span>
                                        <span className="text-xs text-slate-500">
                                          ({recruiter.email})
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}

                          <div className="flex gap-2">
                            <Button
                              onClick={handleSaveSecondaryRecruiters}
                              disabled={savingRecruiters}
                              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                            >
                              {savingRecruiters ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                // Reset to original values
                                const currentRecruiters =
                                  viewingJob.secondary_recruiter_id
                                    ? Array.isArray(
                                        viewingJob.secondary_recruiter_id
                                      )
                                      ? viewingJob.secondary_recruiter_id.map(
                                          (r) => {
                                            if (
                                              typeof r === "object" &&
                                              r !== null
                                            ) {
                                              return (
                                                r._id?.toString() ||
                                                r.toString()
                                              );
                                            }
                                            return r?.toString();
                                          }
                                        )
                                      : []
                                    : [];
                                setTempSecondaryRecruiters(currentRecruiters);
                                setEditingSecondaryRecruiters(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const currentRecruiters =
                              viewingJob.secondary_recruiter_id
                                ? Array.isArray(
                                    viewingJob.secondary_recruiter_id
                                  )
                                  ? viewingJob.secondary_recruiter_id
                                  : []
                                : [];
                            return currentRecruiters.length > 0 ? (
                              currentRecruiters.map((recruiterId, idx) => {
                                const recruiterIdStr =
                                  typeof recruiterId === "object" &&
                                  recruiterId !== null
                                    ? recruiterId._id?.toString() ||
                                      recruiterId.toString()
                                    : recruiterId?.toString();
                                const recruiterName =
                                  typeof recruiterId === "object" &&
                                  recruiterId !== null
                                    ? recruiterId.name
                                    : null;
                                const recruiter = recruiters.find(
                                  (r) => r._id?.toString() === recruiterIdStr
                                );
                                return (
                                  <span
                                    key={idx}
                                    className="px-3 py-1.5 text-sm font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                                  >
                                    {recruiter?.name ||
                                      recruiterName ||
                                      recruiterIdStr ||
                                      "Unknown"}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-sm text-slate-500 italic">
                                No secondary recruiters assigned
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter className="border-t border-slate-200 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowViewDialog(false);
                        setEditingSecondaryRecruiters(false);
                      }}
                    >
                      Close
                    </Button>
                    {isRecruiter &&
                      viewingJob.primary_recruiter_id &&
                      viewingJob.primary_recruiter_id._id?.toString() ===
                        user.id?.toString() && (
                        <Button
                          onClick={() => {
                            setShowViewDialog(false);
                            setEditingSecondaryRecruiters(false);
                            openEditDialog(viewingJob);
                          }}
                          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Job
                        </Button>
                      )}
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
