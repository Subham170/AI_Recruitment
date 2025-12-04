"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Menu } from "lucide-react";

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
      <header className="lg:hidden bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
          {onSidebarToggle ? (
            <Sheet open={sidebarOpen} onOpenChange={onSidebarToggle}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            </Sheet>
          ) : (
            <div className="w-10" />
          )}
          {title && <h1 className="text-xl font-bold">{title}</h1>}
          {!title && <div className="flex-1" />}
          <div className="w-10" />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:flex items-center justify-between bg-card border-b px-4 py-3">
        <div>
          {title && <h1 className="text-2xl font-bold">{title}</h1>}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role}
              </p>
            </div>
          )}
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>
    </>
  );
}
