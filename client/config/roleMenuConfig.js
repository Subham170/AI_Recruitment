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
  UserPlus,
  Users,
} from "lucide-react";

export const roleMenuConfig = {
  recruiter: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/dashboard/recruiter",
      description: "Overview of your recruitment",
    },
    {
      id: "manage-job-posting",
      label: "Manage Job Posting",
      icon: Briefcase,
      path: "/dashboard/recruiter/manage-job-posting",
      description: "Manage job listings",
    },
    {
      id: "top-applicants",
      label: "Top Applicants",
      icon: TrendingUp,
      path: "/dashboard/recruiter/top-applicants",
      description: "View top candidates",
    },
    // {
    //   id: "applications",
    //   label: "Applications",
    //   icon: ClipboardList,
    //   path: "/applications",
    //   description: "Review all applications",
    // },
    // {
    //   id: "candidates",
    //   label: "Candidates",
    //   icon: Users,
    //   path: "/candidates",
    //   description: "Browse candidate pool",
    // },
    // {
    //   id: "interviews",
    //   label: "Interview Schedule",
    //   icon: Calendar,
    //   path: "/interviews",
    //   description: "Manage interviews",
    // },
    // {
    //   id: "analytics",
    //   label: "Analytics & Reports",
    //   icon: BarChart3,
    //   path: "/analytics",
    //   description: "View recruitment metrics",
    // },
    {
      id: "messages",
      label: "Messages",
      icon: MessageSquare,
      path: "/dashboard/recruiter/messages",
      description: "Communicate with candidates",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/dashboard/recruiter/settings",
      description: "Account settings",
    },
  ],
  manager: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/dashboard/manager",
      description: "Overview of recruitment operations",
    },
    {
      id: "user-management",
      label: "User Management",
      icon: Users,
      path: "/dashboard/manager/user-management",
      description: "Manage all users",
    },
    {
      id: "manage-job-posting",
      label: "Manage Job Posting",
      icon: Briefcase,
      path: "/dashboard/manager/manage-job-posting",
      description: "Manage all job listings",
    },
    {
      id: "top-applicants",
      label: "Top Applicants",
      icon: TrendingUp,
      path: "/dashboard/manager/top-applicants",
      description: "View top candidates",
    },
    // {
    //   id: "applications",
    //   label: "Applications",
    //   icon: ClipboardList,
    //   path: "/applications",
    //   description: "Review all applications",
    // },
    // {
    //   id: "candidates",
    //   label: "Candidates",
    //   icon: Users,
    //   path: "/candidates",
    //   description: "Browse candidate pool",
    // },
    // {
    //   id: "interviews",
    //   label: "Interview Schedule",
    //   icon: Calendar,
    //   path: "/interviews",
    //   description: "Manage interviews",
    // },
    // {
    //   id: "analytics",
    //   label: "Analytics & Reports",
    //   icon: BarChart3,
    //   path: "/analytics",
    //   description: "View recruitment metrics",
    // },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      path: "/dashboard/manager/reports",
      description: "Generate reports",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/dashboard/manager/settings",
      description: "Team settings",
    },
  ],
  admin: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/dashboard/admin",
      description: "System overview",
    },
    {
      id: "user-management",
      label: "User Management",
      icon: Users,
      path: "/dashboard/admin/user-management",
      description: "Manage all users",
    },
    {
      id: "manage-job-posting",
      label: "Manage Job Posting",
      icon: Briefcase,
      path: "/dashboard/admin/manage-job-posting",
      description: "Manage all job postings",
    },
    {
      id: "top-applicants",
      label: "Top Applicants",
      icon: TrendingUp,
      path: "/dashboard/admin/top-applicants",
      description: "View top candidates",
    },
    // {
    //   id: "analytics",
    //   label: "Platform Analytics",
    //   icon: PieChart,
    //   path: "/analytics",
    //   description: "System-wide analytics",
    // },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      path: "/dashboard/admin/reports",
      description: "Generate reports",
    },
    {
      id: "system-config",
      label: "System Configuration",
      icon: Settings,
      path: "/dashboard/admin/config",
      description: "System settings",
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      path: "/dashboard/admin/security",
      description: "Security settings",
    },
    {
      id: "database",
      label: "Database",
      icon: Database,
      path: "/dashboard/admin/database",
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
