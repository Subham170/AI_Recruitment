"use client";

import { GlassBackground } from "@/components/GlassShell";
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Filter,
  Loader2,
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
  const [jobPostings, setJobPostings] = useState({
    myJobPostings: [],
    secondaryJobPostings: [],
    remainingJobPostings: [],
    allJobPostings: [],
  });
  const [jobCounts, setJobCounts] = useState({
    myJobPostingsCount: 0,
    secondaryJobPostingsCount: 0,
    remainingJobPostingsCount: 0,
    totalCount: 0,
  });
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [loadingRecruiters, setLoadingRecruiters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Applied filters (used for API calls)
  const [filters, setFilters] = useState({
    job_type: "",
    role: "",
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
    role: "",
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

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: null, // 'title', 'company', 'job_type', 'ctc', 'createdAt'
    direction: "asc", // 'asc' or 'desc'
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    myJobs: { page: 1, rowsPerPage: 10 },
    secondaryJobs: { page: 1, rowsPerPage: 10 },
    remainingJobs: { page: 1, rowsPerPage: 10 },
    allJobs: { page: 1, rowsPerPage: 10 },
  });

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
    const loadData = async () => {
      await fetchJobPostings();
      setInitialLoading(false);
    };
    loadData();
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
    if (user && user.role === "recruiter" && recruiters.length === 0) {
      fetchRecruiters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      const roleFilterArray = parseRoleFilter(filters.role);

      const filterParams = {
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(filters.job_type && { job_type: filters.job_type }),
        ...(roleFilterArray.length > 0 && { role: roleFilterArray }),
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
        setJobCounts({
          myJobPostingsCount: response.myJobPostingsCount || 0,
          secondaryJobPostingsCount: response.secondaryJobPostingsCount || 0,
          remainingJobPostingsCount: response.remainingJobPostingsCount || 0,
          totalCount: response.count || 0,
        });
      } else {
        setJobPostings({
          myJobPostings: [],
          secondaryJobPostings: [],
          remainingJobPostings: [],
          allJobPostings: response.jobPostings || [],
        });
        setJobCounts({
          myJobPostingsCount: 0,
          secondaryJobPostingsCount: 0,
          remainingJobPostingsCount: 0,
          totalCount: response.count || 0,
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateJob = async () => {
    try {
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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
      ctc: normalizeCtcValue(job.ctc),
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
    // Navigate to job detail page instead of opening modal
    router.push(
      `/dashboard/${user.role}/manage-job-posting/${job._id || job.id}`
    );
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
    // Reset pagination when filters change
    setPagination({
      myJobs: { page: 1, rowsPerPage: pagination.myJobs.rowsPerPage },
      secondaryJobs: {
        page: 1,
        rowsPerPage: pagination.secondaryJobs.rowsPerPage,
      },
      remainingJobs: {
        page: 1,
        rowsPerPage: pagination.remainingJobs.rowsPerPage,
      },
      allJobs: { page: 1, rowsPerPage: pagination.allJobs.rowsPerPage },
    });
  };

  const clearFilters = () => {
    const emptyFilters = {
      job_type: "",
      role: "",
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
    setShowFilters(false);
    // Reset pagination when filters are cleared
    setPagination({
      myJobs: { page: 1, rowsPerPage: pagination.myJobs.rowsPerPage },
      secondaryJobs: {
        page: 1,
        rowsPerPage: pagination.secondaryJobs.rowsPerPage,
      },
      remainingJobs: {
        page: 1,
        rowsPerPage: pagination.remainingJobs.rowsPerPage,
      },
      allJobs: { page: 1, rowsPerPage: pagination.allJobs.rowsPerPage },
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.job_type ||
      filters.role ||
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

  const parseRoleFilter = (roleText) => {
    if (!roleText) return [];

    return roleText
      .split(/[\n,]/)
      .map((role) => role.trim())
      .filter(Boolean);
  };

  const normalizeCtcValue = (ctc) => {
    if (ctc === null || ctc === undefined) return "";
    if (typeof ctc === "number") return ctc.toString();
    const match = ctc.toString().match(/[\d.]+/);
    return match ? match[0] : "";
  };

  const formatCtcDisplay = (ctc) => {
    if (ctc === null || ctc === undefined || ctc === "") {
      return "Not specified";
    }
    const num = typeof ctc === "number" ? ctc : parseFloat(ctc);
    if (!Number.isNaN(num)) {
      return `${num} LPA`;
    }
    return ctc;
  };

  // Sort function
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    // Reset pagination to page 1 when sorting changes
    setPagination((prev) => ({
      myJobs: { ...prev.myJobs, page: 1 },
      secondaryJobs: { ...prev.secondaryJobs, page: 1 },
      remainingJobs: { ...prev.remainingJobs, page: 1 },
      allJobs: { ...prev.allJobs, page: 1 },
    }));
  };

  // Sort jobs based on sortConfig
  const sortJobs = (jobs) => {
    if (!sortConfig.key) return jobs;

    const sorted = [...jobs].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "title":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
          break;
        case "company":
          aValue =
            typeof a.company === "string"
              ? a.company.toLowerCase()
              : a.company?.name?.toLowerCase() || "";
          bValue =
            typeof b.company === "string"
              ? b.company.toLowerCase()
              : b.company?.name?.toLowerCase() || "";
          break;
        case "job_type":
          aValue = (a.job_type || "Full time").toLowerCase();
          bValue = (b.job_type || "Full time").toLowerCase();
          break;
        case "ctc":
          aValue = a.ctc
            ? parseFloat(a.ctc.toString().match(/[\d.]+/)?.[0] || 0)
            : 0;
          bValue = b.ctc
            ? parseFloat(b.ctc.toString().match(/[\d.]+/)?.[0] || 0)
            : 0;
          break;
        case "createdAt":
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  // Sort icon component
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 text-slate-400" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-4 w-4 text-indigo-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-indigo-600" />
    );
  };

  // Pagination handlers
  const handlePageChange = (section, newPage) => {
    setPagination((prev) => ({
      ...prev,
      [section]: { ...prev[section], page: newPage },
    }));
  };

  const handleRowsPerPageChange = (section, newRowsPerPage) => {
    setPagination((prev) => ({
      ...prev,
      [section]: { page: 1, rowsPerPage: newRowsPerPage },
    }));
  };

  // Pagination component
  const PaginationControls = ({
    section,
    totalItems,
    currentPage,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
  }) => {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);

    if (totalItems === 0) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push("...");
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push("...");
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push("...");
          for (let i = currentPage - 1; i <= currentPage + 1; i++)
            pages.push(i);
          pages.push("...");
          pages.push(totalPages);
        }
      }
      return pages;
    };

    return (
      <div className="flex flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/80 border-t border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="text-sm font-medium text-slate-700">
              Rows per page:
            </span>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => onRowsPerPageChange(parseInt(value))}
            >
              <SelectTrigger className="w-20 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-4 w-px bg-slate-300"></div>
          <span className="text-sm text-slate-600 font-medium whitespace-nowrap">
            Showing{" "}
            <span className="text-slate-900 font-semibold">
              {startIndex + 1}
            </span>{" "}
            to <span className="text-slate-900 font-semibold">{endIndex}</span>{" "}
            of{" "}
            <span className="text-slate-900 font-semibold">{totalItems}</span>{" "}
            entries
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                  ...
                </span>
              ) : (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={`h-8 min-w-8 ${
                    currentPage === page ? "bg-indigo-600 text-white" : ""
                  }`}
                >
                  {page}
                </Button>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Job table component
  const JobTable = ({
    jobs,
    showEdit = false,
    section = "myJobs",
    totalCount = 0,
  }) => {
    if (!jobs || jobs.length === 0) {
      return null;
    }

    // Sort jobs before displaying
    const sortedJobs = sortJobs(jobs);

    // Get pagination config for this section
    const paginationConfig = pagination[section] || {
      page: 1,
      rowsPerPage: 10,
    };
    const { page, rowsPerPage } = paginationConfig;

    // Calculate pagination
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedJobs = sortedJobs.slice(startIndex, endIndex);

    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80">
                <th
                  className="text-left p-4 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-2">
                    Job Role
                    <SortIcon columnKey="title" />
                  </div>
                </th>
                <th
                  className="text-left p-4 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                  onClick={() => handleSort("company")}
                >
                  <div className="flex items-center gap-2">
                    Company Name
                    <SortIcon columnKey="company" />
                  </div>
                </th>
                <th
                  className="text-left p-4 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                  onClick={() => handleSort("job_type")}
                >
                  <div className="flex items-center gap-2">
                    Job Type
                    <SortIcon columnKey="job_type" />
                  </div>
                </th>
                <th
                  className="text-left p-4 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                  onClick={() => handleSort("ctc")}
                >
                  <div className="flex items-center gap-2">
                    Salary Range
                    <SortIcon columnKey="ctc" />
                  </div>
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
              {paginatedJobs.map((job, index) => {
                const isOwner =
                  isRecruiter &&
                  job.primary_recruiter_id &&
                  job.primary_recruiter_id._id?.toString() ===
                    user.id?.toString();
                const isLastRow = index === paginatedJobs.length - 1;

                return (
                  <tr
                    key={job._id}
                    onClick={() => handleViewDetails(job)}
                    className={`bg-white hover:bg-slate-50 transition-colors duration-150 cursor-pointer ${
                      !isLastRow ? "border-b border-slate-200" : ""
                    }`}
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
                        {formatCtcDisplay(job.ctc)}
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
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-linear-to-r from-cyan-500 to-blue-600 text-white border border-cyan-600">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(job);
                          }}
                          className="border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {showEdit && (
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
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls
          section={section}
          totalItems={totalCount || sortedJobs.length}
          currentPage={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(newPage) => handlePageChange(section, newPage)}
          onRowsPerPageChange={(newRowsPerPage) =>
            handleRowsPerPageChange(section, newRowsPerPage)
          }
        />
      </div>
    );
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7] text-slate-900">
      <GlassBackground />
      <aside className="hidden lg:block relative z-10">
        <Sidebar />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 bg-white/10 text-slate-900 border-r border-white/30 backdrop-blur-2xl"
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
          {loading || initialLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loading />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 drop-shadow-[0_1px_1px_rgba(15,23,42,0.18)] mb-2">
                  Manage Job Posting
                </h1>
                <p className="text-base font-medium text-slate-800 drop-shadow-[0_1px_1px_rgba(15,23,42,0.12)]">
                  Create, edit, and manage your job postings
                </p>
              </div>

              {canCreate && (
                <div className="lg:hidden mb-4">
                  <Button
                    className="w-full cursor-pointer bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
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
                    <Search className="pointer-events-none absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors z-10" />
                    <input
                      type="text"
                      placeholder="Search job postings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-white/70 rounded-lg bg-white/70 backdrop-blur-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200/80 focus:border-indigo-400 transition-all shadow-inner shadow-white/40 hover:shadow-md"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`cursor-pointer rounded-md px-4 py-2.5 backdrop-blur-xl shadow-sm transition-all
                      hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:shadow-indigo-500/40
                      ${
                        hasActiveFilters()
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/40"
                          : "bg-white/80 text-slate-700 border-white/70"
                      }`}
                  >
                    <Filter className="h-4 w-4 mr-2 text-slate-700" />
                    <span className="text-slate-700">Filters</span>
                    {hasActiveFilters() && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-medium">
                        {
                          [
                            filters.job_type,
                            filters.role,
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
                        className="cursor-pointer bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
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
                    className="w-full sm:w-[400px] overflow-y-auto bg-white/80 backdrop-blur-2xl p-0 border-l border-white/60"
                  >
                    <SheetHeader className="border-b border-white/60 pb-4 px-6 pt-6">
                      <SheetTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                        <div className="p-2 rounded-lg bg-indigo-50">
                          <Filter className="h-5 w-5 text-indigo-600" />
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
                          <SelectTrigger className="w-full bg-white/70 border-white/70 text-slate-900 backdrop-blur">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-white/70">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Full time">Full time</SelectItem>
                            <SelectItem value="Internship">
                              Internship
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Role - Single text filter */}
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-2 block">
                          Role
                        </Label>
                        <Input
                          type="text"
                          placeholder="Filter by role (e.g. Frontend Developer)"
                          value={tempFilters.role}
                          onChange={(e) =>
                            handleTempFilterChange("role", e.target.value)
                          }
                          className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur rounded-xl shadow-sm"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Jobs matching the{" "}
                          <span className="font-semibold">role</span> you enter
                          will be shown.
                        </p>
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
                            className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur"
                            min="0"
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={tempFilters.max_exp}
                            onChange={(e) =>
                              handleTempFilterChange("max_exp", e.target.value)
                            }
                            className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur"
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
                            className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur"
                            min="0"
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={tempFilters.max_ctc}
                            onChange={(e) =>
                              handleTempFilterChange("max_ctc", e.target.value)
                            }
                            className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur"
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
                          className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur"
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
                          <SelectTrigger className="w-full! bg-white/70 border-white/70 text-slate-900 backdrop-blur">
                            <SelectValue
                              placeholder={
                                tempFilters.skills.length > 0
                                  ? `${tempFilters.skills.length} skill(s) selected`
                                  : "Select skills"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-white/70">
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium"
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

                    <SheetFooter className="border-t border-white/60 pt-4 px-6 pb-6 gap-2">
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
                        className="flex-1 bg-linear-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white shadow-lg shadow-indigo-500/25"
                      >
                        Apply Filters
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Table Content with Loading State */}
              <div className="relative">
                {loadingJobs && !initialLoading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <Loading size="md" />
                  </div>
                )}

                {isRecruiter && (
                  <>
                    <div className="mb-8">
                      <h2 className="text-2xl font-semibold mb-2 text-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.32)]">
                        Your Open Roles
                      </h2>
                      <p className="text-sm text-slate-700 mb-2">
                        Positions where you are the primary owner.
                      </p>
                      {filterJobs(jobPostings.myJobPostings).length > 0 ? (
                        <JobTable
                          jobs={filterJobs(jobPostings.myJobPostings)}
                          showEdit={true}
                          section="myJobs"
                          totalCount={
                            filterJobs(jobPostings.myJobPostings).length
                          }
                        />
                      ) : (
                        <div className="bg-slate-50/90 backdrop-blur-sm border border-dashed border-slate-300 rounded-xl p-8 text-center">
                          <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                          <p className="text-slate-600 font-medium">
                            No job postings created by you yet.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mb-8">
                      <h2 className="text-2xl font-semibold mb-2 text-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.32)]">
                        Shared with You
                      </h2>
                      <p className="text-sm text-slate-700 mb-2">
                        Roles where you support another recruiter.
                      </p>
                      {filterJobs(jobPostings.secondaryJobPostings).length >
                      0 ? (
                        <JobTable
                          jobs={filterJobs(jobPostings.secondaryJobPostings)}
                          showEdit={false}
                          section="secondaryJobs"
                          totalCount={
                            filterJobs(jobPostings.secondaryJobPostings).length
                          }
                        />
                      ) : (
                        <div className="bg-slate-50/90 backdrop-blur-sm border border-dashed border-slate-300 rounded-xl p-8 text-center">
                          <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                          <p className="text-slate-600 font-medium">
                            You are not assigned as a secondary recruiter to any
                            job postings.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mb-8">
                      <h2 className="text-2xl font-semibold mb-2 text-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.32)]">
                        All Other Roles
                      </h2>
                      <p className="text-sm text-slate-700 mb-2">
                        Open roles in the system you are not assigned to.
                      </p>
                      {filterJobs(jobPostings.remainingJobPostings).length >
                      0 ? (
                        <JobTable
                          jobs={filterJobs(jobPostings.remainingJobPostings)}
                          showEdit={false}
                          section="remainingJobs"
                          totalCount={
                            filterJobs(jobPostings.remainingJobPostings).length
                          }
                        />
                      ) : (
                        <div className="bg-slate-50/90 backdrop-blur-sm border border-dashed border-slate-300 rounded-xl p-8 text-center">
                          <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                          <p className="text-slate-600 font-medium">
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
                        section="allJobs"
                        totalCount={
                          filterJobs(jobPostings.allJobPostings).length
                        }
                      />
                    ) : (
                      <div className="bg-slate-50/90 backdrop-blur-sm border border-dashed border-slate-300 rounded-xl p-8 text-center">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                        <p className="text-slate-600 font-medium">
                          No job postings available.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <Dialog
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) {
                setEditingJob(null);
                resetForm();
                setIsSubmitting(false);
              }
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-2xl border border-white/70">
              <DialogHeader className="pb-4 border-b border-white/60">
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
                      className="border-white/70 bg-white/80 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/70 focus:shadow-lg focus:shadow-indigo-400/20 transition-all duration-200 backdrop-blur"
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
                      className="border-white/70 bg-white/80 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/70 focus:shadow-lg focus:shadow-indigo-400/20 transition-all duration-200 backdrop-blur"
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
                      className="border-white/70 bg-white/80 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/70 focus:shadow-lg focus:shadow-indigo-400/20 transition-all duration-200 backdrop-blur"
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
                    setIsSubmitting(false);
                  }}
                  className="border-slate-200 hover:bg-slate-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300"
                  onClick={editingJob ? handleUpdateJob : handleCreateJob}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingJob ? "Updating..." : "Creating..."}
                    </>
                  ) : editingJob ? (
                    "Update Job"
                  ) : (
                    "Create Job"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
