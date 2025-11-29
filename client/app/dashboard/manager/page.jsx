"use client";

import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Loading from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ManagerDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && user.role !== "manager") {
      router.push(`/dashboard/${user.role}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-white">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "manager") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          title="Manager Dashboard"
          subtitle="Overview of recruitment operations"
          showLogout={true}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2 text-foreground">
                Welcome, {user.name}
              </h2>
              <p className="text-foreground/80">
                Manage your recruitment team and operations
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Recruiters
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">Team members</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Job Postings
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">Active jobs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Applications
                  </CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">
                    Total received
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Interviews
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/manager/recruiters")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recruiters
                  </CardTitle>
                  <CardDescription>Manage recruiter team</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/manager/jobs")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Job Postings
                  </CardTitle>
                  <CardDescription>Manage all job listings</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/manager/applications")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Applications
                  </CardTitle>
                  <CardDescription>Review all applications</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/manager/candidates")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Candidates
                  </CardTitle>
                  <CardDescription>Browse candidate pool</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/manager/analytics")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Analytics & Reports
                  </CardTitle>
                  <CardDescription>View recruitment metrics</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/manager/reports")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Reports
                  </CardTitle>
                  <CardDescription>Generate reports</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
