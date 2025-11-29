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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  Link as LinkIcon,
  Save,
  Edit,
  X,
  Plus,
} from "lucide-react";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    skills: [],
    education: [],
    experience: [],
    resume: null,
    linkedin: "",
    portfolio: "",
  });

  const [newSkill, setNewSkill] = useState("");
  const [newEducation, setNewEducation] = useState({
    degree: "",
    school: "",
    year: "",
  });
  const [newExperience, setNewExperience] = useState({
    title: "",
    company: "",
    duration: "",
    description: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      // Load user data
      setProfile({
        name: user.name || "",
        email: user.email || "",
        phone: "",
        location: "",
        bio: "",
        skills: ["JavaScript", "React", "Node.js"],
        education: [
          {
            degree: "Bachelor of Science in Computer Science",
            school: "University of Technology",
            year: "2020",
          },
        ],
        experience: [
          {
            title: "Software Engineer",
            company: "Tech Corp",
            duration: "2021 - Present",
            description: "Developed and maintained web applications using React and Node.js",
          },
        ],
        resume: null,
        linkedin: "",
        portfolio: "",
      });
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

  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()],
      });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skill),
    });
  };

  const handleAddEducation = () => {
    if (newEducation.degree && newEducation.school && newEducation.year) {
      setProfile({
        ...profile,
        education: [...profile.education, { ...newEducation }],
      });
      setNewEducation({ degree: "", school: "", year: "" });
    }
  };

  const handleRemoveEducation = (index) => {
    setProfile({
      ...profile,
      education: profile.education.filter((_, i) => i !== index),
    });
  };

  const handleAddExperience = () => {
    if (
      newExperience.title &&
      newExperience.company &&
      newExperience.duration
    ) {
      setProfile({
        ...profile,
        experience: [...profile.experience, { ...newExperience }],
      });
      setNewExperience({ title: "", company: "", duration: "", description: "" });
    }
  };

  const handleRemoveExperience = (index) => {
    setProfile({
      ...profile,
      experience: profile.experience.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    // In real app, this would save to backend
    console.log("Saving profile:", profile);
    setIsEditing(false);
    // Show success message
  };

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfile({ ...profile, resume: file.name });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
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
          <div className="flex items-center justify-between mb-8">
            <Card className="bg-blue-500 border-0 text-white flex-1">
              <CardHeader>
                <CardTitle className="text-4xl mb-2">My Profile</CardTitle>
                <CardDescription className="text-xl opacity-90 text-white">
                  Manage your profile information and preferences
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="ml-4">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={handleSave}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your basic information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile({ ...profile, name: e.target.value })
                      }
                      className="pl-10"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                      className="pl-10"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      className="pl-10"
                      placeholder="+1 (555) 000-0000"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) =>
                        setProfile({ ...profile, location: e.target.value })
                      }
                      className="pl-10"
                      placeholder="City, State"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Professional Summary</Label>
                <textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Tell us about yourself, your experience, and what you're looking for..."
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>
                Add your technical and professional skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full"
                  >
                    <span>{skill}</span>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-blue-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
                    placeholder="Add a skill"
                    className="flex-1"
                  />
                  <Button onClick={handleAddSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.education.map((edu, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg flex justify-between items-start"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{edu.degree}</h4>
                    <p className="text-sm text-muted-foreground">
                      {edu.school} • {edu.year}
                    </p>
                  </div>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEducation(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Degree</Label>
                      <Input
                        value={newEducation.degree}
                        onChange={(e) =>
                          setNewEducation({
                            ...newEducation,
                            degree: e.target.value,
                          })
                        }
                        placeholder="e.g., Bachelor of Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>School/University</Label>
                      <Input
                        value={newEducation.school}
                        onChange={(e) =>
                          setNewEducation({
                            ...newEducation,
                            school: e.target.value,
                          })
                        }
                        placeholder="School name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input
                        value={newEducation.year}
                        onChange={(e) =>
                          setNewEducation({
                            ...newEducation,
                            year: e.target.value,
                          })
                        }
                        placeholder="e.g., 2020"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddEducation} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Education
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Experience */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.experience.map((exp, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg flex justify-between items-start"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{exp.title}</h4>
                    <p className="text-sm font-medium text-muted-foreground">
                      {exp.company} • {exp.duration}
                    </p>
                    {exp.description && (
                      <p className="text-sm mt-2 text-muted-foreground">
                        {exp.description}
                      </p>
                    )}
                  </div>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveExperience(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input
                        value={newExperience.title}
                        onChange={(e) =>
                          setNewExperience({
                            ...newExperience,
                            title: e.target.value,
                          })
                        }
                        placeholder="e.g., Software Engineer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        value={newExperience.company}
                        onChange={(e) =>
                          setNewExperience({
                            ...newExperience,
                            company: e.target.value,
                          })
                        }
                        placeholder="Company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Input
                        value={newExperience.duration}
                        onChange={(e) =>
                          setNewExperience({
                            ...newExperience,
                            duration: e.target.value,
                          })
                        }
                        placeholder="e.g., 2021 - Present"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <textarea
                      value={newExperience.description}
                      onChange={(e) =>
                        setNewExperience({
                          ...newExperience,
                          description: e.target.value,
                        })
                      }
                      className="w-full min-h-[80px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Describe your role and achievements..."
                    />
                  </div>
                  <Button onClick={handleAddExperience} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Experience
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resume & Links */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resume & Links</CardTitle>
              <CardDescription>
                Upload your resume and add professional links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Resume</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    {profile.resume ? (
                      <div className="flex items-center gap-2 p-3 border rounded-lg">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span className="text-sm">{profile.resume}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No resume uploaded
                      </p>
                    )}
                  </div>
                  {isEditing && (
                    <div>
                      <input
                        type="file"
                        id="resume-upload"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        className="hidden"
                      />
                      <Label htmlFor="resume-upload">
                        <Button variant="outline" asChild>
                          <span>
                            <FileText className="mr-2 h-4 w-4" />
                            Upload Resume
                          </span>
                        </Button>
                      </Label>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="linkedin"
                      type="url"
                      value={profile.linkedin}
                      onChange={(e) =>
                        setProfile({ ...profile, linkedin: e.target.value })
                      }
                      className="pl-10"
                      placeholder="https://linkedin.com/in/yourprofile"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfolio Website</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="portfolio"
                      type="url"
                      value={profile.portfolio}
                      onChange={(e) =>
                        setProfile({ ...profile, portfolio: e.target.value })
                      }
                      className="pl-10"
                      placeholder="https://yourportfolio.com"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

