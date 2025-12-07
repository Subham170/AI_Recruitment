"use client";

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
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Crown,
  Edit,
  Eye,
  EyeOff,
  Filter,
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
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 7,
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
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

    if (user.role !== "admin") {
      router.push(`/dashboard/${user.role}`);
      return;
    }

    // Fetch users when admin is available
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]); // Removed router from dependencies to prevent re-renders

  useEffect(() => {
    if (user && user.role === "admin") {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1);
        fetchUsers();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (user && user.role === "admin") {
      setCurrentPage(1);
      fetchUsers();
    }
  }, [roleFilter]);

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchUsers();
    }
  }, [currentPage]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await userAPI.getUsers({
        filterRole: roleFilter || null,
        search: searchQuery,
        page: currentPage,
        pageSize: 7,
      });
      setUsers(response.users || []);
      setPagination({
        totalCount: response.totalCount || 0,
        totalPages: response.totalPages || 1,
        currentPage: response.currentPage || 1,
        pageSize: response.pageSize || 7,
      });
    } catch (err) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
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
        const response = await userAPI.updateUser(editingUser.id, updateData);
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
      role: userToEdit.role || "",
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
      role: "",
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

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-1/2 h-1/2"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(6, 182, 212, 0.05), transparent 70%)",
          }}
        ></div>
        <div
          className="absolute bottom-0 left-0 w-1/2 h-1/2"
          style={{
            background:
              "radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.05), transparent 70%)",
          }}
        ></div>
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(14, 165, 233, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <aside className="hidden lg:block relative z-10">
        <Sidebar />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-52 p-0">
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
            {/* Header Section */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                User Management
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Manage all users in the system
              </p>
            </div>

            {/* Search and Filter Section */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <Select
                    value={roleFilter || "all"}
                    onValueChange={(value) =>
                      setRoleFilter(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <SelectValue placeholder="All Roles" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={openAddForm}
                  className="gap-2 w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <UserPlus className="h-4 w-4" />
                  Add People
                </Button>
              </div>
            </div>

            {!loadingUsers && (
              <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span>
                  Showing {users.length} of {pagination.totalCount} users
                </span>
                {(searchQuery || roleFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("");
                      setCurrentPage(1);
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loading message="Loading users..." />
              </div>
            ) : users.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-12 flex flex-col items-center justify-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 mb-4">
                  <Users className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                  No users found
                </p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <th className="text-left p-4 font-semibold text-slate-900 dark:text-slate-100">
                          Name
                        </th>
                        <th className="text-left p-4 font-semibold text-slate-900 dark:text-slate-100">
                          Email
                        </th>
                        <th className="text-left p-4 font-semibold text-slate-900 dark:text-slate-100">
                          Role
                        </th>
                        <th className="text-right p-4 font-semibold text-slate-900 dark:text-slate-100">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userItem) => {
                        const RoleIcon = getRoleIcon(userItem.role);
                        return (
                          <tr
                            key={userItem.id || userItem._id}
                            className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-150"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center border border-cyan-200/50 dark:border-cyan-800/50">
                                  <span className="text-sm font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                                    {userItem.name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                  {userItem.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <Mail className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                                <span>{userItem.email}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={getRoleBadgeVariant(userItem.role)}
                                className="capitalize gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-200/50 dark:border-cyan-800/50 text-cyan-700 dark:text-cyan-300"
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
                                  className="group gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-950/30 dark:hover:to-blue-950/30 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-700 dark:hover:text-cyan-300 hover:shadow-md hover:shadow-cyan-500/10 transition-all duration-300"
                                >
                                  <div className="p-0.5 rounded bg-cyan-100/50 dark:bg-cyan-900/30 group-hover:bg-cyan-200/70 dark:group-hover:bg-cyan-800/50 transition-colors">
                                    <Edit className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                                  </div>
                                  <span className="font-medium">Edit</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(userItem)}
                                  className="group gap-2 border-red-200 dark:border-red-800/50 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 dark:hover:from-red-950/30 dark:hover:to-rose-950/30 hover:border-red-300 dark:hover:border-red-700 hover:text-red-700 dark:hover:text-red-300 hover:shadow-md hover:shadow-red-500/10 transition-all duration-300"
                                >
                                  <div className="p-0.5 rounded bg-red-100/50 dark:bg-red-900/30 group-hover:bg-red-200/70 dark:group-hover:bg-red-800/50 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
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
              </div>
            )}

            {!loadingUsers && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:border-cyan-300 dark:hover:border-cyan-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
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
                              <span className="px-2 text-slate-400 dark:text-slate-500">
                                ...
                              </span>
                            )}
                            <Button
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className={`min-w-[2.5rem] ${
                                currentPage === page
                                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                                  : "border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:border-cyan-300 dark:hover:border-cyan-700"
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
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(pagination.totalPages, prev + 1)
                      )
                    }
                    disabled={currentPage === pagination.totalPages}
                    className="border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:border-cyan-300 dark:hover:border-cyan-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="flex items-center gap-3 text-2xl bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                <UserPlus className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              {editingUser
                ? "Update user information below"
                : "Fill in the details to create a new user account"}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="mt-4 border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20">
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
              <Label htmlFor="name" className="text-slate-900 dark:text-slate-100 font-medium">
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
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-900 dark:text-slate-100 font-medium">
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
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-900 dark:text-slate-100 font-medium">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                required
              >
                <SelectTrigger id="role" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select the role for the user
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-900 dark:text-slate-100 font-medium">
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
                  className="pr-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 focus:outline-none transition-colors"
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Leave blank to keep the current password
                </p>
              )}
            </div>

            {formData.password && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-900 dark:text-slate-100 font-medium">
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
                    className="pr-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 focus:outline-none transition-colors"
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

            <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
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
