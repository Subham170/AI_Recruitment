"use client";

import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-white">
        <Loading size="lg" />
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
            <div className="w-10" /> {/* Spacer for centering */}
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
          {/* Header Section */}
          <div
            className={`${content.color} rounded-lg p-6 text-white shadow-lg`}
          >
            <h1 className="text-4xl font-bold mb-2">{content.title}</h1>
            <p className="text-xl opacity-95">{content.description}</p>
          </div>

          {/* Features Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Available Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {content.features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-card border rounded-lg p-4 hover:shadow-md transition hover:border-primary/50"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 w-8 h-8 ${content.color} rounded-full flex items-center justify-center text-white font-bold`}
                    >
                      {index + 1}
                    </div>
                    <p className="font-medium text-foreground">{feature}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role-specific additional content */}
          {user.role === "candidate" && (
            <div
              className={`rounded-lg p-6 ${content.cardColor} ${content.borderColor} border-2`}
            >
              <h3 className={`text-xl font-bold mb-2 ${content.textColor}`}>
                Quick Actions
              </h3>
              <p className={content.textColor}>
                Browse jobs, update your resume, or check your application
                status.
              </p>
            </div>
          )}

          {user.role === "recruiter" && (
            <div
              className={`rounded-lg p-6 ${content.cardColor} ${content.borderColor} border-2`}
            >
              <h3 className={`text-xl font-bold mb-2 ${content.textColor}`}>
                Quick Actions
              </h3>
              <p className={content.textColor}>
                Post a new job, review applications, or manage your active
                listings.
              </p>
            </div>
          )}

          {user.role === "admin" && (
            <div
              className={`rounded-lg p-6 ${content.cardColor} ${content.borderColor} border-2`}
            >
              <h3 className={`text-xl font-bold mb-2 ${content.textColor}`}>
                System Overview
              </h3>
              <p className={content.textColor}>
                Monitor platform activity, manage users, and access system
                settings.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
