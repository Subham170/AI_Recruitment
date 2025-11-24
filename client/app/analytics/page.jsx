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
  BarChart3,
  TrendingUp,
  Users,
  Briefcase,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("30days");

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

  // Mock analytics data
  const analytics = {
    overview: {
      totalApplications: 156,
      applicationsChange: +12.5,
      activeJobs: 8,
      jobsChange: +2,
      interviews: 42,
      interviewsChange: +8.3,
      hireRate: 68.5,
      hireRateChange: +5.2,
    },
    applicationsByStatus: {
      pending: 45,
      interview: 28,
      accepted: 35,
      rejected: 48,
    },
    topJobs: [
      { title: "Senior Software Engineer", applications: 42, views: 320 },
      { title: "Frontend Developer", applications: 38, views: 285 },
      { title: "Backend Developer", applications: 32, views: 245 },
      { title: "Full Stack Developer", applications: 28, views: 198 },
      { title: "DevOps Engineer", applications: 16, views: 156 },
    ],
    applicationsByMonth: [
      { month: "Jan", applications: 45, hires: 12 },
      { month: "Feb", applications: 52, hires: 15 },
      { month: "Mar", applications: 38, hires: 10 },
      { month: "Apr", applications: 61, hires: 18 },
      { month: "May", applications: 48, hires: 14 },
      { month: "Jun", applications: 55, hires: 16 },
    ],
    sources: [
      { source: "Job Board", count: 62, percentage: 39.7 },
      { source: "Company Website", count: 45, percentage: 28.8 },
      { source: "LinkedIn", count: 28, percentage: 17.9 },
      { source: "Referrals", count: 21, percentage: 13.5 },
    ],
    timeToHire: {
      average: "18 days",
      shortest: "5 days",
      longest: "42 days",
    },
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
              <div className="flex items-center gap-2">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="text-sm border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                  <option value="1year">Last year</option>
                </select>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
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
                <BarChart3 className="h-10 w-10" />
                Analytics & Reports
              </CardTitle>
              <CardDescription className="text-xl opacity-90 text-white">
                Track recruitment metrics and performance insights
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold">{analytics.overview.totalApplications}</div>
                  <div className={`flex items-center gap-1 text-sm ${
                    analytics.overview.applicationsChange > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}>
                    {analytics.overview.applicationsChange > 0 ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                    {Math.abs(analytics.overview.applicationsChange)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Total Applications</p>
                <div className="flex items-center gap-1 mt-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">vs last period</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold">{analytics.overview.activeJobs}</div>
                  <div className={`flex items-center gap-1 text-sm ${
                    analytics.overview.jobsChange > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}>
                    {analytics.overview.jobsChange > 0 ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                    +{analytics.overview.jobsChange}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Active Job Postings</p>
                <div className="flex items-center gap-1 mt-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Currently open</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold">{analytics.overview.interviews}</div>
                  <div className={`flex items-center gap-1 text-sm ${
                    analytics.overview.interviewsChange > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}>
                    {analytics.overview.interviewsChange > 0 ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                    {Math.abs(analytics.overview.interviewsChange)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Interviews Conducted</p>
                <div className="flex items-center gap-1 mt-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">This period</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold">{analytics.overview.hireRate}%</div>
                  <div className={`flex items-center gap-1 text-sm ${
                    analytics.overview.hireRateChange > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}>
                    {analytics.overview.hireRateChange > 0 ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                    {Math.abs(analytics.overview.hireRateChange)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Hire Rate</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Success rate</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Applications by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Applications by Status</CardTitle>
                <CardDescription>Distribution of application statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-2 bg-yellow-500 rounded-full"
                          style={{
                            width: `${(analytics.applicationsByStatus.pending / analytics.overview.totalApplications) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {analytics.applicationsByStatus.pending}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Interview</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{
                            width: `${(analytics.applicationsByStatus.interview / analytics.overview.totalApplications) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {analytics.applicationsByStatus.interview}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Accepted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-2 bg-green-500 rounded-full"
                          style={{
                            width: `${(analytics.applicationsByStatus.accepted / analytics.overview.totalApplications) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {analytics.applicationsByStatus.accepted}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Rejected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-2 bg-red-500 rounded-full"
                          style={{
                            width: `${(analytics.applicationsByStatus.rejected / analytics.overview.totalApplications) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {analytics.applicationsByStatus.rejected}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Application Sources</CardTitle>
                <CardDescription>Where candidates are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.sources.map((source, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{source.source}</span>
                        <span className="text-sm text-muted-foreground">
                          {source.count} ({source.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-2 bg-green-500 rounded-full"
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Jobs and Time to Hire */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Performing Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Jobs</CardTitle>
                <CardDescription>Jobs with most applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topJobs.map((job, index) => (
                    <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{job.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{job.applications} applications</span>
                          <span>{job.views} views</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">
                          {((job.applications / job.views) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Conversion</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time to Hire */}
            <Card>
              <CardHeader>
                <CardTitle>Time to Hire</CardTitle>
                <CardDescription>Average hiring timeline metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center p-6 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {analytics.timeToHire.average}
                    </div>
                    <p className="text-sm text-muted-foreground">Average Time to Hire</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-xl font-bold text-blue-600 mb-1">
                        {analytics.timeToHire.shortest}
                      </div>
                      <p className="text-xs text-muted-foreground">Shortest</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className="text-xl font-bold text-orange-600 mb-1">
                        {analytics.timeToHire.longest}
                      </div>
                      <p className="text-xs text-muted-foreground">Longest</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Applications and hires over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.applicationsByMonth.map((month, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{month.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {month.applications} applications
                        </span>
                        <span className="text-muted-foreground">
                          {month.hires} hires
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-end pr-2">
                        <span className="text-xs text-blue-700 dark:text-blue-300">
                          {month.applications}
                        </span>
                      </div>
                      <div
                        className="h-8 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-end pr-2"
                        style={{
                          width: `${(month.hires / month.applications) * 100}%`,
                        }}
                      >
                        <span className="text-xs text-green-700 dark:text-green-300">
                          {month.hires}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

