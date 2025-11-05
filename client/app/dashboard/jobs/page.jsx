"use client";

import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Users,
  Menu,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JobsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  // Form state
  const [jobForm, setJobForm] = useState({
    title: "",
    company: "",
    location: "",
    type: "Full-time",
    salary: "",
    description: "",
    requirements: "",
    status: "Active",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Determine if user is recruiter or candidate
  const isRecruiter = user.role === "recruiter";

  // Mock job postings data - in real app, this would come from an API
  const jobPostings = [
    {
      id: 1,
      title: "Senior Software Engineer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      type: "Full-time",
      salary: "$120,000 - $150,000",
      description: "We are looking for an experienced software engineer to join our team.",
      requirements: "5+ years experience, React, Node.js, TypeScript",
      status: "Active",
      postedDate: "2024-01-10",
      applications: 24,
      views: 156,
    },
    {
      id: 2,
      title: "Frontend Developer",
      company: "Design Studio",
      location: "Remote",
      type: "Full-time",
      salary: "$90,000 - $110,000",
      description: "Join our team to build beautiful and responsive web applications.",
      requirements: "3+ years experience, React, Vue.js, CSS",
      status: "Active",
      postedDate: "2024-01-08",
      applications: 18,
      views: 132,
    },
    {
      id: 3,
      title: "Backend Developer",
      company: "Cloud Solutions",
      location: "New York, NY",
      type: "Full-time",
      salary: "$100,000 - $130,000",
      description: "Looking for a backend developer with experience in Node.js and databases.",
      requirements: "4+ years experience, Node.js, PostgreSQL, AWS",
      status: "Closed",
      postedDate: "2023-12-15",
      applications: 32,
      views: 245,
    },
    {
      id: 4,
      title: "Full Stack Developer",
      company: "Startup Inc",
      location: "Austin, TX",
      type: "Full-time",
      salary: "$95,000 - $125,000",
      description: "Exciting opportunity to work on cutting-edge technologies.",
      requirements: "3+ years experience, Full-stack, JavaScript",
      status: "Active",
      postedDate: "2024-01-12",
      applications: 15,
      views: 98,
    },
  ];

  const filteredJobs = jobPostings.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateJob = () => {
    // In real app, this would save to backend
    console.log("Creating job:", jobForm);
    setShowCreateForm(false);
    setJobForm({
      title: "",
      company: "",
      location: "",
      type: "Full-time",
      salary: "",
      description: "",
      requirements: "",
      status: "Active",
    });
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setJobForm(job);
    setShowCreateForm(true);
  };

  const handleUpdateJob = () => {
    // In real app, this would update in backend
    console.log("Updating job:", editingJob.id, jobForm);
    setShowCreateForm(false);
    setEditingJob(null);
    setJobForm({
      title: "",
      company: "",
      location: "",
      type: "Full-time",
      salary: "",
      description: "",
      requirements: "",
      status: "Active",
    });
  };

  const handleDeleteJob = (jobId) => {
    // In real app, this would delete from backend
    console.log("Deleting job:", jobId);
  };

  // Candidate view (existing functionality)
  if (!isRecruiter) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <aside className="hidden lg:block">
          <DashboardSidebar />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <DashboardSidebar />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="lg:hidden bg-card border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              <h1 className="text-xl font-bold">AI Recruitment</h1>
              <div className="w-10" />
            </div>
          </header>

          <header className="hidden lg:block bg-card border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">AI Recruitment</h1>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            <Card className="bg-blue-500 border-0 text-white mb-8">
              <CardHeader>
                <CardTitle className="text-4xl mb-2">Recent Job Postings</CardTitle>
                <CardDescription className="text-xl opacity-90 text-white">
                  Browse available positions and find your next opportunity
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search jobs, companies, or locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs
                .filter((job) => job.status === "Active")
                .map((job) => (
                  <Card key={job.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                          <CardDescription className="text-base font-semibold text-foreground">
                            {job.company}
                          </CardDescription>
                        </div>
                        <Briefcase className="h-6 w-6 text-blue-500 shrink-0 ml-2" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{job.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>{job.salary}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          Posted {new Date(job.postedDate).toLocaleDateString()}
                        </span>
                        <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                          Apply Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Recruiter view
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <DashboardSidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <DashboardSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-card border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <h1 className="text-xl font-bold">AI Recruitment</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">AI Recruitment</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <Card className="bg-green-500 border-0 text-white flex-1">
              <CardHeader>
                <CardTitle className="text-4xl mb-2 flex items-center gap-3">
                  <Briefcase className="h-10 w-10" />
                  Job Postings
                </CardTitle>
                <CardDescription className="text-xl opacity-90 text-white">
                  Create and manage your job listings
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="ml-4">
              <Button
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {
                  setEditingJob(null);
                  setJobForm({
                    title: "",
                    company: "",
                    location: "",
                    type: "Full-time",
                    salary: "",
                    description: "",
                    requirements: "",
                    status: "Active",
                  });
                  setShowCreateForm(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Post Job
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{jobPostings.length}</div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {jobPostings.filter((j) => j.status === "Active").length}
                </div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {jobPostings.reduce((sum, j) => sum + j.applications, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total Applications</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {jobPostings.reduce((sum, j) => sum + j.views, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </CardContent>
            </Card>
          </div>

          {/* Create/Edit Job Form */}
          {showCreateForm && (
            <Card className="mb-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle>
                  {editingJob ? "Edit Job Posting" : "Create New Job Posting"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={jobForm.location}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, location: e.target.value })
                      }
                      placeholder="e.g., San Francisco, CA or Remote"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Job Type *</Label>
                    <select
                      id="type"
                      value={jobForm.type}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, type: e.target.value })
                      }
                      className="w-full h-9 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary Range</Label>
                    <Input
                      id="salary"
                      value={jobForm.salary}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, salary: e.target.value })
                      }
                      placeholder="e.g., $100,000 - $130,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={jobForm.status}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, status: e.target.value })
                      }
                      className="w-full h-9 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>Active</option>
                      <option>Closed</option>
                      <option>Draft</option>
                    </select>
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
                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <textarea
                    id="requirements"
                    value={jobForm.requirements}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, requirements: e.target.value })
                    }
                    className="w-full min-h-[80px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="List required skills, experience, and qualifications..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingJob(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white"
                    onClick={editingJob ? handleUpdateJob : handleCreateJob}
                  >
                    {editingJob ? "Update Job" : "Post Job"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Jobs List */}
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            job.status === "Active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <CardDescription className="text-base font-semibold text-foreground">
                        {job.company}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{job.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>{job.salary}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(job.postedDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {job.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {job.applications} applications
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {job.views} views
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditJob(job)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 border-2">
              <CardContent className="pt-6 text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-green-900 dark:text-green-100">
                  No job postings found matching your search.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
