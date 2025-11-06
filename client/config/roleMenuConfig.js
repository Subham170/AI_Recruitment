import {
  BarChart3,
  Briefcase,
  Calendar,
  ClipboardList,
  Database,
  FileText,
  Home,
  MessageSquare,
  PieChart,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

export const roleMenuConfig = {
  recruiter: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/dashboard",
      description: "Overview of your recruitment",
    },
    {
      id: "top-applicants",
      label: "Top Applicants",
      icon: TrendingUp,
      path: "/dashboard/top-applicants",
      description: "View top candidates",
    },
    {
      id: "job-postings",
      label: "Job Postings",
      icon: Briefcase,
      path: "/dashboard/jobs",
      description: "Manage job listings",
    },
    {
      id: "applications",
      label: "Applications",
      icon: ClipboardList,
      path: "/dashboard/applications",
      description: "Review all applications",
    },
    {
      id: "candidates",
      label: "Candidates",
      icon: Users,
      path: "/dashboard/candidates",
      description: "Browse candidate pool",
    },
    {
      id: "interviews",
      label: "Interview Schedule",
      icon: Calendar,
      path: "/dashboard/interviews",
      description: "Manage interviews",
    },
    {
      id: "analytics",
      label: "Analytics & Reports",
      icon: BarChart3,
      path: "/dashboard/analytics",
      description: "View recruitment metrics",
    },
    {
      id: "messages",
      label: "Messages",
      icon: MessageSquare,
      path: "/dashboard/messages",
      description: "Communicate with candidates",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/dashboard/settings",
      description: "Account settings",
    },
  ],
  manager: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/dashboard",
      description: "Overview of recruitment operations",
    },
    {
      id: "recruiters",
      label: "Recruiters",
      icon: Users,
      path: "/dashboard/recruiters",
      description: "Manage recruiter team",
    },
    {
      id: "job-postings",
      label: "Job Postings",
      icon: Briefcase,
      path: "/dashboard/jobs",
      description: "Manage all job listings",
    },
    {
      id: "applications",
      label: "Applications",
      icon: ClipboardList,
      path: "/dashboard/applications",
      description: "Review all applications",
    },
    {
      id: "candidates",
      label: "Candidates",
      icon: Users,
      path: "/dashboard/candidates",
      description: "Browse candidate pool",
    },
    {
      id: "interviews",
      label: "Interview Schedule",
      icon: Calendar,
      path: "/dashboard/interviews",
      description: "Manage interviews",
    },
    {
      id: "analytics",
      label: "Analytics & Reports",
      icon: BarChart3,
      path: "/dashboard/analytics",
      description: "View recruitment metrics",
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      path: "/dashboard/reports",
      description: "Generate reports",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/dashboard/settings",
      description: "Team settings",
    },
  ],
  admin: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/dashboard",
      description: "System overview",
    },
    {
      id: "users",
      label: "User Management",
      icon: Users,
      path: "/dashboard/users",
      description: "Manage all users",
    },
    {
      id: "all-applications",
      label: "All Applications",
      icon: ClipboardList,
      path: "/dashboard/applications",
      description: "View all applications",
    },
    {
      id: "job-postings",
      label: "Job Postings",
      icon: Briefcase,
      path: "/dashboard/jobs",
      description: "Manage all job postings",
    },
    {
      id: "analytics",
      label: "Platform Analytics",
      icon: PieChart,
      path: "/dashboard/analytics",
      description: "System-wide analytics",
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      path: "/dashboard/reports",
      description: "Generate reports",
    },
    {
      id: "system-config",
      label: "System Configuration",
      icon: Settings,
      path: "/dashboard/config",
      description: "System settings",
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      path: "/dashboard/security",
      description: "Security settings",
    },
    {
      id: "database",
      label: "Database",
      icon: Database,
      path: "/dashboard/database",
      description: "Database management",
    },
  ],
};

// Helper function to get menu items for a role
export const getMenuItemsForRole = (role) => {
  return roleMenuConfig[role] || roleMenuConfig.recruiter;
};

// Helper function to get menu item by id
export const getMenuItemById = (role, itemId) => {
  const menuItems = getMenuItemsForRole(role);
  return menuItems.find((item) => item.id === itemId);
};
