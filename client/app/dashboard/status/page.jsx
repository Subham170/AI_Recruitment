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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  FileText,
  MapPin,
  Briefcase,
  User,
  Mail,
  Phone,
  Search,
  Circle,
  ArrowRight,
} from "lucide-react";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ApplicationStatusPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);

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

  // Mock applications with detailed status timeline
  const applications = [
    {
      id: 1,
      jobTitle: "Senior Software Engineer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      appliedDate: "2024-01-15",
      status: "pending",
      statusLabel: "Under Review",
      statusTimeline: [
        {
          status: "submitted",
          label: "Application Submitted",
          date: "2024-01-15",
          completed: true,
        },
        {
          status: "review",
          label: "Application Under Review",
          date: "2024-01-16",
          completed: true,
        },
        {
          status: "screening",
          label: "Initial Screening",
          date: null,
          completed: false,
          current: true,
        },
        {
          status: "interview",
          label: "Interview",
          date: null,
          completed: false,
        },
        {
          status: "decision",
          label: "Final Decision",
          date: null,
          completed: false,
        },
      ],
      recruiter: {
        name: "Sarah Johnson",
        email: "sarah.johnson@techcorp.com",
        phone: "+1 (555) 123-4567",
      },
    },
    {
      id: 2,
      jobTitle: "Frontend Developer",
      company: "Design Studio",
      location: "Remote",
      appliedDate: "2024-01-10",
      status: "interview",
      statusLabel: "Interview Scheduled",
      interviewDate: "2024-01-25",
      interviewTime: "2:00 PM",
      interviewType: "Video Call",
      statusTimeline: [
        {
          status: "submitted",
          label: "Application Submitted",
          date: "2024-01-10",
          completed: true,
        },
        {
          status: "review",
          label: "Application Under Review",
          date: "2024-01-11",
          completed: true,
        },
        {
          status: "screening",
          label: "Initial Screening",
          date: "2024-01-12",
          completed: true,
        },
        {
          status: "interview",
          label: "Interview Scheduled",
          date: "2024-01-25",
          completed: false,
          current: true,
        },
        {
          status: "decision",
          label: "Final Decision",
          date: null,
          completed: false,
        },
      ],
      recruiter: {
        name: "Mike Chen",
        email: "mike.chen@designstudio.com",
        phone: "+1 (555) 234-5678",
      },
    },
    {
      id: 3,
      jobTitle: "Backend Developer",
      company: "Cloud Solutions",
      location: "New York, NY",
      appliedDate: "2024-01-08",
      status: "accepted",
      statusLabel: "Accepted",
      statusTimeline: [
        {
          status: "submitted",
          label: "Application Submitted",
          date: "2024-01-08",
          completed: true,
        },
        {
          status: "review",
          label: "Application Under Review",
          date: "2024-01-09",
          completed: true,
        },
        {
          status: "screening",
          label: "Initial Screening",
          date: "2024-01-10",
          completed: true,
        },
        {
          status: "interview",
          label: "Interview Completed",
          date: "2024-01-15",
          completed: true,
        },
        {
          status: "decision",
          label: "Offer Accepted",
          date: "2024-01-18",
          completed: true,
        },
      ],
      recruiter: {
        name: "Emily Davis",
        email: "emily.davis@cloudsolutions.com",
        phone: "+1 (555) 345-6789",
      },
      offerDetails: {
        salary: "$120,000",
        startDate: "2024-02-01",
        benefits: "Health, Dental, 401k",
      },
    },
    {
      id: 4,
      jobTitle: "Full Stack Developer",
      company: "Startup Inc",
      location: "Austin, TX",
      appliedDate: "2024-01-05",
      status: "rejected",
      statusLabel: "Not Selected",
      statusTimeline: [
        {
          status: "submitted",
          label: "Application Submitted",
          date: "2024-01-05",
          completed: true,
        },
        {
          status: "review",
          label: "Application Under Review",
          date: "2024-01-06",
          completed: true,
        },
        {
          status: "screening",
          label: "Initial Screening",
          date: "2024-01-08",
          completed: true,
        },
        {
          status: "decision",
          label: "Application Rejected",
          date: "2024-01-12",
          completed: true,
          rejected: true,
        },
      ],
      recruiter: {
        name: "David Lee",
        email: "david.lee@startupinc.com",
        phone: "+1 (555) 456-7890",
      },
      rejectionReason: "We found a candidate with more relevant experience.",
    },
  ];

  const getStatusIcon = (status, completed, current, rejected) => {
    if (rejected) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (completed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (current) {
      return <Clock className="h-5 w-5 text-blue-500" />;
    }
    return <Circle className="h-5 w-5 text-gray-300" />;
  };

  const getStatusColor = (status, completed, current, rejected) => {
    if (rejected) {
      return "text-red-500 border-red-500";
    }
    if (completed) {
      return "text-green-500 border-green-500";
    }
    if (current) {
      return "text-blue-500 border-blue-500";
    }
    return "text-gray-300 border-gray-300";
  };

  const filteredApplications = applications.filter(
    (app) =>
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusCounts = {
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
          <Card className="bg-blue-500 border-0 text-white mb-8">
            <CardHeader>
              <CardTitle className="text-4xl mb-2">Application Status</CardTitle>
              <CardDescription className="text-xl opacity-90 text-white">
                Track the detailed status and progress of your applications
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Status Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {statusCounts.pending}
                    </div>
                    <p className="text-xs text-muted-foreground">Under Review</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {statusCounts.interview}
                    </div>
                    <p className="text-xs text-muted-foreground">Interviews</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {statusCounts.accepted}
                    </div>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {statusCounts.rejected}
                    </div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Applications with Timeline */}
          <div className="space-y-6">
            {filteredApplications.map((application) => (
              <Card
                key={application.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {application.jobTitle}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span className="font-semibold text-foreground">
                            {application.company}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{application.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Applied: {new Date(application.appliedDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {application.status === "accepted" && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {application.status === "rejected" && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {application.status === "interview" && (
                        <Calendar className="h-5 w-5 text-blue-500" />
                      )}
                      {application.status === "pending" && (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          application.status === "accepted"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : application.status === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : application.status === "interview"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {application.statusLabel}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Status Timeline */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
                      Application Progress
                    </h3>
                    <div className="relative">
                      {application.statusTimeline.map((timeline, index) => {
                        const isLast = index === application.statusTimeline.length - 1;
                        return (
                          <div key={index} className="relative flex items-start gap-4">
                            {/* Timeline Line */}
                            {!isLast && (
                              <div className="absolute left-[9px] top-8 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                            )}
                            
                            {/* Icon */}
                            <div
                              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background ${getStatusColor(
                                timeline.status,
                                timeline.completed,
                                timeline.current,
                                timeline.rejected
                              )}`}
                            >
                              {getStatusIcon(
                                timeline.status,
                                timeline.completed,
                                timeline.current,
                                timeline.rejected
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-6">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-foreground">
                                    {timeline.label}
                                  </p>
                                  {timeline.date && (
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(timeline.date).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </p>
                                  )}
                                  {timeline.current && (
                                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                      Current Step
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Additional Information */}
                  {application.interviewDate && (
                    <Card className="mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4">
                        <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                          Interview Details
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-blue-800 dark:text-blue-200">
                            <strong>Date:</strong>{" "}
                            {new Date(application.interviewDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-blue-800 dark:text-blue-200">
                            <strong>Time:</strong> {application.interviewTime}
                          </p>
                          <p className="text-blue-800 dark:text-blue-200">
                            <strong>Type:</strong> {application.interviewType}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {application.offerDetails && (
                    <Card className="mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                      <CardContent className="pt-4">
                        <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">
                          Offer Details
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-green-800 dark:text-green-200">
                            <strong>Salary:</strong> {application.offerDetails.salary}
                          </p>
                          <p className="text-green-800 dark:text-green-200">
                            <strong>Start Date:</strong>{" "}
                            {new Date(application.offerDetails.startDate).toLocaleDateString()}
                          </p>
                          <p className="text-green-800 dark:text-green-200">
                            <strong>Benefits:</strong> {application.offerDetails.benefits}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {application.rejectionReason && (
                    <Card className="mb-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                      <CardContent className="pt-4">
                        <h4 className="font-semibold mb-2 text-red-900 dark:text-red-100">
                          Feedback
                        </h4>
                        <p className="text-sm text-red-800 dark:text-red-200">
                          {application.rejectionReason}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recruiter Contact */}
                  <Card className="bg-gray-50 dark:bg-gray-900/50">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Recruiter Contact
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">{application.recruiter.name}</p>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a
                            href={`mailto:${application.recruiter.email}`}
                            className="hover:text-primary"
                          >
                            {application.recruiter.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <a
                            href={`tel:${application.recruiter.phone}`}
                            className="hover:text-primary"
                          >
                            {application.recruiter.phone}
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredApplications.length === 0 && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 border-2">
              <CardContent className="pt-6 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <p className="text-blue-900 dark:text-blue-100">
                  No applications found matching your search.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

