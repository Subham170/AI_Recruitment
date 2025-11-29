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
  Briefcase,
  ClipboardList,
  Database,
  PieChart,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "admin") {
      router.push(`/dashboard/${user.role}`);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-white">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-white">
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          title="Admin Dashboard"
          subtitle="System administration panel"
          showLogout={true}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2 text-foreground">
                Welcome, {user.name}
              </h2>
              <p className="text-foreground/80">
                Manage the entire platform from this central dashboard
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">
                    All platform users
                  </p>
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
                    Total applications
                  </p>
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
                    System Health
                  </CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">100%</div>
                  <p className="text-xs text-muted-foreground">
                    Platform status
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/admin/users")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>Manage all platform users</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/admin/applications")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    All Applications
                  </CardTitle>
                  <CardDescription>
                    View and manage all applications
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/admin/analytics")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Platform Analytics
                  </CardTitle>
                  <CardDescription>
                    System-wide analytics and insights
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/admin/config")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Configuration
                  </CardTitle>
                  <CardDescription>Configure system settings</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/admin/security")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security
                  </CardTitle>
                  <CardDescription>
                    Security settings and monitoring
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push("/dashboard/admin/database")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database
                  </CardTitle>
                  <CardDescription>Database management</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
