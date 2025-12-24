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
    <div className="flex h-screen w-60 flex-col border-r border-white/30 bg-white/10 text-slate-900 backdrop-blur-2xl shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-center border-b border-white/20 px-4 py-2 bg-white/40 backdrop-blur-xl">
        <Image
          src="/LEAN AI POWERED orginal.png"
          alt="LEAN AI Logo"
          width={200}
          height={60}
          className="h-10 w-full max-w-[180px] object-contain object-center"
          priority
        />
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Check if this menu item should be active
            // Priority: exact match > specific path match > top-applicants special case
            let isActive = false;

            // Exact match
            if (pathname === item.path) {
              isActive = true;
            }
            // Check if pathname starts with this item's path followed by "/"
            // But only if no other menu item has a longer matching path
            else if (pathname.startsWith(item.path + "/")) {
              // Check if any other menu item has a longer path that also matches
              const hasLongerMatch = menuItems.some(
                (otherItem) =>
                  otherItem.path !== item.path &&
                  otherItem.path.startsWith(item.path + "/") &&
                  pathname.startsWith(otherItem.path)
              );
              // Only activate if no longer match exists
              isActive = !hasLongerMatch;
            }
            // Special case: handle /top-applicants/123 when menu path is /dashboard/recruiter/top-applicants
            else if (
              item.path.includes("top-applicants") &&
              pathname.startsWith("/top-applicants")
            ) {
              isActive = true;
            }

            return (
              <Link
                key={item.id}
                href={item.path}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-linear-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-700 hover:bg-white/70 hover:text-slate-900 hover:shadow-md"
                )}
                title={item.description}
                onClick={() => setSidebarOpen(false)}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.7)]"></div>
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:scale-110 group-hover:text-indigo-600"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Info */}
      <div className="border-t border-white/20 p-3 bg-white/40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-sky-400/30 blur-md"></div>
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-sky-500 shadow-md shadow-indigo-500/40">
              <span className="text-sm font-semibold text-white">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-900">
              {user.name}
            </p>
            <p className="text-xs text-slate-500 capitalize truncate">
              {user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="border-t border-white/20 p-3 bg-white/40 backdrop-blur-xl">
        <Button
          variant="outline"
          className="w-full justify-start border-slate-200 text-slate-800 hover:bg-red-50 hover:border-red-400 hover:text-red-500 transition-all duration-200"
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
        <SheetContent
          side="left"
          className="w-60 p-0 bg-white/10 text-slate-900 border-r border-white/30 backdrop-blur-2xl"
        >
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
