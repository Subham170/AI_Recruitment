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
import {
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Search,
  Eye,
  Download,
  Star,
  Calendar,
  FileText,
} from "lucide-react";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CandidatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);

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

  // Mock candidates data
  const candidates = [
    {
      id: 1,
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
      currentRole: "Senior Software Engineer",
      experience: "5 years",
      skills: ["React", "Node.js", "TypeScript", "AWS", "MongoDB"],
      education: "BS Computer Science, MIT",
      availability: "Available",
      lastActive: "2 days ago",
      resume: "john_smith_resume.pdf",
      applicationsCount: 3,
      matchScore: 95,
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 234-5678",
      location: "New York, NY",
      currentRole: "Full Stack Developer",
      experience: "4 years",
      skills: ["JavaScript", "Python", "Django", "PostgreSQL", "Docker"],
      education: "BS Software Engineering, Stanford",
      availability: "Available",
      lastActive: "1 day ago",
      resume: "sarah_johnson_resume.pdf",
      applicationsCount: 2,
      matchScore: 92,
    },
    {
      id: 3,
      name: "Michael Chen",
      email: "michael.chen@email.com",
      phone: "+1 (555) 345-6789",
      location: "Seattle, WA",
      currentRole: "Frontend Developer",
      experience: "3 years",
      skills: ["React", "Vue.js", "CSS", "Figma", "GraphQL"],
      education: "BS Computer Science, UC Berkeley",
      availability: "Interviewing",
      lastActive: "3 hours ago",
      resume: "michael_chen_resume.pdf",
      applicationsCount: 4,
      matchScore: 90,
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily.davis@email.com",
      phone: "+1 (555) 456-7890",
      location: "Austin, TX",
      currentRole: "Backend Developer",
      experience: "6 years",
      skills: ["Java", "Spring Boot", "Microservices", "Kafka", "Redis"],
      education: "MS Computer Science, UT Austin",
      availability: "Available",
      lastActive: "5 days ago",
      resume: "emily_davis_resume.pdf",
      applicationsCount: 2,
      matchScore: 88,
    },
    {
      id: 5,
      name: "David Lee",
      email: "david.lee@email.com",
      phone: "+1 (555) 567-8901",
      location: "Remote",
      currentRole: "DevOps Engineer",
      experience: "4 years",
      skills: ["Kubernetes", "Terraform", "CI/CD", "Linux", "AWS"],
      education: "BS Information Systems, Carnegie Mellon",
      availability: "Available",
      lastActive: "1 week ago",
      resume: "david_lee_resume.pdf",
      applicationsCount: 1,
      matchScore: 87,
    },
    {
      id: 6,
      name: "Lisa Wang",
      email: "lisa.wang@email.com",
      phone: "+1 (555) 678-9012",
      location: "Boston, MA",
      currentRole: "UI/UX Designer",
      experience: "5 years",
      skills: ["Figma", "Sketch", "Adobe XD", "Prototyping", "User Research"],
      education: "BFA Design, RISD",
      availability: "Available",
      lastActive: "4 days ago",
      resume: "lisa_wang_resume.pdf",
      applicationsCount: 3,
      matchScore: 85,
    },
  ];

  const filteredCandidates = candidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (score >= 80) return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
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
          <Card className="bg-green-500 border-0 text-white mb-8">
            <CardHeader>
              <CardTitle className="text-4xl mb-2 flex items-center gap-3">
                <Users className="h-10 w-10" />
                Candidates
              </CardTitle>
              <CardDescription className="text-xl opacity-90 text-white">
                Browse and explore the candidate pool
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{candidates.length}</div>
                <p className="text-xs text-muted-foreground">Total Candidates</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {candidates.filter((c) => c.matchScore >= 90).length}
                </div>
                <p className="text-xs text-muted-foreground">Top Matches (90+)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {candidates.filter((c) => c.availability === "Available").length}
                </div>
                <p className="text-xs text-muted-foreground">Available Now</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {candidates.reduce((sum, c) => sum + c.applicationsCount, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total Applications</p>
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
                  placeholder="Search by name, email, location, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCandidates.map((candidate) => (
              <Card
                key={candidate.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                          {candidate.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">
                          {candidate.name}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {candidate.currentRole}
                        </CardDescription>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                        candidate.matchScore
                      )}`}
                    >
                      {candidate.matchScore}%
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{candidate.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{candidate.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{candidate.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span>{candidate.experience} experience</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      <span className="text-xs">{candidate.education}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Status & Activity */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          candidate.availability === "Available"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {candidate.availability} • {candidate.lastActive}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-muted-foreground">
                        {candidate.applicationsCount} applications
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Profile
                    </Button>
                    <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white">
                      <Download className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        // Schedule interview functionality
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCandidates.length === 0 && (
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 border-2">
              <CardContent className="pt-6 text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-green-900 dark:text-green-100">
                  No candidates found matching your search criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

