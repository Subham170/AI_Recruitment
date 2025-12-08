"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu } from "lucide-react";

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {boolean} [props.sidebarOpen]
 * @param {function(boolean): void} [props.onSidebarToggle]
 * @param {function(): void} [props.onMenuClick]
 */
export default function Navbar({
  title,
  subtitle,
  sidebarOpen = false,
  onSidebarToggle,
  onMenuClick,
}) {
  const { user, logout } = useAuth();
  const handleToggle = onSidebarToggle || onMenuClick;

  if (!handleToggle) {
    return null;
  }

  return (
    <div className="lg:hidden px-4 pt-4">
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="icon"
          className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
          onClick={() => handleToggle(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {title && (
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
