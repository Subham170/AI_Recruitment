"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getMenuItemsForRole } from "@/config/roleMenuConfig";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * @param {Object} props
 * @param {boolean} [props.sidebarOpen]
 * @param {function(boolean): void} [props.onSidebarToggle]
 */
export default function Sidebar({
  sidebarOpen: externalSidebarOpen,
  onSidebarToggle: externalOnSidebarToggle,
} = {}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const menuItems = user ? getMenuItemsForRole(user.role) : [];
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const sidebarOpen =
    externalSidebarOpen !== undefined
      ? externalSidebarOpen
      : internalSidebarOpen;
  const setSidebarOpen = externalOnSidebarToggle || setInternalSidebarOpen;

  if (!user) return null;

  const SidebarContent = () => (
    <div className="flex h-screen w-56 flex-col border-r border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-b from-slate-50/95 to-white dark:from-slate-900/95 dark:to-slate-950 backdrop-blur-sm">
      {/* Logo/Brand */}
      <div className="flex h-14 items-center border-b border-slate-200/50 dark:border-slate-800/50 px-4 bg-gradient-to-r from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20">
        <div className="flex items-center gap-2">
          <div className="rounded-full overflow-hidden">
            <Image
              src="/Logo.png"
              alt="AI Recruitment Logo"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
            AI Recruitment
          </h2>
        </div>
      </div>

      {/* User Info */}
      <div className="border-b border-slate-200/50 dark:border-slate-800/50 p-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-sm"></div>
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
              <span className="text-sm font-semibold text-white">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
              {user.name}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 capitalize truncate">
              {user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-cyan-600 dark:hover:text-cyan-400"
                )}
                title={item.description}
                onClick={() => setSidebarOpen(false)}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-white rounded-r-full"></div>
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive ? "text-white" : "group-hover:scale-110"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Logout Button */}
      <div className="border-t border-slate-200/50 dark:border-slate-800/50 p-3">
        <Button
          variant="outline"
          className="w-full justify-start border-slate-300 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-all"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="text-sm font-medium">Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-52 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}

// Export hook for managing sidebar state
export function useSidebarState() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return { sidebarOpen, setSidebarOpen };
}
