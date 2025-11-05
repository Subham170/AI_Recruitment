"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMenuItemsForRole } from "@/config/roleMenuConfig";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const menuItems = user ? getMenuItemsForRole(user.role) : [];

  if (!user) return null;

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-xl font-bold">AI Recruitment</h2>
      </div>

      {/* User Info */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-sm font-semibold text-primary">
              {user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize truncate">
              {user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1">
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
                title={item.description}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Logout Button */}
      <div className="border-t p-4">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
