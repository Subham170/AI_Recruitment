"use client";

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
import { useAuth } from "@/contexts/AuthContext";
import { candidateAPI } from "@/lib/api";
import {
  CheckCircle2,
  FileText,
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
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [parseResumeFile, setParseResumeFile] = useState(null);
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [parseResumeModalOpen, setParseResumeModalOpen] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedResumeData, setParsedResumeData] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_no: "",
    skills: "",
    experience: "",
    role: [],
    bio: "",
    resume_url: "",
  });

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "recruiter") {
      router.push(`/dashboard/${user.role}/candidate`);
      return;
    }

    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const fetchCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const response = await candidateAPI.getCandidates();
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

  const handleRoleChange = (value) => {
    setFormData((prev) => {
      const currentRoles = prev.role || [];
      if (currentRoles.includes(value)) {
        return { ...prev, role: currentRoles.filter((r) => r !== value) };
      } else {
        return { ...prev, role: [...currentRoles, value] };
      }
    });
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

  const handleParseResume = async () => {
    if (!parseResumeFile) {
      setError("Please select a resume file");
      return;
    }

    setIsParsingResume(true);
    setError("");
    setSuccess("");
    setParsedResumeData(null);

    try {
      // Simulate parsing with animation (2-3 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // TODO: Replace with actual API call
      // const formData = new FormData();
      // formData.append("resume", parseResumeFile);
      // const response = await candidateAPI.parseResume(formData);
      // setParsedResumeData(response);

      // Mock parsed data for now
      const mockParsedData = {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        skills: ["React", "Node.js", "Python", "JavaScript"],
        experience: 5,
        education: "Bachelor's in Computer Science",
      };

      setParsedResumeData(mockParsedData);
      setSuccess("Resume parsed successfully!");
    } catch (err) {
      setError(err.message || "Failed to parse resume. Please try again.");
    } finally {
      setIsParsingResume(false);
    }
  };

  const resetParseResumeModal = () => {
    setParseResumeFile(null);
    setParsedResumeData(null);
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
      const candidateData = {
        name: formData.name,
        email: formData.email,
        phone_no: formData.phone_no || undefined,
        skills: formData.skills
          ? formData.skills.split(",").map((s) => s.trim())
          : [],
        experience: formData.experience ? parseInt(formData.experience) : 0,
        role: formData.role || [],
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
      role: [],
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
    router.push(`/dashboard/recruiter/candidate/${candidateId}`);
  };

  const getRoleBadgeVariant = (roles) => {
    if (!roles || roles.length === 0) return "outline";
    return "secondary";
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      !searchQuery ||
      candidate.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills?.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesSearch;
  });

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

  if (!user || user.role !== "recruiter") {
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
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-slate-200 focus:border-cyan-500 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:shadow-lg focus:shadow-cyan-500/10 transition-all duration-200"
                />
              </div>

              <Button
                onClick={openAddForm}
                className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                Add Candidate
              </Button>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
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

            {!loadingCandidates && (
              <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span>
                  Showing {filteredCandidates.length} of {candidates.length}{" "}
                  candidates
                </span>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                    onClick={() => {
                      setSearchQuery("");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {loadingCandidates ? (
              <div className="flex items-center justify-center py-12">
                <Loading message="Loading candidates..." />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-12 flex flex-col items-center justify-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 mb-4">
                  <Users className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                  No candidates found
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
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
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Candidate Dialog - Same as before */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                <UserPlus className="h-6 w-6 text-cyan-600" />
              </div>
              Add New Candidate
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
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
              <Label className="text-slate-900 font-medium">Roles</Label>
              <div className="flex flex-wrap gap-2">
                {validRoles.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant={
                      formData.role?.includes(role) ? "default" : "outline"
                    }
                    onClick={() => handleRoleChange(role)}
                    className={
                      formData.role?.includes(role)
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                        : ""
                    }
                  >
                    {role}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Select one or more roles for this candidate
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
              <p className="text-xs text-slate-500">
                Maximum file size: 5MB. Supported formats: PDF, DOC, DOCX
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="resume_url"
                className="text-slate-900 font-medium"
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
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
              <p className="text-xs text-slate-500">
                If you have a resume URL, you can enter it here instead
              </p>
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
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
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
        <DialogContent className="max-w-2xl bg-white border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                <FileText className="h-6 w-6 text-cyan-600" />
              </div>
              Parse Resume
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Upload a resume file to automatically extract candidate
              information
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
                          {parsedResumeData.name}
                        </p>
                        <p>
                          <span className="font-semibold">Email:</span>{" "}
                          {parsedResumeData.email}
                        </p>
                        <p>
                          <span className="font-semibold">Phone:</span>{" "}
                          {parsedResumeData.phone}
                        </p>
                        <p>
                          <span className="font-semibold">Skills:</span>{" "}
                          {parsedResumeData.skills?.join(", ")}
                        </p>
                        <p>
                          <span className="font-semibold">Experience:</span>{" "}
                          {parsedResumeData.experience} years
                        </p>
                      </div>
                    </div>
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
                      onClick={handleParseResume}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                    >
                      Parse Resume
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="p-4 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 mb-6">
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

          <DialogFooter className="pt-4 border-t border-slate-200 mt-6">
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
              <Button
                type="button"
                onClick={() => {
                  // Auto-populate the add candidate form
                  setFormData((prev) => ({
                    ...prev,
                    name: parsedResumeData.name || prev.name,
                    email: parsedResumeData.email || prev.email,
                    phone_no: parsedResumeData.phone || prev.phone_no,
                    skills: parsedResumeData.skills?.join(", ") || prev.skills,
                    experience:
                      parsedResumeData.experience?.toString() ||
                      prev.experience,
                  }));
                  setParseResumeModalOpen(false);
                  setFormOpen(true);
                  resetParseResumeModal();
                }}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
              >
                Use This Data
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
