"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getMenuItemsForRole } from "@/config/roleMenuConfig";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
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
    <div className="flex h-screen w-52 flex-col border-r bg-card">
      {/* Logo/Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <h2 className="text-lg font-bold">AI Recruitment</h2>
      </div>

      {/* User Info */}
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xs font-semibold text-primary">
              {user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize truncate">
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
                  "flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
                title={item.description}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Logout Button */}
      <div className="border-t p-3">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={logout}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          <span className="text-xs">Logout</span>
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
