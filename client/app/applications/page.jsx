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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, MapPin, Clock, Calendar, CheckCircle, Clock as ClockIcon, XCircle, Search, User, Mail, Phone, Download, Eye } from "lucide-react";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ApplicationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const isRecruiter = user.role === "recruiter";

  // Candidate applications data
  const candidateApplications = [
    {
      id: 1,
      jobTitle: "Senior Software Engineer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      appliedDate: "2024-01-15",
      status: "pending",
      statusLabel: "Under Review",
      lastUpdated: "2 days ago",
    },
    {
      id: 2,
      jobTitle: "Frontend Developer",
      company: "Design Studio",
      location: "Remote",
      appliedDate: "2024-01-10",
      status: "interview",
      statusLabel: "Interview Scheduled",
      lastUpdated: "1 day ago",
      interviewDate: "2024-01-25",
    },
    {
      id: 3,
      jobTitle: "Backend Developer",
      company: "Cloud Solutions",
      location: "New York, NY",
      appliedDate: "2024-01-08",
      status: "accepted",
      statusLabel: "Accepted",
      lastUpdated: "3 days ago",
    },
    {
      id: 4,
      jobTitle: "Full Stack Developer",
      company: "Startup Inc",
      location: "Austin, TX",
      appliedDate: "2024-01-05",
      status: "rejected",
      statusLabel: "Not Selected",
      lastUpdated: "1 week ago",
    },
    {
      id: 5,
      jobTitle: "DevOps Engineer",
      company: "Infrastructure Co",
      location: "Seattle, WA",
      appliedDate: "2024-01-12",
      status: "pending",
      statusLabel: "Under Review",
      lastUpdated: "4 days ago",
    },
    {
      id: 6,
      jobTitle: "UI/UX Designer",
      company: "Creative Agency",
      location: "Los Angeles, CA",
      appliedDate: "2024-01-03",
      status: "interview",
      statusLabel: "Interview Scheduled",
      lastUpdated: "2 days ago",
      interviewDate: "2024-01-20",
    },
  ];

  // Recruiter applications data (applications from candidates)
  const recruiterApplications = [
    {
      id: 1,
      candidateName: "John Smith",
      candidateEmail: "john.smith@email.com",
      candidatePhone: "+1 (555) 123-4567",
      jobTitle: "Senior Software Engineer",
      location: "San Francisco, CA",
      appliedDate: "2024-01-15",
      status: "pending",
      statusLabel: "Under Review",
      lastUpdated: "2 days ago",
      resume: "john_smith_resume.pdf",
      matchScore: 95,
      skills: ["React", "Node.js", "TypeScript", "AWS"],
      experience: "5 years",
    },
    {
      id: 2,
      candidateName: "Sarah Johnson",
      candidateEmail: "sarah.johnson@email.com",
      candidatePhone: "+1 (555) 234-5678",
      jobTitle: "Frontend Developer",
      location: "Remote",
      appliedDate: "2024-01-10",
      status: "interview",
      statusLabel: "Interview Scheduled",
      lastUpdated: "1 day ago",
      interviewDate: "2024-01-25",
      resume: "sarah_johnson_resume.pdf",
      matchScore: 92,
      skills: ["JavaScript", "React", "Vue.js", "CSS"],
      experience: "4 years",
    },
    {
      id: 3,
      candidateName: "Michael Chen",
      candidateEmail: "michael.chen@email.com",
      candidatePhone: "+1 (555) 345-6789",
      jobTitle: "Backend Developer",
      location: "New York, NY",
      appliedDate: "2024-01-08",
      status: "accepted",
      statusLabel: "Accepted",
      lastUpdated: "3 days ago",
      resume: "michael_chen_resume.pdf",
      matchScore: 88,
      skills: ["Node.js", "PostgreSQL", "AWS", "Docker"],
      experience: "4 years",
    },
    {
      id: 4,
      candidateName: "Emily Davis",
      candidateEmail: "emily.davis@email.com",
      candidatePhone: "+1 (555) 456-7890",
      jobTitle: "Full Stack Developer",
      location: "Austin, TX",
      appliedDate: "2024-01-05",
      status: "rejected",
      statusLabel: "Not Selected",
      lastUpdated: "1 week ago",
      resume: "emily_davis_resume.pdf",
      matchScore: 75,
      skills: ["JavaScript", "Python", "Django"],
      experience: "3 years",
    },
    {
      id: 5,
      candidateName: "David Lee",
      candidateEmail: "david.lee@email.com",
      candidatePhone: "+1 (555) 567-8901",
      jobTitle: "DevOps Engineer",
      location: "Seattle, WA",
      appliedDate: "2024-01-12",
      status: "pending",
      statusLabel: "Under Review",
      lastUpdated: "4 days ago",
      resume: "david_lee_resume.pdf",
      matchScore: 87,
      skills: ["Kubernetes", "Terraform", "AWS", "CI/CD"],
      experience: "4 years",
    },
    {
      id: 6,
      candidateName: "Lisa Wang",
      candidateEmail: "lisa.wang@email.com",
      candidatePhone: "+1 (555) 678-9012",
      jobTitle: "UI/UX Designer",
      location: "Los Angeles, CA",
      appliedDate: "2024-01-03",
      status: "interview",
      statusLabel: "Interview Scheduled",
      lastUpdated: "2 days ago",
      interviewDate: "2024-01-20",
      resume: "lisa_wang_resume.pdf",
      matchScore: 90,
      skills: ["Figma", "Sketch", "Prototyping", "User Research"],
      experience: "5 years",
    },
  ];

  const applications = isRecruiter ? recruiterApplications : candidateApplications;

  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "interview":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "interview":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch = isRecruiter
      ? app.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
      : app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: applications.length,
    pending: applications.filter((app) => app.status === "pending").length,
    interview: applications.filter((app) => app.status === "interview").length,
    accepted: applications.filter((app) => app.status === "accepted").length,
    rejected: applications.filter((app) => app.status === "rejected").length,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <DashboardSidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
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
            <div className="w-10" /> {/* Spacer for centering */}
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
          <Card className={isRecruiter ? "bg-green-500 border-0 text-white mb-8" : "bg-blue-500 border-0 text-white mb-8"}>
            <CardHeader>
              <CardTitle className="text-4xl mb-2">
                {isRecruiter ? "All Applications" : "My Applications"}
              </CardTitle>
              <CardDescription className="text-xl opacity-90 text-white">
                {isRecruiter
                  ? "Review and manage candidate applications"
                  : "Track the status of your job applications"}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{statusCounts.all}</div>
                <p className="text-xs text-muted-foreground">Total Applications</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
                <p className="text-xs text-muted-foreground">Under Review</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{statusCounts.interview}</div>
                <p className="text-xs text-muted-foreground">Interviews</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{statusCounts.accepted}</div>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {/* Status Filter */}
                <div className="flex gap-2 flex-wrap">
                  {["all", "pending", "interview", "accepted", "rejected"].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className="capitalize"
                    >
                      {status === "all" ? "All" : status}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications List */}
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <Card key={application.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {isRecruiter ? (
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                {application.candidateName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                            </div>
                            <div>
                              <CardTitle className="text-xl">{application.candidateName}</CardTitle>
                              <CardDescription className="text-base font-semibold text-foreground">
                                {application.jobTitle}
                              </CardDescription>
                            </div>
                          </div>
                          {application.matchScore && (
                            <div className="mt-2">
                              <span className="text-xs text-muted-foreground">Match Score: </span>
                              <span className={`text-sm font-bold ${
                                application.matchScore >= 90
                                  ? "text-green-600"
                                  : application.matchScore >= 80
                                  ? "text-blue-600"
                                  : "text-yellow-600"
                              }`}>
                                {application.matchScore}%
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <CardTitle className="text-xl mb-2">{application.jobTitle}</CardTitle>
                          <CardDescription className="text-base font-semibold text-foreground">
                            {application.company}
                          </CardDescription>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(application.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(application.status)}`}>
                        {application.statusLabel}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isRecruiter && (
                    <div className="space-y-2 text-sm pb-3 border-b">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{application.candidateEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{application.candidatePhone}</span>
                      </div>
                      {application.skills && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {application.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-md"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{application.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Applied: {new Date(application.appliedDate).toLocaleDateString()}</span>
                    </div>
                    {application.interviewDate && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Interview: {new Date(application.interviewDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Last updated: {application.lastUpdated}
                    </span>
                    <div className="flex gap-2">
                      {isRecruiter ? (
                        <>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Resume
                          </Button>
                          {application.status === "pending" && (
                            <>
                              <Button
                                className="bg-green-500 hover:bg-green-600 text-white"
                                size="sm"
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500 text-red-500 hover:bg-red-50"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {application.status === "interview" && (
                            <Button className="bg-blue-500 hover:bg-blue-600 text-white" size="sm">
                              <Calendar className="mr-2 h-4 w-4" />
                              Interview
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          {application.status === "interview" && (
                            <Button className="bg-blue-500 hover:bg-blue-600 text-white" size="sm">
                              View Interview
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredApplications.length === 0 && (
            <Card className={isRecruiter ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 border-2" : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 border-2"}>
              <CardContent className="pt-6 text-center">
                <FileText className={`h-12 w-12 mx-auto mb-4 ${isRecruiter ? "text-green-500" : "text-blue-500"}`} />
                <p className={isRecruiter ? "text-green-900 dark:text-green-100" : "text-blue-900 dark:text-blue-100"}>
                  No applications found matching your criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

