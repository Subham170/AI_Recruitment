"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Menu } from "lucide-react";

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {boolean} [props.sidebarOpen]
 * @param {function(boolean): void} [props.onSidebarToggle]
 */
export default function Navbar({
  title,
  subtitle,
  sidebarOpen = false,
  onSidebarToggle,
}) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden bg-gradient-to-r from-slate-50/95 to-white dark:from-slate-900/95 dark:to-slate-950 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-3">
        <div className="flex items-center justify-between">
          {onSidebarToggle ? (
            <Sheet open={sidebarOpen} onOpenChange={onSidebarToggle}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            </Sheet>
          ) : (
            <div className="w-10" />
          )}
          {title && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              {title}
            </h1>
          )}
          {!title && <div className="flex-1" />}
          <div className="w-10" />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:flex items-center justify-between bg-gradient-to-r from-slate-50/95 to-white dark:from-slate-900/95 dark:to-slate-950 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4">
        <div>
          {title && (
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {user.name}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                {user.role}
              </p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={logout}
            className="border-slate-300 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-all"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
    </>
  );
}
