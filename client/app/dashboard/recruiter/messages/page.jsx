"use client";

import ComingSoon from "@/components/ComingSoon";
import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import Loading from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && user.role !== "recruiter") {
      router.push(`/dashboard/${user.role}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "recruiter") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/5 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-radial from-blue-500/5 via-transparent to-transparent pointer-events-none" style={{ backgroundPosition: '100% 100%' }}></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1.5">Messages</h1>
              <p className="text-sm text-slate-600">Communicate with candidates and team members</p>
            </div>
            <ComingSoon
              title="Messages"
              description="Communicate with candidates and team members. This feature is coming soon!"
              icon={MessageSquare}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

