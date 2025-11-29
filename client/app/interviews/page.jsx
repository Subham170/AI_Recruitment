"use client";

import Sidebar from "@/components/Sidebar";
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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Video,
  Phone,
  Mail,
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InterviewsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);

  // Form state
  const [interviewForm, setInterviewForm] = useState({
    candidateName: "",
    jobTitle: "",
    date: "",
    time: "",
    type: "Video Call",
    location: "",
    notes: "",
    status: "Scheduled",
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

  // Mock interviews data
  const interviews = [
    {
      id: 1,
      candidateName: "Sarah Johnson",
      candidateEmail: "sarah.johnson@email.com",
      candidatePhone: "+1 (555) 234-5678",
      jobTitle: "Frontend Developer",
      date: "2024-01-25",
      time: "2:00 PM",
      type: "Video Call",
      location: "Zoom Meeting",
      notes: "Technical interview focusing on React and JavaScript",
      status: "Scheduled",
      interviewer: "John Doe",
    },
    {
      id: 2,
      candidateName: "Michael Chen",
      candidateEmail: "michael.chen@email.com",
      candidatePhone: "+1 (555) 345-6789",
      jobTitle: "Backend Developer",
      date: "2024-01-20",
      time: "10:00 AM",
      type: "In-Person",
      location: "Office Building, Room 201",
      notes: "System design and architecture discussion",
      status: "Completed",
      interviewer: "Jane Smith",
    },
    {
      id: 3,
      candidateName: "Lisa Wang",
      candidateEmail: "lisa.wang@email.com",
      candidatePhone: "+1 (555) 678-9012",
      jobTitle: "UI/UX Designer",
      date: "2024-01-22",
      time: "3:30 PM",
      type: "Video Call",
      location: "Google Meet",
      notes: "Portfolio review and design process discussion",
      status: "Scheduled",
      interviewer: "Mike Johnson",
    },
    {
      id: 4,
      candidateName: "John Smith",
      candidateEmail: "john.smith@email.com",
      candidatePhone: "+1 (555) 123-4567",
      jobTitle: "Senior Software Engineer",
      date: "2024-01-18",
      time: "11:00 AM",
      type: "Video Call",
      location: "Microsoft Teams",
      notes: "Coding challenge and technical assessment",
      status: "Cancelled",
      interviewer: "Sarah Wilson",
    },
    {
      id: 5,
      candidateName: "Emily Davis",
      candidateEmail: "emily.davis@email.com",
      candidatePhone: "+1 (555) 456-7890",
      jobTitle: "Full Stack Developer",
      date: "2024-01-26",
      time: "1:00 PM",
      type: "In-Person",
      location: "Main Office, Conference Room A",
      notes: "Final round interview with team lead",
      status: "Scheduled",
      interviewer: "David Brown",
    },
  ];

  const filteredInterviews = interviews.filter(
    (interview) =>
      interview.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateInterview = () => {
    console.log("Creating interview:", interviewForm);
    setShowCreateForm(false);
    setInterviewForm({
      candidateName: "",
      jobTitle: "",
      date: "",
      time: "",
      type: "Video Call",
      location: "",
      notes: "",
      status: "Scheduled",
    });
  };

  const handleEditInterview = (interview) => {
    setEditingInterview(interview);
    setInterviewForm(interview);
    setShowCreateForm(true);
  };

  const handleUpdateInterview = () => {
    console.log("Updating interview:", editingInterview.id, interviewForm);
    setShowCreateForm(false);
    setEditingInterview(null);
    setInterviewForm({
      candidateName: "",
      jobTitle: "",
      date: "",
      time: "",
      type: "Video Call",
      location: "",
      notes: "",
      status: "Scheduled",
    });
  };

  const handleDeleteInterview = (interviewId) => {
    console.log("Deleting interview:", interviewId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "Completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Scheduled":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "Completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "Cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  const statusCounts = {
    scheduled: interviews.filter((i) => i.status === "Scheduled").length,
    completed: interviews.filter((i) => i.status === "Completed").length,
    cancelled: interviews.filter((i) => i.status === "Cancelled").length,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-52 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
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
        <header className="hidden lg:block bg-card border-b px-4 py-3">
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
                  <Calendar className="h-10 w-10" />
                  Interview Schedule
                </CardTitle>
                <CardDescription className="text-xl opacity-90 text-white">
                  Manage and schedule candidate interviews
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="ml-4">
              <Button
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {
                  setEditingInterview(null);
                  setInterviewForm({
                    candidateName: "",
                    jobTitle: "",
                    date: "",
                    time: "",
                    type: "Video Call",
                    location: "",
                    notes: "",
                    status: "Scheduled",
                  });
                  setShowCreateForm(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Schedule Interview
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {statusCounts.scheduled}
                </div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {statusCounts.completed}
                </div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {statusCounts.cancelled}
                </div>
                <p className="text-xs text-muted-foreground">Cancelled</p>
              </CardContent>
            </Card>
          </div>

          {/* Create/Edit Interview Form */}
          {showCreateForm && (
            <Card className="mb-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle>
                  {editingInterview ? "Edit Interview" : "Schedule New Interview"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="candidateName">Candidate Name *</Label>
                    <Input
                      id="candidateName"
                      value={interviewForm.candidateName}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          candidateName: e.target.value,
                        })
                      }
                      placeholder="Candidate name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      value={interviewForm.jobTitle}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          jobTitle: e.target.value,
                        })
                      }
                      placeholder="Job title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={interviewForm.date}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={interviewForm.time}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          time: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Interview Type *</Label>
                    <select
                      id="type"
                      value={interviewForm.type}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          type: e.target.value,
                        })
                      }
                      className="w-full h-9 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>Video Call</option>
                      <option>In-Person</option>
                      <option>Phone Call</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location/Link *</Label>
                    <Input
                      id="location"
                      value={interviewForm.location}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          location: e.target.value,
                        })
                      }
                      placeholder="Meeting location or link"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={interviewForm.notes}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        notes: e.target.value,
                      })
                    }
                    className="w-full min-h-[80px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Interview notes or agenda..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingInterview(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white"
                    onClick={
                      editingInterview ? handleUpdateInterview : handleCreateInterview
                    }
                  >
                    {editingInterview ? "Update Interview" : "Schedule Interview"}
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
                  placeholder="Search interviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Interviews List */}
          <div className="space-y-4">
            {filteredInterviews.map((interview) => (
              <Card key={interview.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                            {interview.candidateName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {interview.candidateName}
                          </CardTitle>
                          <CardDescription className="text-base font-semibold text-foreground flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            {interview.jobTitle}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(interview.status)}
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          interview.status
                        )}`}
                      >
                        {interview.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Interview Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Date: </span>
                      <span>
                        {new Date(interview.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Time: </span>
                      <span>{interview.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {interview.type === "Video Call" ? (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      ) : interview.type === "In-Person" ? (
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-muted-foreground">Type: </span>
                      <span>{interview.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Location: </span>
                      <span>{interview.location}</span>
                    </div>
                  </div>

                  {/* Candidate Contact */}
                  <div className="space-y-2 text-sm pb-3 border-b">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{interview.candidateEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{interview.candidatePhone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Interviewer: {interview.interviewer}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {interview.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                      <p className="text-sm">{interview.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Video className="mr-2 h-4 w-4" />
                        Join Meeting
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditInterview(interview)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteInterview(interview.id)}
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

          {filteredInterviews.length === 0 && (
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 border-2">
              <CardContent className="pt-6 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-green-900 dark:text-green-100">
                  No interviews found matching your search.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

