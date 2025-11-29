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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { jobPostingAPI } from "@/lib/api";
import {
  Briefcase,
  DollarSign,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Menu,
  Edit,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function JobDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobPosting, setJobPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && jobId) {
      fetchJobPosting();
    }
  }, [user, authLoading, jobId, router]);

  const fetchJobPosting = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await jobPostingAPI.getJobPostingById(jobId);
      setJobPosting(response);
    } catch (err) {
      console.error("Error fetching job posting:", err);
      setError(err.message || "Failed to load job posting");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/jobs?edit=${jobId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
        <aside className="hidden lg:block">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center p-8">
          <Card className="max-w-md border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-red-900 dark:text-red-100 text-center">
                {error}
              </p>
              <Button
                className="mt-4 w-full"
                onClick={() => router.push("/jobs")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Job Postings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!jobPosting) {
    return (
      <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
        <aside className="hidden lg:block">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center p-8">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Job posting not found</p>
              <Button
                className="mt-4"
                onClick={() => router.push("/jobs")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Job Postings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isRecruiter = user.role === "recruiter";
  const isOwner =
    isRecruiter &&
    jobPosting.primary_recruiter_id &&
    jobPosting.primary_recruiter_id._id?.toString() === user.id?.toString();

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-52 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
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

        <header className="hidden lg:block bg-card border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Job Posting Details</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/jobs")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {isOwner && (
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={handleEdit}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
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
          {/* Mobile Back and Edit Buttons */}
          <div className="lg:hidden mb-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/jobs")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {isOwner && (
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                onClick={handleEdit}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Main Job Card */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-2">
                      {jobPosting.title}
                    </CardTitle>
                    <CardDescription className="text-xl font-semibold text-foreground">
                      {jobPosting.company}
                    </CardDescription>
                  </div>
                  <Briefcase className="h-8 w-8 text-blue-500 shrink-0 ml-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Job ID */}
                {jobPosting.id && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Job ID</p>
                    <p className="text-base font-medium">{jobPosting.id}</p>
                  </div>
                )}

                {/* Roles */}
                {jobPosting.role && jobPosting.role.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Roles</p>
                    <div className="flex flex-wrap gap-2">
                      {jobPosting.role.map((r, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobPosting.ctc && (
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">CTC</p>
                        <p className="text-base font-medium">{jobPosting.ctc}</p>
                      </div>
                    </div>
                  )}

                  {jobPosting.exp_req !== undefined && jobPosting.exp_req > 0 && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Experience Required
                        </p>
                        <p className="text-base font-medium">
                          {jobPosting.exp_req} years
                        </p>
                      </div>
                    </div>
                  )}

                  {jobPosting.createdAt && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Posted Date
                        </p>
                        <p className="text-base font-medium">
                          {new Date(jobPosting.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {jobPosting.updatedAt && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Last Updated
                        </p>
                        <p className="text-base font-medium">
                          {new Date(jobPosting.updatedAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Job Description
                  </p>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-base whitespace-pre-wrap">
                      {jobPosting.description}
                    </p>
                  </div>
                </div>

                {/* Skills */}
                {jobPosting.skills && jobPosting.skills.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Required Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {jobPosting.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recruiter Information */}
                {(jobPosting.primary_recruiter_id ||
                  (jobPosting.secondary_recruiter_id &&
                    Array.isArray(jobPosting.secondary_recruiter_id) &&
                    jobPosting.secondary_recruiter_id.length > 0)) && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Recruiters
                    </p>
                    <div className="space-y-2">
                      {jobPosting.primary_recruiter_id && (
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              Primary Recruiter
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {typeof jobPosting.primary_recruiter_id === "object" &&
                              jobPosting.primary_recruiter_id.name
                                ? `${jobPosting.primary_recruiter_id.name}${
                                    jobPosting.primary_recruiter_id.email
                                      ? ` (${jobPosting.primary_recruiter_id.email})`
                                      : ""
                                  }`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      )}

                      {jobPosting.secondary_recruiter_id &&
                        Array.isArray(jobPosting.secondary_recruiter_id) &&
                        jobPosting.secondary_recruiter_id.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">
                              Secondary Recruiters
                            </p>
                            <div className="space-y-1 pl-7">
                              {jobPosting.secondary_recruiter_id
                                .filter((recruiter) => recruiter !== null)
                                .map((recruiter, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">
                                      {typeof recruiter === "object" && recruiter.name
                                        ? `${recruiter.name}${
                                            recruiter.email ? ` (${recruiter.email})` : ""
                                          }`
                                        : "N/A"}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

