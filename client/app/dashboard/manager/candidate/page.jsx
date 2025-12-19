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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { candidateAPI } from "@/lib/api";
import {
  FileText,
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
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState("");

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

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch candidates when debounced search changes
  useEffect(() => {
    if (user && !initialLoading) {
      fetchCandidates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, user, initialLoading]);

  const fetchCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const response = await candidateAPI.getCandidates(debouncedSearchQuery);
      setCandidates(response.candidates || []);
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

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Please upload a PDF or Word document");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      setResumeFile(file);
      setResumeFileName(file.name);
      setFormData((prev) => ({
        ...prev,
        resume_url: file.name,
      }));
    }
  };

  const removeResume = () => {
    setResumeFile(null);
    setResumeFileName("");
    setFormData((prev) => ({
      ...prev,
      resume_url: "",
    }));
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
        resume_url: formData.resume_url || undefined,
      };

      const response = await candidateAPI.createCandidate(candidateData);
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
    setResumeFileName("");
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

  // Candidates are now filtered on the server side via API
  // Role filter is still client-side as it's a separate filter
  const filteredCandidates = candidates;

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
          className="w-60 p-0 bg-white/10 text-slate-900 border-r border-white/30 backdrop-blur-2xl"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
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
            <div className="mb-2">
              <h1 className="text-3xl font-bold text-slate-900 mb-1">
                Candidates List
              </h1>
              <p className="text-slate-600">
                View and manage all candidates in your database
              </p>
            </div>

            {/* Search + Add button */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border border-slate-200 focus:border-cyan-500 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:shadow-lg focus:shadow-cyan-500/10 transition-all duration-200"
                />
              </div>
              <Button
                onClick={openAddForm}
                className="gap-2 w-full sm:w-auto bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                Add Candidate
              </Button>
            </div>

            {!loadingCandidates && !initialLoading && (
              <div className="mb-4 text-sm text-slate-600 flex items-center gap-2">
                <span>
                  Showing {filteredCandidates.length} of {candidates.length}{" "}
                  candidates
                </span>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-xs text-cyan-600 hover:text-cyan-700"
                    onClick={() => {
                      setSearchQuery("");
                    }}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden relative min-h-[400px]">
              {initialLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loading message="Loading candidates..." />
                </div>
              ) : (
                <>
                  {loadingCandidates && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                      <Loading size="md" />
                    </div>
                  )}
                  {filteredCandidates.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center">
                      <div className="p-4 rounded-full bg-linear-to-br from-cyan-400/20 to-blue-500/20 mb-4">
                        <Users className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                        No candidates found
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100/80">
                            <th className="text-left p-4 font-semibold text-slate-800">
                              Name
                            </th>
                            <th className="text-left p-4 font-semibold text-slate-800">
                              Email
                            </th>
                            <th className="text-left p-4 font-semibold text-slate-800">
                              Status
                            </th>
                            <th className="text-left p-4 font-semibold text-slate-800">
                              Experience
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCandidates.map((candidate) => (
                            <tr
                              key={candidate._id || candidate.id}
                              onClick={() => handleRowClick(candidate)}
                              className="border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                    <span className="text-sm font-bold text-slate-700">
                                      {candidate.name?.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-medium text-slate-800">
                                    {candidate.name}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-slate-600">
                                  {candidate.email || "-"}
                                </span>
                              </td>
                              <td className="p-4">
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
                                  className="capitalize"
                                >
                                  {candidate.status || "new"}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <span className="text-slate-600">
                                  {candidate.experience !== undefined
                                    ? `${candidate.experience} years`
                                    : "-"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Candidate Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="flex items-center gap-3 text-2xl bg-linear-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              <div className="p-2 rounded-lg bg-linear-to-br from-cyan-400/20 to-blue-500/20">
                <UserPlus className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              Add New Candidate
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Fill in the details to create a new candidate profile
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert
              variant="destructive"
              className="mt-4 border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20"
            >
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-slate-900 dark:text-slate-100 font-medium"
              >
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
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-slate-900 dark:text-slate-100 font-medium"
              >
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
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phone_no"
                className="text-slate-900 dark:text-slate-100 font-medium"
              >
                Phone Number
              </Label>
              <Input
                id="phone_no"
                name="phone_no"
                type="tel"
                value={formData.phone_no}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="experience"
                className="text-slate-900 dark:text-slate-100 font-medium"
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
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="role"
                className="text-slate-900 dark:text-slate-100 font-medium"
              >
                Roles
              </Label>
              <Textarea
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="Enter roles separated by commas (e.g., Frontend, Backend, Full-stack)"
                rows={3}
                className="w-full px-3 py-2 bg-white/80 border border-white/70 text-slate-900 rounded-md focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/70 focus:shadow-lg focus:shadow-cyan-400/20 transition-all duration-200 backdrop-blur dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Separate multiple roles with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="skills"
                className="text-slate-900 dark:text-slate-100 font-medium"
              >
                Skills
              </Label>
              <Input
                id="skills"
                name="skills"
                type="text"
                value={formData.skills}
                onChange={handleChange}
                placeholder="Enter skills separated by commas (e.g., React, Node.js, Python)"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Separate multiple skills with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="bio"
                className="text-slate-900 dark:text-slate-100 font-medium"
              >
                Bio
              </Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Enter a short bio about the candidate"
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-slate-100 font-medium">
                Resume Upload
              </Label>
              {resumeFileName ? (
                <div className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50">
                  <FileText className="h-5 w-5 text-cyan-600" />
                  <span className="flex-1 text-sm text-slate-700">
                    {resumeFileName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeResume}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    id="resume-upload"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    className="hidden"
                  />
                  <Label htmlFor="resume-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 border-slate-200 hover:bg-cyan-50 hover:border-cyan-300"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4" />
                        Upload Resume (PDF, DOC, DOCX)
                      </span>
                    </Button>
                  </Label>
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Maximum file size: 5MB. Supported formats: PDF, DOC, DOCX
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="resume_url"
                className="text-slate-900 dark:text-slate-100 font-medium"
              >
                Resume URL (Alternative)
              </Label>
              <Input
                id="resume_url"
                name="resume_url"
                type="url"
                value={formData.resume_url}
                onChange={handleChange}
                placeholder="Or enter a resume URL"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                If you have a resume URL, you can enter it here instead
              </p>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
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
    </div>
  );
}
