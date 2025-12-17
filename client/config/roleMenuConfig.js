import {
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  Home,
  Users,
  Key,
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
      id: "candidates",
      label: "Candidates List",
      icon: Users,
      path: "/dashboard/recruiter/candidate",
      description: "Browse all candidates",
    },
    {
      id: "tasks",
      label: "My Tasks",
      icon: ClipboardList,
      path: "/dashboard/recruiter/tasks",
      description: "View and manage interview assignments",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: Calendar,
      path: "/dashboard/recruiter/calendar",
      description: "View interviews on calendar",
    },
    {
      id: "calcom-credentials",
      label: "Cal.com Setup",
      icon: Key,
      path: "/dashboard/recruiter/calcom-credentials",
      description: "Configure Cal.com API credentials",
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
      id: "candidates",
      label: "Candidates List",
      icon: Users,
      path: "/dashboard/manager/candidate",
      description: "Browse all candidates",
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      path: "/dashboard/manager/reports",
      description: "Generate reports",
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
      id: "candidates",
      label: "Candidates List",
      icon: Users,
      path: "/dashboard/admin/candidate",
      description: "Browse all candidates",
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      path: "/dashboard/admin/reports",
      description: "Generate reports",
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
