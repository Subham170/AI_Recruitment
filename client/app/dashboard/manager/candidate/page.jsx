"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { candidateAPI, resumeParserAPI } from "@/lib/api";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CandidatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [parseResumeFile, setParseResumeFile] = useState(null);
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseResumeModalOpen, setParseResumeModalOpen] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedResumeData, setParsedResumeData] = useState(null);
  const [parsedResumeUrl, setParsedResumeUrl] = useState(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: null, // 'name', 'email', 'experience', 'createdAt', 'lastInterviewDate'
    direction: "asc", // 'asc' or 'desc'
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    rowsPerPage: 20, // Default 20 to match backend
  });
  
  // Server-side pagination metadata
  const [paginationMeta, setPaginationMeta] = useState({
    currentPage: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filtering state
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    experience_min: "",
    experience_max: "",
    date_from: "",
    date_to: "",
  });

  // Temporary filters (for sidebar inputs, not applied until Apply is clicked)
  const [tempFilters, setTempFilters] = useState({
    name: "",
    email: "",
    experience_min: "",
    experience_max: "",
    date_from: "",
    date_to: "",
  });

  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_no: "",
    skills: "",
    experience: "",
    role: "",
    bio: "",
    resume_url: "",
  });
  const [resumeFile, setResumeFile] = useState(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "manager") {
      router.push(`/dashboard/${user.role}/candidate`);
      return;
    }

    const loadData = async () => {
      await fetchCandidates();
      setInitialLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  // Reset pagination when search query changes (before debounce)
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch candidates when debounced search or pagination changes
  useEffect(() => {
    if (user && !initialLoading) {
      fetchCandidates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, pagination.page, pagination.rowsPerPage, user, initialLoading]);

  const fetchCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const response = await candidateAPI.getCandidates(
        debouncedSearchQuery,
        pagination.page,
        pagination.rowsPerPage
      );
      setCandidates(response.candidates || []);
      
      // Update pagination metadata from server response
      if (response.pagination) {
        setPaginationMeta({
          currentPage: response.pagination.currentPage || pagination.page,
          limit: response.pagination.limit || pagination.rowsPerPage,
          totalCount: response.pagination.totalCount || 0,
          totalPages: response.pagination.totalPages || 0,
          hasNextPage: response.pagination.hasNextPage || false,
          hasPrevPage: response.pagination.hasPrevPage || false,
        });
      }
    } catch (err) {
      setError(err.message || "Failed to fetch candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateResumeFile = (file) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF or Word document");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return false;
    }
    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateResumeFile(file)) {
        setParseResumeFile(file);
        setError("");
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateResumeFile(file)) {
        setParseResumeFile(file);
        setError("");
      }
    }
  };

  const handleParseResume = async (saveToDatabase = false) => {
    if (!parseResumeFile) {
      setError("Please select a resume file");
      return;
    }

    setIsParsingResume(true);
    setError("");
    setSuccess("");
    setParsedResumeData(null);

    try {
      const response = await resumeParserAPI.parseFromFile(
        parseResumeFile,
        parseResumeFile.name,
        saveToDatabase
      );

      if (response.success) {
        // Use formatted data for display
        setParsedResumeData(response.data.formatted);
        setParsedResumeUrl(response.data.resume_url || null);
        setSuccess(response.message || "Resume parsed successfully!");

        // If saved to database, refresh candidates list
        if (saveToDatabase && response.data.candidate) {
          fetchCandidates();
        }
      } else {
        // Handle missing required fields
        if (response.data?.missingFields) {
          const missing = [];
          if (response.data.missingFields.name) missing.push("Name");
          if (response.data.missingFields.email) missing.push("Email");
          setError(
            `Required fields missing: ${missing.join(
              ", "
            )}. Cannot save candidate without these fields.`
          );
          setParsedResumeData(response.data.formatted);
        } else {
          setError(response.message || "Failed to parse resume");
        }
      }
    } catch (err) {
      setError(err.message || "Failed to parse resume. Please try again.");
    } finally {
      setIsParsingResume(false);
    }
  };

  const resetParseResumeModal = () => {
    setParseResumeFile(null);
    setParsedResumeData(null);
    setParsedResumeUrl(null);
    setError("");
    setSuccess("");
    setDragActive(false);
    setIsParsingResume(false);
  };

  const validateForm = () => {
    if (!formData.name || !formData.email) {
      setError("Name and email are required fields");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (formData.experience && isNaN(formData.experience)) {
      setError("Experience must be a number");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData if resume file is present (file upload takes priority over resume_url)
      let response;
      if (resumeFile) {
        const formDataObj = new FormData();
        formDataObj.append("name", formData.name);
        formDataObj.append("email", formData.email);
        if (formData.phone_no) formDataObj.append("phone_no", formData.phone_no);
        if (formData.skills) {
          // Append each skill separately or as comma-separated string (backend will parse)
          formDataObj.append("skills", formData.skills);
        }
        if (formData.experience) formDataObj.append("experience", formData.experience);
        if (formData.role) {
          // Append role as comma-separated string (backend will parse)
          formDataObj.append("role", formData.role);
        }
        if (formData.bio) formDataObj.append("bio", formData.bio);
        formDataObj.append("resume", resumeFile);
        // If resume_url exists, include it as fallback (but file upload will override it)
        if (formData.resume_url) {
          formDataObj.append("resume_url", formData.resume_url);
        }

        // Use fetch directly for FormData
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const fetchResponse = await fetch(`${API_BASE_URL}/candidates`, {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            // Don't set Content-Type - browser will set it with boundary for multipart/form-data
          },
          body: formDataObj,
        });

        const data = await fetchResponse.json();
        if (!fetchResponse.ok) {
          throw new Error(data.message || "Failed to create candidate");
        }
        response = data;
      } else {
        // No file, use regular API call (may include resume_url if from parsed data)
        const candidateData = {
          name: formData.name,
          email: formData.email,
          phone_no: formData.phone_no || undefined,
          skills: formData.skills
            ? formData.skills.split(",").map((s) => s.trim())
            : [],
          experience: formData.experience ? parseInt(formData.experience) : 0,
          role: formData.role
            ? formData.role
                .split(",")
                .map((r) => r.trim())
                .filter((r) => r)
            : [],
          bio: formData.bio || undefined,
          resume_url: formData.resume_url || undefined, // Include resume_url if available
        };

        response = await candidateAPI.createCandidate(candidateData);
      }
      setSuccess(
        `Candidate created successfully! ${response.candidate.name} has been added.`
      );

      resetForm();
      setFormOpen(false);
      fetchCandidates();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.message || "Failed to create candidate. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone_no: "",
      skills: "",
      experience: "",
      role: "",
      bio: "",
      resume_url: "",
    });
    setResumeFile(null);
    setError("");
    setSuccess("");
  };

  const openAddForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleRowClick = (candidate) => {
    const candidateId = candidate._id || candidate.id;
    router.push(`/dashboard/manager/candidate/${candidateId}`);
  };

  const getRoleBadgeVariant = (roles) => {
    if (!roles || roles.length === 0) return "outline";
    return "secondary";
  };

  // Sort function
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    // Reset pagination to page 1 when sorting changes
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Sort candidates based on sortConfig
  const sortCandidates = (candidatesList) => {
    if (!sortConfig.key) return candidatesList;

    const sorted = [...candidatesList].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "name":
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
          break;
        case "email":
          aValue = (a.email || "").toLowerCase();
          bValue = (b.email || "").toLowerCase();
          break;
        case "experience":
          aValue = a.experience !== undefined ? a.experience : 0;
          bValue = b.experience !== undefined ? b.experience : 0;
          break;
        case "createdAt":
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case "lastInterviewDate":
          aValue = a.lastInterviewDate ? new Date(a.lastInterviewDate).getTime() : 0;
          bValue = b.lastInterviewDate ? new Date(b.lastInterviewDate).getTime() : 0;
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

  // Filter candidates based on filters
  const filterCandidates = (candidatesList) => {
    return candidatesList.filter((candidate) => {
      // Name filter
      if (filters.name) {
        const nameMatch = (candidate.name || "")
          .toLowerCase()
          .includes(filters.name.toLowerCase());
        if (!nameMatch) return false;
      }

      // Email filter
      if (filters.email) {
        const emailMatch = (candidate.email || "")
          .toLowerCase()
          .includes(filters.email.toLowerCase());
        if (!emailMatch) return false;
      }

      // Experience filter
      if (filters.experience_min) {
        const exp =
          candidate.experience !== undefined ? candidate.experience : 0;
        if (exp < parseFloat(filters.experience_min)) return false;
      }
      if (filters.experience_max) {
        const exp =
          candidate.experience !== undefined ? candidate.experience : 0;
        if (exp > parseFloat(filters.experience_max)) return false;
      }

      // Date filter
      if (filters.date_from || filters.date_to) {
        if (!candidate.createdAt) return false;
        const candidateDate = new Date(candidate.createdAt);
        if (filters.date_from) {
          const fromDate = new Date(filters.date_from);
          if (candidateDate < fromDate) return false;
        }
        if (filters.date_to) {
          const toDate = new Date(filters.date_to);
          toDate.setHours(23, 59, 59, 999);
          if (candidateDate > toDate) return false;
        }
      }

      return true;
    });
  };

  // Apply filters
  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
    // Reset pagination when filters change
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Clear filters
  const clearFilters = () => {
    const emptyFilters = {
      name: "",
      email: "",
      experience_min: "",
      experience_max: "",
      date_from: "",
      date_to: "",
    };
    setTempFilters(emptyFilters);
    setFilters(emptyFilters);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setShowFilters(false);
    // Reset pagination when filters are cleared
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = () => {
    return (
      filters.name ||
      filters.email ||
      filters.experience_min ||
      filters.experience_max ||
      filters.date_from ||
      filters.date_to ||
      searchQuery
    );
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    // Fetch will be triggered by useEffect watching pagination.page
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setPagination({ page: 1, rowsPerPage: newRowsPerPage });
    // Fetch will be triggered by useEffect watching pagination.rowsPerPage
  };

  // Initialize tempFilters when sidebar opens
  useEffect(() => {
    if (showFilters) {
      setTempFilters(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFilters]);

  // Filter and sort candidates on frontend (on paginated results from server)
  const filteredCandidates = filterCandidates(candidates);
  const sortedCandidates = sortCandidates(filteredCandidates);
  
  // Candidates are already paginated from server, just filter and sort them
  const paginatedCandidates = sortedCandidates;

  const validRoles = [
    "SDET",
    "QA",
    "DevOps",
    "Frontend",
    "Backend",
    "Full-stack",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "manager") {
    return null;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7] text-slate-900">
      <GlassBackground />
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

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="mb-4">
                <h1 className="text-xl font-bold text-slate-900 mb-1.5">
                  All Candidates
                </h1>
                <p className="text-xs text-slate-600">
                  View and manage all candidates in your database
                </p>
              </div>

              {/* Action Buttons - Below Title, Right Aligned */}
              <div className="flex items-center justify-end gap-4">
                <Button
                  onClick={openAddForm}
                  className="cursor-pointer gap-2 rounded-lg bg-linear-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
                >
                  <Plus className="h-4 w-4" />
                  Add Candidate
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer gap-2 rounded-lg border-slate-200 bg-white/70 backdrop-blur-xl hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all duration-200 shadow-sm"
                  onClick={() => {
                    resetParseResumeModal();
                    setParseResumeModalOpen(true);
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Parse Resume
                </Button>
              </div>
            </div>

            <div className="bg-white/75 border border-white/60 rounded-2xl shadow-[0_18px_60px_rgba(15,23,42,0.25)] backdrop-blur-xl overflow-hidden relative min-h-[400px]">
              {initialLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loading message="Loading candidates..." />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      <thead>
                        {/* Search and Filter Row - Top Right */}
                        <tr className="border-b border-white/70 bg-white/60 backdrop-blur">
                          <th colSpan={6} className="p-4">
                            <div className="flex items-center justify-end gap-3">
                              <div className="relative w-64 group">
                                <div className="absolute inset-0 bg-linear-to-r from-indigo-500/10 to-purple-500/10 rounded-lg blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                                <Search className="pointer-events-none absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-200 z-10" />
                                <Input
                                  type="text"
                                  placeholder="Search candidates..."
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                  }
                                  className="relative w-full h-10 text-sm rounded-lg border-2 border-slate-200 bg-white/95 backdrop-blur-sm text-slate-900 placeholder:text-slate-400 placeholder:font-normal pl-10 pr-4 shadow-sm transition-all duration-200 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-indigo-300 focus:bg-white focus:shadow-md hover:border-slate-300"
                                />
                                {searchQuery && (
                                  <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 transition-colors"
                                  >
                                    <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                                  </button>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => setShowFilters(!showFilters)}
                                size="sm"
                                className={`cursor-pointer rounded-lg px-4 py-2 h-10 backdrop-blur-xl shadow-sm transition-all duration-200 text-sm font-medium border-2
                                  ${
                                    hasActiveFilters()
                                      ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/50 hover:from-indigo-700 hover:to-purple-700 hover:shadow-indigo-500/60 scale-105"
                                      : "bg-white/95 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-400 hover:shadow-md"
                                  }`}
                              >
                                <Filter
                                  className={`h-4 w-4 mr-2 transition-colors ${
                                    hasActiveFilters()
                                      ? "text-white"
                                      : "text-slate-600"
                                  }`}
                                />
                                <span>Filters</span>
                                {hasActiveFilters() && (
                                  <span className="ml-2 px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm text-white text-xs font-bold border border-white/40 shadow-sm">
                                    {
                                      [
                                        filters.name,
                                        filters.email,
                                        filters.experience_min ||
                                          filters.experience_max,
                                        filters.date_from || filters.date_to,
                                        searchQuery,
                                      ].filter((v) => v && v !== "").length
                                    }
                                  </span>
                                )}
                              </Button>
                            </div>
                          </th>
                        </tr>
                        {/* Column Headers */}
                        <tr className="border-b border-white/70 bg-white/60 backdrop-blur">
                          <th
                            className="text-left p-2 text-xs font-semibold text-slate-800 cursor-pointer hover:bg-white/80 transition-colors select-none w-[18%]"
                            onClick={() => handleSort("name")}
                          >
                            <div className="flex items-center gap-1.5">
                              Name
                              <SortIcon columnKey="name" />
                            </div>
                          </th>
                          <th className="text-left p-2 text-xs font-semibold text-slate-800 cursor-pointer hover:bg-white/80 transition-colors select-none w-[15%]">
                            <div className="flex items-center gap-1.5">Role</div>
                          </th>
                          <th
                            className="text-left p-2 text-xs font-semibold text-slate-800 cursor-pointer hover:bg-white/80 transition-colors select-none w-[18%]"
                            onClick={() => handleSort("email")}
                          >
                            <div className="flex items-center gap-1.5">
                              Email
                              <SortIcon columnKey="email" />
                            </div>
                          </th>
                          <th
                            className="text-left p-2 text-xs font-semibold text-slate-800 cursor-pointer hover:bg-white/80 transition-colors select-none w-[12%]"
                            onClick={() => handleSort("experience")}
                          >
                            <div className="flex items-center gap-1.5">
                              Experience
                              <SortIcon columnKey="experience" />
                            </div>
                          </th>
                          <th
                            className="text-left p-2 text-xs font-semibold text-slate-800 cursor-pointer hover:bg-white/80 transition-colors select-none w-[20%]"
                            onClick={() => handleSort("lastInterviewDate")}
                          >
                            <div className="flex items-center gap-1.5">
                              Last Interview Date
                              <SortIcon columnKey="lastInterviewDate" />
                            </div>
                          </th>
                          <th
                            className="text-left p-2 text-xs font-semibold text-slate-800 cursor-pointer hover:bg-white/80 transition-colors select-none w-[17%]"
                            onClick={() => handleSort("createdAt")}
                          >
                            <div className="flex items-center gap-1.5">
                              Created At
                              <SortIcon columnKey="createdAt" />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="relative">
                        {loadingCandidates && (
                          <tr>
                            <td colSpan={6} className="p-8">
                              <div className="flex items-center justify-center">
                                <Loading size="md" />
                              </div>
                            </td>
                          </tr>
                        )}
                        {!loadingCandidates && paginationMeta.totalCount === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-12">
                              <div className="flex flex-col items-center justify-center">
                                <div className="p-4 rounded-full bg-linear-to-br from-cyan-400/20 to-blue-500/20 mb-4">
                                  <Users className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                                  No candidates found
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          !loadingCandidates &&
                          paginatedCandidates.map((candidate) => (
                            <tr
                              key={candidate._id || candidate.id}
                              onClick={() => handleRowClick(candidate)}
                              className="border-b border-white/60 bg-white/70 backdrop-blur hover:bg-white/90 transition-colors duration-150 cursor-pointer"
                            >
                              <td className="p-2 w-[18%]">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-700">
                                      {candidate.name?.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-medium text-xs text-slate-800 truncate">
                                    {candidate.name}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2 w-[15%]">
                                <div className="flex flex-wrap gap-1">
                                  {candidate.role &&
                                  candidate.role.length > 0 ? (
                                    <div className="relative inline-block group">
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200 cursor-default"
                                      >
                                        {candidate.role[0]}
                                        {candidate.role.length > 1 && (
                                          <span className="ml-0.5 font-medium">
                                            +{candidate.role.length - 1}
                                          </span>
                                        )}
                                      </Badge>
                                      {candidate.role.length > 1 && (
                                        <div className="absolute left-0 bottom-full mb-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                                          <div className="bg-slate-900 text-white text-[10px] rounded-lg py-1.5 px-2 shadow-xl min-w-[120px] max-w-[200px]">
                                            <div className="font-semibold mb-1 pb-1 border-b border-slate-700 text-white">
                                              All Roles:
                                            </div>
                                            <div className="flex flex-col gap-1 pt-0.5">
                                              {candidate.role.map(
                                                (role, index) => (
                                                  <span
                                                    key={index}
                                                    className="text-slate-200"
                                                  >
                                                    • {role}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                            <div className="absolute -bottom-1 left-3 w-1.5 h-1.5 bg-slate-900 rotate-45"></div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">
                                      -
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 w-[18%]">
                                <span className="text-xs text-slate-600 truncate block">
                                  {candidate.email || "-"}
                                </span>
                              </td>
                              <td className="p-2 w-[12%]">
                                <span className="text-xs text-slate-600">
                                  {candidate.experience !== undefined
                                    ? `${candidate.experience} years`
                                    : "-"}
                                </span>
                              </td>
                              <td className="p-2 w-[20%]">
                                <span className="text-xs text-slate-600">
                                  {candidate.lastInterviewDate
                                    ? new Date(
                                        candidate.lastInterviewDate
                                      ).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "-"}
                                </span>
                              </td>
                              <td className="p-2 w-[17%]">
                                <span className="text-xs text-slate-600">
                                  {candidate.createdAt
                                    ? new Date(
                                        candidate.createdAt
                                      ).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "-"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  {!loadingCandidates && paginationMeta.totalCount > 0 && (
                    <div className="flex flex-row items-center justify-between gap-4 px-6 py-4 bg-white/60 border-t border-white/70 backdrop-blur">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                          <span className="text-xs font-medium text-slate-700">
                            Rows per page:
                          </span>
                          <Select
                            value={pagination.rowsPerPage.toString()}
                            onValueChange={(value) =>
                              handleRowsPerPageChange(parseInt(value))
                            }
                          >
                            <SelectTrigger className="w-20 h-8 text-sm bg-white/80">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                          Showing{" "}
                          <span className="text-slate-900 font-semibold">
                            {paginationMeta.totalCount > 0 
                              ? ((paginationMeta.currentPage - 1) * paginationMeta.limit) + 1 
                              : 0}
                          </span>{" "}
                          to{" "}
                          <span className="text-slate-900 font-semibold">
                            {Math.min(
                              paginationMeta.currentPage * paginationMeta.limit,
                              paginationMeta.totalCount
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="text-slate-900 font-semibold">
                            {paginationMeta.totalCount}
                          </span>{" "}
                          candidates
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={!paginationMeta.hasPrevPage}
                          className="h-8 bg-white/80"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                          {(() => {
                            const totalPages = paginationMeta.totalPages || 1;
                            const pages = [];
                            const maxVisible = 5;

                            if (totalPages <= maxVisible) {
                              for (let i = 1; i <= totalPages; i++) {
                                pages.push(i);
                              }
                            } else {
                              if (pagination.page <= 3) {
                                for (let i = 1; i <= 4; i++) pages.push(i);
                                pages.push("...");
                                pages.push(totalPages);
                              } else if (pagination.page >= totalPages - 2) {
                                pages.push(1);
                                pages.push("...");
                                for (
                                  let i = totalPages - 3;
                                  i <= totalPages;
                                  i++
                                )
                                  pages.push(i);
                              } else {
                                pages.push(1);
                                pages.push("...");
                                for (
                                  let i = pagination.page - 1;
                                  i <= pagination.page + 1;
                                  i++
                                )
                                  pages.push(i);
                                pages.push("...");
                                pages.push(totalPages);
                              }
                            }

                            return pages.map((page, index) =>
                              page === "..." ? (
                                <span
                                  key={`ellipsis-${index}`}
                                  className="px-2 text-slate-400"
                                >
                                  ...
                                </span>
                              ) : (
                                <Button
                                  key={page}
                                  variant={
                                    pagination.page === page
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => handlePageChange(page)}
                                  className={`h-8 min-w-8 bg-white/80 ${
                                    pagination.page === page
                                      ? "bg-indigo-600 text-white"
                                      : ""
                                  }`}
                                >
                                  {page}
                                </Button>
                              )
                            );
                          })()}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={!paginationMeta.hasNextPage}
                          className="h-8 bg-white/80"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Filter Sidebar */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent
          side="right"
          className="w-full sm:w-[400px] overflow-y-auto bg-white/80 backdrop-blur-2xl p-0 border-l border-white/60"
        >
          <SheetTitle className="sr-only">Filter Candidates</SheetTitle>
          <div className="border-b border-white/60 pb-4 px-6 pt-6">
            <h2 className="flex items-center gap-3 text-lg font-bold text-slate-900">
              <div className="p-2 rounded-lg bg-indigo-50">
                <Filter className="h-4 w-4 text-indigo-600" />
              </div>
              Filter Candidates
            </h2>
          </div>

          <div className="flex-1 py-6 px-6 space-y-6 overflow-y-auto">
            {/* Name Filter */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Name
              </Label>
              <Input
                type="text"
                placeholder="Filter by name..."
                value={tempFilters.name}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, name: e.target.value })
                }
                className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur rounded-xl shadow-sm"
              />
            </div>

            {/* Email Filter */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Email
              </Label>
              <Input
                type="text"
                placeholder="Filter by email..."
                value={tempFilters.email}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, email: e.target.value })
                }
                className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur rounded-xl shadow-sm"
              />
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
                  value={tempFilters.experience_min}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      experience_min: e.target.value,
                    })
                  }
                  className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur"
                  min="0"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={tempFilters.experience_max}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      experience_max: e.target.value,
                    })
                  }
                  className="bg-white/70 border-white/70 text-slate-900 placeholder:text-slate-500 backdrop-blur"
                  min="0"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Created From
              </Label>
              <Input
                type="date"
                value={tempFilters.date_from}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, date_from: e.target.value })
                }
                className="bg-white/70 border-white/70 text-slate-900 backdrop-blur"
              />
            </div>

            {/* Date To */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Created To
              </Label>
              <Input
                type="date"
                value={tempFilters.date_to}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, date_to: e.target.value })
                }
                className="bg-white/70 border-white/70 text-slate-900 backdrop-blur"
              />
            </div>
          </div>

          <div className="border-t border-white/60 pt-4 px-6 pb-6 gap-2 flex">
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
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Candidate Dialog - Same as before */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-xl text-slate-900">
              <div className="p-2 rounded-lg bg-linear-to-br from-cyan-400/20 to-blue-500/20">
                <UserPlus className="h-5 w-5 text-cyan-600" />
              </div>
              Add New Candidate
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-2">
              Fill in the details to create a new candidate profile
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert
              variant="destructive"
              className="mt-4 border-red-200 bg-red-50"
            >
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-900 font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-900 font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_no" className="text-slate-900 font-medium">
                Phone Number
              </Label>
              <Input
                id="phone_no"
                name="phone_no"
                type="tel"
                value={formData.phone_no}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="experience"
                className="text-slate-900 font-medium"
              >
                Experience (Years)
              </Label>
              <Input
                id="experience"
                name="experience"
                type="number"
                min="0"
                value={formData.experience}
                onChange={handleChange}
                placeholder="Enter years of experience"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-900 font-medium">
                Roles
              </Label>
              <Textarea
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="Enter roles separated by commas (e.g., Frontend, Backend, Full-stack)"
                rows={3}
                className="w-full px-3 py-2 bg-white/80 border border-white/70 text-slate-900 rounded-md focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/70 focus:shadow-lg focus:shadow-cyan-400/20 transition-all duration-200 backdrop-blur"
              />
              <p className="text-xs text-slate-500">
                Separate multiple roles with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills" className="text-slate-900 font-medium">
                Skills
              </Label>
              <Input
                id="skills"
                name="skills"
                type="text"
                value={formData.skills}
                onChange={handleChange}
                placeholder="Enter skills separated by commas (e.g., React, Node.js, Python)"
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
              <p className="text-xs text-slate-500">
                Separate multiple skills with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-slate-900 font-medium">
                Bio
              </Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Enter a short bio about the candidate"
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-900 font-medium">
                Resume Upload
              </Label>
              
              {/* Hidden file input */}
              <input
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                disabled={!resumeFile && !!formData.resume_url}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      setError("File size must be less than 5MB");
                      return;
                    }
                    setResumeFile(file);
                    // Clear resume_url when a new file is selected (will upload new one)
                    setFormData((prev) => ({ ...prev, resume_url: "" }));
                    setError("");
                  }
                }}
                className="hidden"
              />

              {/* Custom Upload UI */}
              {!resumeFile && !formData.resume_url ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!(!resumeFile && !!formData.resume_url)) {
                        document.getElementById("resume")?.click();
                      }
                    }}
                    disabled={!resumeFile && !!formData.resume_url}
                    className="w-full h-12 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume (PDF, DOC, DOCX)
                  </Button>
                  <p className="text-xs text-slate-500">
                    Maximum file size: 5MB. Supported formats: PDF, DOC, DOCX
                  </p>
                </div>
              ) : resumeFile ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <FileText className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {resumeFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(resumeFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResumeFile(null);
                        // Reset file input
                        const fileInput = document.getElementById("resume");
                        if (fileInput) {
                          fileInput.value = "";
                        }
                      }}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Maximum file size: 5MB. Supported formats: PDF, DOC, DOCX
                  </p>
                </div>
              ) : formData.resume_url ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 mb-1">
                        Resume already uploaded from parsing
                      </p>
                      <a
                        href={formData.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:text-green-700 hover:underline break-all"
                      >
                        {formData.resume_url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, resume_url: "" }));
                      }}
                      className="p-1 hover:bg-green-200 rounded transition-colors"
                      aria-label="Remove resume URL"
                    >
                      <X className="h-4 w-4 text-green-700" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Maximum file size: 5MB. Supported formats: PDF, DOC, DOCX
                  </p>
                </div>
              ) : null}
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
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
                {isSubmitting ? "Creating..." : "Create Candidate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Parse Resume Dialog */}
      <Dialog
        open={parseResumeModalOpen}
        onOpenChange={(open) => {
          setParseResumeModalOpen(open);
          if (!open) {
            resetParseResumeModal();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl text-slate-900">
              <div className="p-2 rounded-lg bg-linear-to-br from-cyan-400/20 to-blue-500/20">
                <FileText className="h-5 w-5 text-cyan-600" />
              </div>
              Parse Resume
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-2">
              Upload a resume file to automatically extract candidate
              information
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {error && (
              <Alert
                variant="destructive"
                className="mt-4 border-red-200 bg-red-50"
              >
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-4 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-6 space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
                  dragActive
                    ? "border-cyan-500 bg-cyan-50/50 scale-[1.02]"
                    : "border-slate-300 bg-slate-50/50 hover:border-cyan-400 hover:bg-cyan-50/30"
                }`}
              >
                <input
                  type="file"
                  id="parse-resume-file-input"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {isParsingResume ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="relative">
                      <Loader2 className="h-16 w-16 text-cyan-600 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <p className="mt-6 text-lg font-medium text-slate-700 animate-pulse">
                      Parsing resume...
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Extracting information from your document
                    </p>
                  </div>
                ) : parsedResumeData ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="p-4 rounded-full bg-green-100 mb-4 animate-bounce">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">
                      Resume Parsed Successfully!
                    </p>
                    <div className="mt-6 w-full space-y-3">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm font-medium text-slate-600 mb-2">
                          Extracted Information:
                        </p>
                        <div className="space-y-2 text-sm text-slate-700">
                          <p>
                            <span className="font-semibold">Name:</span>{" "}
                            {parsedResumeData.name || (
                              <span className="text-red-500 italic">
                                Missing
                              </span>
                            )}
                          </p>
                          <p>
                            <span className="font-semibold">Email:</span>{" "}
                            {parsedResumeData.email || (
                              <span className="text-red-500 italic">
                                Missing
                              </span>
                            )}
                          </p>
                          <p>
                            <span className="font-semibold">Phone:</span>{" "}
                            {parsedResumeData.phone_no || (
                              <span className="text-slate-400 italic">
                                Not provided
                              </span>
                            )}
                          </p>
                          <div>
                            <span className="font-semibold">Skills:</span>{" "}
                            {parsedResumeData.skills?.length > 0 ? (
                              <div className="mt-1 max-h-32 overflow-y-auto">
                                <p className="text-sm text-slate-700 wrap-break-word">
                                  {parsedResumeData.skills.join(", ")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">
                                Not provided
                              </span>
                            )}
                          </div>
                          <p>
                            <span className="font-semibold">Experience:</span>{" "}
                            {parsedResumeData.experience || 0} years
                          </p>
                          {parsedResumeData.bio && (
                            <p>
                              <span className="font-semibold">Bio:</span>{" "}
                              {parsedResumeData.bio}
                            </p>
                          )}
                          {parsedResumeUrl && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-sm font-semibold text-slate-700 mb-1">
                                Resume URL:
                              </p>
                              <a
                                href={parsedResumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-cyan-600 hover:text-cyan-700 hover:underline break-all"
                              >
                                {parsedResumeUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      {(!parsedResumeData.name || !parsedResumeData.email) && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertDescription>
                            <strong>Required fields missing:</strong>{" "}
                            {!parsedResumeData.name && "Name "}
                            {!parsedResumeData.email && "Email "}- Cannot save
                            candidate without these fields.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ) : parseResumeFile ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="p-4 rounded-full bg-cyan-100 mb-4">
                      <FileText className="h-12 w-12 text-cyan-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      {parseResumeFile.name}
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                      {(parseResumeFile.size / 1024).toFixed(2)} KB
                    </p>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setParseResumeFile(null)}
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleParseResume(false)}
                        className="bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                      >
                        Parse Resume
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-4 rounded-full bg-linear-to-br from-cyan-400/20 to-blue-500/20 mb-6">
                      <Upload className="h-12 w-12 text-cyan-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      Drag and drop your resume here
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                      or click to browse from your device
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        document
                          .getElementById("parse-resume-file-input")
                          ?.click();
                      }}
                      className="border-slate-200 hover:bg-cyan-50 hover:border-cyan-300"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select File
                    </Button>
                    <p className="mt-4 text-xs text-slate-500">
                      Supported formats: PDF, DOC, DOCX (Max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200 mt-6 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setParseResumeModalOpen(false);
                resetParseResumeModal();
              }}
              className="border-slate-200 hover:bg-slate-50"
            >
              {parsedResumeData ? "Close" : "Cancel"}
            </Button>
            {parsedResumeData && (
              <>
                {parsedResumeData.name && parsedResumeData.email ? (
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsParsingResume(true);
                        await handleParseResume(true);
                        setSuccess("Candidate saved successfully!");
                        setTimeout(() => {
                          setParseResumeModalOpen(false);
                          resetParseResumeModal();
                        }, 2000);
                      } catch (err) {
                        setError(err.message || "Failed to save candidate");
                      } finally {
                        setIsParsingResume(false);
                      }
                    }}
                    disabled={isParsingResume}
                    className="bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    {isParsingResume ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save to Database"
                    )}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => {
                    // Auto-populate the add candidate form
                    setFormData((prev) => ({
                      ...prev,
                      name: parsedResumeData.name || prev.name,
                      email: parsedResumeData.email || prev.email,
                      phone_no: parsedResumeData.phone_no || prev.phone_no,
                      skills:
                        parsedResumeData.skills?.join(", ") || prev.skills,
                      experience:
                        parsedResumeData.experience?.toString() ||
                        prev.experience,
                      bio: parsedResumeData.bio || prev.bio,
                      resume_url: parsedResumeUrl || prev.resume_url, // Preserve resume URL from parsing
                    }));
                    // Don't set resumeFile - we already have resume_url from Cloudinary
                    // User can upload a different file if needed, which will override resume_url
                    setParseResumeModalOpen(false);
                    setFormOpen(true);
                    // Reset the modal after form opens
                    setTimeout(() => {
                      resetParseResumeModal();
                    }, 100);
                  }}
                  className="bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                >
                  Use This Data
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
