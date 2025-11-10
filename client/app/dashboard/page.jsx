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
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && user.role) {
      // Redirect to role-specific dashboard
      router.push(`/dashboard/${user.role}`);
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

  const getRoleContent = () => {
    switch (user.role) {
      case "candidate":
        return {
          title: "Candidate Dashboard",
          description: "Welcome to your candidate dashboard",
          features: [
            "View available job positions",
            "Track your applications",
            "Update your profile",
            "View interview schedules",
            "Access career resources",
          ],
          color: "bg-blue-500",
          cardColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          textColor: "text-blue-900 dark:text-blue-100",
        };
      case "recruiter":
        return {
          title: "Recruiter Dashboard",
          description: "Manage your recruitment activities",
          features: [
            "Post new job positions",
            "Review candidate applications",
            "Schedule interviews",
            "Manage job postings",
            "View analytics and reports",
          ],
          color: "bg-green-500",
          cardColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800",
          textColor: "text-green-900 dark:text-green-100",
        };
      case "admin":
        return {
          title: "Admin Dashboard",
          description: "System administration panel",
          features: [
            "Manage all users",
            "System configuration",
            "View all applications",
            "Generate reports",
            "Platform analytics",
            "User management",
          ],
          color: "bg-purple-500",
          cardColor: "bg-purple-50 dark:bg-purple-950/20",
          borderColor: "border-purple-200 dark:border-purple-800",
          textColor: "text-purple-900 dark:text-purple-100",
        };
      default:
        return {
          title: "Dashboard",
          description: "Welcome to your dashboard",
          features: [],
          color: "bg-gray-500",
          cardColor: "bg-gray-50 dark:bg-gray-950/20",
          borderColor: "border-gray-200 dark:border-gray-800",
          textColor: "text-gray-900 dark:text-gray-100",
        };
    }
  };

  const content = getRoleContent();

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
          <Card className={`${content.color} border-0 text-white mb-8`}>
            <CardHeader>
              <CardTitle className="text-4xl mb-2">{content.title}</CardTitle>
              <CardDescription className="text-xl opacity-90 text-white">
                {content.description}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {content.features.map((feature, index) => (
                  <Card key={index} className="hover:shadow-md transition">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-8 h-8 ${content.color} rounded-full flex items-center justify-center text-white font-bold`}
                        >
                          {index + 1}
                        </div>
                        <p className="font-medium">{feature}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role-specific additional content */}
          {user.role === "candidate" && (
            <Card
              className={`mt-8 ${content.cardColor} ${content.borderColor} border-2`}
            >
              <CardHeader>
                <CardTitle className={content.textColor}>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={content.textColor}>
                  Browse jobs, update your resume, or check your application
                  status.
                </p>
              </CardContent>
            </Card>
          )}

          {user.role === "recruiter" && (
            <Card
              className={`mt-8 ${content.cardColor} ${content.borderColor} border-2`}
            >
              <CardHeader>
                <CardTitle className={content.textColor}>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={content.textColor}>
                  Post a new job, review applications, or manage your active
                  listings.
                </p>
              </CardContent>
            </Card>
          )}

          {user.role === "admin" && (
            <Card
              className={`mt-8 ${content.cardColor} ${content.borderColor} border-2`}
            >
              <CardHeader>
                <CardTitle className={content.textColor}>
                  System Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={content.textColor}>
                  Monitor platform activity, manage users, and access system
                  settings.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
