"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loading from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { userAPI } from "@/lib/api";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Crown,
  Edit,
  Eye,
  EyeOff,
  Mail,
  Search,
  Shield,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UserManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
  });
  const [sortConfig, setSortConfig] = useState({
    key: null, // 'name', 'email', 'role'
    direction: "asc", // 'asc' or 'desc'
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "recruiter", // Default to recruiter for managers
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "manager") {
      router.push(`/dashboard/${user.role}`);
      return;
    }

    // Fetch users when manager is available
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]); // Removed router from dependencies to prevent re-renders

  useEffect(() => {
    if (user && user.role === "manager") {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1);
        fetchUsers();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (user && user.role === "manager") {
      fetchUsers();
    }
  }, [currentPage]);

  useEffect(() => {
    if (user && user.role === "manager") {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageSize]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await userAPI.getUsers({
        filterRole: "recruiter", // Managers can only manage recruiters
        search: searchQuery,
        page: currentPage,
        pageSize: pagination.pageSize,
      });
      setUsers(response.users || []);
      setPagination((prev) => ({
        totalCount: response.totalCount || 0,
        totalPages: response.totalPages || 1,
        currentPage: response.currentPage || currentPage,
        pageSize: response.pageSize || prev.pageSize,
      }));
    } catch (err) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Sort function
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Sort users based on sortConfig
  const sortUsers = (usersList) => {
    if (!sortConfig.key) return usersList;

    const sorted = [...usersList].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "name":
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
          break;
        case "email":
          aValue = (a.email || "").toLowerCase();
          bValue = (b.email || "").toLowerCase();
          break;
        case "role":
          aValue = (a.role || "").toLowerCase();
          bValue = (b.role || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  // Sort icon component
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 text-slate-400" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-4 w-4 text-indigo-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-indigo-600" />
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
    }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateForm = (isEdit = false) => {
    if (!formData.name || !formData.email || !formData.role) {
      setError("Please fill in all required fields");
      return false;
    }
    if (!isEdit && !formData.password) {
      setError("Password is required for new users");
      return false;
    }
    if (formData.password && formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm(!!editingUser)) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingUser) {
        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        const userId = editingUser.id || editingUser._id;
        if (!userId) {
          setError("User ID is missing. Please try again.");
          setIsSubmitting(false);
          return;
        }
        const response = await userAPI.updateUser(userId, updateData);
        setSuccess(
          `User updated successfully! ${response.user.name} has been updated.`
        );
      } else {
        const { confirmPassword, ...userData } = formData;
        const response = await userAPI.createUser(userData);
        setSuccess(
          `User created successfully! ${response.user.name} (${response.user.role}) has been added.`
        );
      }

      resetForm();
      setFormOpen(false);
      fetchUsers();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.message || "Failed to save user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      name: userToEdit.name || "",
      email: userToEdit.email || "",
      password: "",
      confirmPassword: "",
      role: "recruiter", // Managers can only edit recruiters
    });
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const handleDeleteClick = (userItem) => {
    setUserToDelete(userItem);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await userAPI.deleteUser(userToDelete.id || userToDelete._id);
      setSuccess(`User ${userToDelete.name} has been deleted successfully.`);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.message || "Failed to delete user. Please try again.");
      setDeleteDialogOpen(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "recruiter", // Default to recruiter for managers
    });
    setEditingUser(null);
    setError("");
    setSuccess("");
  };

  const openAddForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "secondary";
      case "manager":
        return "secondary";
      case "recruiter":
        return "secondary";
      case "candidate":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return Crown;
      case "manager":
        return UserCog;
      case "recruiter":
        return Briefcase;
      default:
        return Shield;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "manager") {
    return null;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
      <GlassBackground />
      <aside className="hidden lg:block relative z-10">
        <Sidebar />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 bg-white/10 text-slate-900 border-r border-white/30 backdrop-blur-2xl"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Navbar
          title="User Management"
          subtitle="Manage all users in the system"
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Page title */}
            <div className="mb-2">
              <h1 className="text-3xl font-bold text-slate-900 mb-1 drop-shadow-[0_1px_1px_rgba(15,23,42,0.18)]">
                User Management
              </h1>
              <p className="text-slate-600">Manage recruiters in the system</p>
            </div>

            {/* Search + Add button */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-slate-200 focus:border-cyan-500 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                />
              </div>
              <Button
                onClick={openAddForm}
                className="gap-2 w-full sm:w-auto bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Add People
              </Button>
            </div>

            {!loadingUsers && searchQuery && (
              <div className="mb-4 text-sm text-slate-600 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs text-cyan-600 hover:text-cyan-700"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}

            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loading message="Loading users..." />
              </div>
            ) : users.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-12 flex flex-col items-center justify-center">
                <div className="p-4 rounded-full bg-linear-to-br from-cyan-400/20 to-blue-500/20 mb-4">
                  <Users className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                  No users found
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/80">
                        <th
                          className="text-left p-4 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-2">
                            Name
                            <SortIcon columnKey="name" />
                          </div>
                        </th>
                        <th
                          className="text-left p-4 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                          onClick={() => handleSort("email")}
                        >
                          <div className="flex items-center gap-2">
                            Email
                            <SortIcon columnKey="email" />
                          </div>
                        </th>
                        <th
                          className="text-left p-4 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                          onClick={() => handleSort("role")}
                        >
                          <div className="flex items-center gap-2">
                            Role
                            <SortIcon columnKey="role" />
                          </div>
                        </th>
                        <th className="text-right p-4 font-semibold text-slate-800">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortUsers(users).map((userItem) => {
                        const RoleIcon = getRoleIcon(userItem.role);
                        return (
                          <tr
                            key={userItem.id || userItem._id}
                            className="border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors duration-150"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                  <span className="text-sm font-bold text-slate-700">
                                    {userItem.name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium text-slate-800">
                                  {userItem.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-slate-600">
                                <Mail className="h-4 w-4 text-cyan-600" />
                                <span>{userItem.email}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={getRoleBadgeVariant(userItem.role)}
                                className="capitalize gap-1.5 px-3 py-1 border border-slate-200 bg-white text-slate-700"
                              >
                                <RoleIcon className="h-3.5 w-3.5" />
                                <span>{userItem.role}</span>
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(userItem)}
                                  className="group gap-2 border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 transition-all duration-200"
                                >
                                  <div className="p-0.5 rounded bg-cyan-100 group-hover:bg-cyan-200 transition-colors">
                                    <Edit className="h-3.5 w-3.5 text-cyan-600" />
                                  </div>
                                  <span className="font-medium text-slate-800">
                                    Edit
                                  </span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(userItem)}
                                  className="group gap-2 border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                                >
                                  <div className="p-0.5 rounded bg-red-100 group-hover:bg-red-200 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                  </div>
                                  <span className="font-medium">Delete</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!loadingUsers && (
                  <div className="flex flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/80 border-t border-slate-200">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-700">
                          Rows per page:
                        </span>
                        <Select
                          value={pagination.pageSize.toString()}
                          onValueChange={(value) => {
                            const newPageSize = parseInt(value);
                            setPagination((prev) => ({
                              ...prev,
                              pageSize: newPageSize,
                              currentPage: 1,
                            }));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-20 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                        </Select>
                      </div>
                      <div className="h-4 w-px bg-slate-300"></div>
                      <span className="text-sm text-slate-600 font-medium whitespace-nowrap">
                        Showing{" "}
                        <span className="text-slate-900 font-semibold">
                          {(currentPage - 1) * pagination.pageSize + 1}
                        </span>{" "}
                        to{" "}
                        <span className="text-slate-900 font-semibold">
                          {Math.min(
                            currentPage * pagination.pageSize,
                            pagination.totalCount
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="text-slate-900 font-semibold">
                          {pagination.totalCount}
                        </span>{" "}
                        entries
                      </span>
                    </div>

                    {pagination.totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = Math.max(1, currentPage - 1);
                            setCurrentPage(newPage);
                            setPagination((prev) => ({ ...prev, currentPage: newPage }));
                          }}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: pagination.totalPages },
                            (_, i) => i + 1
                          )
                            .filter((page) => {
                              return (
                                page === 1 ||
                                page === pagination.totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1)
                              );
                            })
                            .map((page, index, array) => {
                              const showEllipsisBefore =
                                index > 0 && array[index - 1] !== page - 1;
                              return (
                                <div key={page} className="flex items-center gap-1">
                                  {showEllipsisBefore && (
                                    <span className="px-2 text-slate-400">
                                      ...
                                    </span>
                                  )}
                                  <Button
                                    variant={
                                      currentPage === page ? "default" : "outline"
                                    }
                                    size="sm"
                                    onClick={() => {
                                      setCurrentPage(page);
                                      setPagination((prev) => ({ ...prev, currentPage: page }));
                                    }}
                                    className={`h-8 min-w-8 ${
                                      currentPage === page
                                        ? "bg-indigo-600 text-white"
                                        : ""
                                    }`}
                                  >
                                    {page}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = Math.min(pagination.totalPages, currentPage + 1);
                            setCurrentPage(newPage);
                            setPagination((prev) => ({ ...prev, currentPage: newPage }));
                          }}
                          disabled={currentPage === pagination.totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-2xl border border-white/70 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-white/60">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <div className="p-2 rounded-lg bg-cyan-50">
                <UserPlus className="h-6 w-6 text-cyan-600" />
              </div>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              {editingUser
                ? "Update user information below"
                : "Fill in the details to create a new user account"}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert
              variant="destructive"
              className="mt-4 border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20"
            >
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-900 font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
                className="bg-white/80 border border-white/70 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/70 focus:shadow-lg focus:shadow-cyan-400/20 transition-all duration-200 backdrop-blur"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-900 font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
                className="bg-white/80 border border-white/70 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/70 focus:shadow-lg focus:shadow-cyan-400/20 transition-all duration-200 backdrop-blur"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-900 font-medium">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                required
              >
                <SelectTrigger
                  id="role"
                  className="bg-white/80 border border-white/70 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/70 transition-all duration-200 backdrop-blur"
                >
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Managers can only create and manage recruiters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-900 font-medium">
                Password{" "}
                {!editingUser && <span className="text-red-500">*</span>}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current password"
                      : "Enter password (min. 6 characters)"
                  }
                  minLength={formData.password ? 6 : undefined}
                  className="pr-10 bg-white/80 border border-white/70 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/70 focus:shadow-lg focus:shadow-cyan-400/20 transition-all duration-200 backdrop-blur"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {editingUser && (
                <p className="text-xs text-slate-500">
                  Leave blank to keep the current password
                </p>
              )}
            </div>

            {formData.password && (
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-slate-900 font-medium"
                >
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className="pr-10 bg-white/80 border border-white/70 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/70 focus:shadow-lg focus:shadow-cyan-400/20 transition-all duration-200 backdrop-blur"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-600 focus:outline-none transition-colors"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-white/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
              >
                {isSubmitting
                  ? editingUser
                    ? "Updating..."
                    : "Creating..."
                  : editingUser
                  ? "Update User"
                  : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              Delete User
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {userToDelete?.name}
              </span>
              ? This action cannot be undone and will permanently remove the
              user from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Trash2 className="h-4 w-4" />
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
