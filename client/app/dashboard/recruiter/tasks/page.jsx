"use client";

import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { GlassBackground } from "@/components/GlassShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Loading from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { recruiterTasksAPI, recruiterAvailabilityAPI, bolnaAPI, userAPI } from "@/lib/api";
import { Calendar, Clock, Mail, User, Briefcase, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateTimeShort, formatDateShort, formatFullDateTimeWithAMPM, formatTimeWithAMPM, convert24To12Hour } from "@/lib/timeFormatter";
import { toast } from "sonner";
import RecruiterAvailability from "@/components/RecruiterAvailability";

export default function RecruiterTasksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();
  const [tasks, setTasks] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [taskStats, setTaskStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    scheduled: 0,
    completed: 0,
  });
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [filter, setFilter] = useState("all"); // all, today, week, month
  const [error, setError] = useState(null);
  
  // Cancellation and reschedule dialogs
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedTaskForCancel, setSelectedTaskForCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  
  // Reschedule state
  const [selectedRecruiter, setSelectedRecruiter] = useState("");
  const [recruiterAvailability, setRecruiterAvailability] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [jobRecruiters, setJobRecruiters] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && user.role !== "recruiter") {
      router.push(`/dashboard/${user.role}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === "recruiter") {
      fetchTasks();
      fetchTaskStats();
    }
  }, [user, filter]);

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      setError(null);
      const params = filter !== "all" ? { filter } : {};
      const response = await recruiterTasksAPI.getTasks(params);
      if (response.success) {
        setTasks(response.tasks || []);
        setStatistics(response.statistics || {});
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchTaskStats = async () => {
    try {
      const response = await recruiterTasksAPI.getTaskStats();
      if (response.success) {
        setTaskStats(response.statistics || {});
      }
    } catch (err) {
      console.error("Error fetching task stats:", err);
    }
  };

  const handleCancelInterview = async () => {
    if (!selectedTaskForCancel) return;

    try {
      setCancelling(true);
      await recruiterTasksAPI.cancelInterview(selectedTaskForCancel._id);
      
      toast.success("Interview Cancelled", {
        description: "The interview has been cancelled and the Cal.com booking has been removed.",
      });

      // Close cancel dialog and open reschedule dialog
      setCancelDialogOpen(false);
      setRescheduleDialogOpen(true);
      
      // Set up reschedule data
      const task = selectedTaskForCancel;
      setSelectedTaskForCancel(task);
      
      // Fetch recruiters for the job
      if (task.job_id?._id) {
        try {
          const recruitersData = await userAPI.getRecruiters();
          const recruitersList = (recruitersData.recruiters || []).map((r) => ({
            value: r._id,
            label: r.name || r.email,
          }));
          setJobRecruiters(recruitersList);
          
          // Pre-select the current recruiter if available
          if (task.recruiter_id?._id) {
            const recruiterId = task.recruiter_id._id.toString();
            setSelectedRecruiter(recruiterId);
            const jobId = task.job_id._id.toString();
            await handleRecruiterChange(recruiterId, jobId);
          }
        } catch (err) {
          console.error("Error fetching recruiters:", err);
          toast.error("Failed to load recruiters");
        }
      }
      
      await fetchTasks();
      await fetchTaskStats();
    } catch (err) {
      console.error("Error cancelling interview:", err);
      toast.error("Failed to Cancel Interview", {
        description: err.message || "An error occurred while cancelling the interview.",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleRecruiterChange = async (recruiterId, jobId) => {
    if (!recruiterId || !jobId) return;

    setSelectedRecruiter(recruiterId);
    setRecruiterAvailability(null);
    setSelectedSlot("");

    try {
      setLoadingAvailability(true);
      
      // Fetch availability and booked slots in parallel
      const [allResponse, bookedSlotsResponse] = await Promise.all([
        recruiterAvailabilityAPI.getAllAvailabilityByJob(jobId),
        recruiterTasksAPI.getBookedSlots(recruiterId, jobId),
      ]);

      const allAvail = allResponse?.availabilities || [];
      const recruiterAvail = allAvail.find((avail) => {
        const availRecruiterId =
          avail.recruiter_id?._id?.toString() || avail.recruiter_id?.toString();
        return availRecruiterId === recruiterId;
      });

      if (recruiterAvail && recruiterAvail.availability_slots) {
        // Filter only available slots (not marked as unavailable)
        let availableSlots = recruiterAvail.availability_slots.filter(
          (slot) => slot.is_available !== false
        );

        // Split slots that partially overlap with booked interviews
        const bookedSlots = bookedSlotsResponse?.bookedSlots || [];
        if (bookedSlots.length > 0) {
          const processedSlots = [];
          
          availableSlots.forEach((slot) => {
            const slotDate = new Date(slot.date);
            const slotStartTime = new Date(slotDate);
            const [hours, minutes] = slot.start_time.split(":").map(Number);
            slotStartTime.setHours(hours, minutes, 0, 0);
            
            const slotEndTime = new Date(slotStartTime);
            const [endHours, endMinutes] = slot.end_time.split(":").map(Number);
            slotEndTime.setHours(endHours, endMinutes, 0, 0);

            // Find all overlapping booked slots for this availability slot
            const overlappingBookings = bookedSlots.filter((bookedSlot) => {
              const bookedStart = new Date(bookedSlot.startTime);
              const bookedEnd = new Date(bookedSlot.endTime);
              
              // Check for overlap: slot starts before booked ends AND slot ends after booked starts
              return (
                slotStartTime < bookedEnd &&
                slotEndTime > bookedStart
              );
            });

            if (overlappingBookings.length === 0) {
              // No overlap, keep the slot as is
              processedSlots.push(slot);
            } else {
              // Sort overlapping bookings by start time
              overlappingBookings.sort((a, b) => 
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
              );

              // Create available segments by subtracting booked times
              let currentStart = slotStartTime;
              
              overlappingBookings.forEach((bookedSlot) => {
                const bookedStart = new Date(bookedSlot.startTime);
                const bookedEnd = new Date(bookedSlot.endTime);
                
                // If there's available time before this booking, create a slot
                if (currentStart < bookedStart) {
                  const availableStart = new Date(currentStart);
                  const availableEnd = new Date(bookedStart);
                  
                  // Only add if there's at least 15 minutes available
                  if (availableEnd.getTime() - availableStart.getTime() >= 15 * 60 * 1000) {
                    const startHours = availableStart.getHours().toString().padStart(2, '0');
                    const startMinutes = availableStart.getMinutes().toString().padStart(2, '0');
                    const endHours = availableEnd.getHours().toString().padStart(2, '0');
                    const endMinutes = availableEnd.getMinutes().toString().padStart(2, '0');
                    
                    processedSlots.push({
                      ...slot,
                      start_time: `${startHours}:${startMinutes}`,
                      end_time: `${endHours}:${endMinutes}`,
                      _isSplit: true, // Mark as split slot
                    });
                  }
                }
                
                // Update current start to after this booking
                currentStart = bookedEnd > currentStart ? bookedEnd : currentStart;
              });
              
              // If there's available time after the last booking, create a slot
              if (currentStart < slotEndTime) {
                const availableStart = new Date(currentStart);
                const availableEnd = new Date(slotEndTime);
                
                // Only add if there's at least 15 minutes available
                if (availableEnd.getTime() - availableStart.getTime() >= 15 * 60 * 1000) {
                  const startHours = availableStart.getHours().toString().padStart(2, '0');
                  const startMinutes = availableStart.getMinutes().toString().padStart(2, '0');
                  const endHours = availableEnd.getHours().toString().padStart(2, '0');
                  const endMinutes = availableEnd.getMinutes().toString().padStart(2, '0');
                  
                  processedSlots.push({
                    ...slot,
                    start_time: `${startHours}:${startMinutes}`,
                    end_time: `${endHours}:${endMinutes}`,
                    _isSplit: true, // Mark as split slot
                  });
                }
              }
            }
          });
          
          availableSlots = processedSlots;
        }

        setRecruiterAvailability(availableSlots);
      } else {
        setRecruiterAvailability([]);
        toast.warning(
          "No availability found for this recruiter. Please ask them to set their availability."
        );
      }
    } catch (err) {
      console.error("Error fetching availability:", err);
      toast.error(err.message || "Failed to load recruiter availability");
      setRecruiterAvailability([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleRescheduleInterview = async () => {
    if (!selectedTaskForCancel || !selectedRecruiter || !selectedSlot) {
      toast.error("Please select a recruiter and time slot");
      return;
    }

    try {
      setSendingEmail(true);
      const task = selectedTaskForCancel;
      const candidateId = task.candidate_id?._id?.toString() || task.candidate_id?.toString();
      const jobId = task.job_id?._id?.toString() || task.job_id?.toString();

      await bolnaAPI.sendEmail({
        candidateId,
        recruiterId: selectedRecruiter,
        slot: selectedSlot,
        jobId,
      });

      toast.success("Interview Rescheduled", {
        description: "The interview has been rescheduled and an email has been sent to the candidate.",
      });

      setRescheduleDialogOpen(false);
      setSelectedTaskForCancel(null);
      setSelectedRecruiter("");
      setRecruiterAvailability(null);
      setSelectedSlot("");

      await fetchTasks();
      await fetchTaskStats();
    } catch (err) {
      console.error("Error rescheduling interview:", err);
      toast.error("Failed to Reschedule Interview", {
        description: err.message || "An error occurred while rescheduling the interview.",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleStatusUpdate = async (taskId, newStatus, interviewTime) => {
    try {
      // If trying to mark as completed, check if interview time has passed
      if (newStatus === "completed") {
        const now = new Date();
        const interviewDate = new Date(interviewTime);
        
        if (interviewDate > now) {
          const interviewTimeFormatted = formatFullDateTimeWithAMPM(interviewTime);
          const currentTimeFormatted = formatFullDateTimeWithAMPM(now);
          
          toast.error("Cannot Complete Task", {
            description: `The interview is scheduled for ${interviewTimeFormatted}. Please wait until the interview time has passed before marking it as completed.`,
            duration: 5000,
          });
          return;
        }
      }
      
      await recruiterTasksAPI.updateTaskStatus(taskId, newStatus);
      await fetchTasks();
      await fetchTaskStats();
      
      // Show success message
      if (newStatus === "completed") {
        toast.success("Task Completed", {
          description: "The interview task has been marked as completed.",
        });
      } else if (newStatus === "cancelled") {
        toast.success("Task Cancelled", {
          description: "The interview task has been cancelled.",
        });
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      toast.error("Failed to Update Task", {
        description: err.message || "An error occurred while updating the task status.",
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { variant: "default", icon: Clock, label: "Scheduled", badgeClassName: "bg-slate-900 text-white" },
      completed: { variant: "default", icon: CheckCircle2, label: "Completed", badgeClassName: "bg-green-500 text-white" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled", badgeClassName: "bg-red-500 text-white" },
      rescheduled: { variant: "secondary", icon: AlertCircle, label: "Rescheduled", badgeClassName: "bg-yellow-500 text-white" },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.badgeClassName}>
        <Icon className="w-3 h-3 mr-1 text-white" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "recruiter") {
    return null;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
      <GlassBackground />
      <Sidebar />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6 bg-transparent">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2 text-slate-900">
                My Tasks
              </h2>
              <p className="text-slate-600">
                View and manage your interview assignments
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="border-white/60 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.25)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {taskStats.today}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/60 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.25)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {taskStats.week}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/60 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.25)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {taskStats.month}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/60 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.25)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {taskStats.total}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter and Tasks */}
            <Card className="border-white/60 bg-white/75 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.25)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Interview Tasks</CardTitle>
                    <CardDescription>
                      Manage your scheduled interviews
                    </CardDescription>
                  </div>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tasks</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <div className="flex justify-center items-center py-12">
                    <Loading size="md" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-red-600">
                    {error}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No tasks found for the selected period.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div
                        key={task._id}
                        className="border border-white/60 bg-white/70 backdrop-blur-lg rounded-2xl p-4 hover:bg-white/90 transition-colors shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusBadge(task.status)}
                              <span className="text-sm text-slate-500">
                                {task.interview_end_time
                                  ? `${formatDateShort(task.interview_time)} at ${formatTimeWithAMPM(task.interview_time)} - ${formatTimeWithAMPM(task.interview_end_time)}`
                                  : formatDateTimeShort(task.interview_time)}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="font-medium">
                                  {task.candidate_id?.name || "Unknown Candidate"}
                                </span>
                                {task.candidate_id?.email && (
                                  <span className="text-sm text-slate-500">
                                    ({task.candidate_id.email})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-700">
                                  {task.job_id?.title || "Unknown Job"}
                                </span>
                                {task.job_id?.company && (
                                  <span className="text-sm text-slate-500">
                                    @ {task.job_id.company}
                                  </span>
                                )}
                              </div>

                              {task.email_sent && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <Mail className="w-4 h-4" />
                                  <span>Email sent</span>
                                  {task.email_sent_at && (
                                    <span className="text-slate-500">
                                      ({formatDateShort(task.email_sent_at)})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {task.status === "scheduled" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleStatusUpdate(task._id, "completed", task.interview_time)
                                  }
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Mark Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedTaskForCancel(task);
                                    setCancelDialogOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Cancel Interview Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-md border-white/60 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-slate-900">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              Cancel Interview
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Are you sure you want to cancel this interview? This will cancel the Cal.com booking and notify the candidate.
            </DialogDescription>
          </DialogHeader>
          {selectedTaskForCancel && (
            <div className="py-4 space-y-2">
              <div className="text-sm text-slate-700">
                <strong>Candidate:</strong> {selectedTaskForCancel.candidate_id?.name || "Unknown"}
              </div>
              <div className="text-sm text-slate-700">
                <strong>Job:</strong> {selectedTaskForCancel.job_id?.title || "Unknown"} @ {selectedTaskForCancel.job_id?.company || "N/A"}
              </div>
              <div className="text-sm text-slate-700">
                <strong>Scheduled Time:</strong> {formatFullDateTimeWithAMPM(selectedTaskForCancel.interview_time)}
                {selectedTaskForCancel.interview_end_time && ` - ${formatTimeWithAMPM(selectedTaskForCancel.interview_end_time)}`}
              </div>
            </div>
          )}
          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setSelectedTaskForCancel(null);
              }}
              className="border-slate-200 hover:bg-slate-50"
              disabled={cancelling}
            >
              No, Keep It
            </Button>
            <Button
              onClick={handleCancelInterview}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel It"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Interview Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={(open) => {
        setRescheduleDialogOpen(open);
        if (!open) {
          setSelectedTaskForCancel(null);
          setSelectedRecruiter("");
          setRecruiterAvailability(null);
          setSelectedSlot("");
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-md border-white/60 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-slate-900">
              <div className="p-2 rounded-lg bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              Reschedule Interview
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              {selectedTaskForCancel
                ? `Reschedule interview for ${selectedTaskForCancel.candidate_id?.name || "the candidate"}. Select a recruiter and available time slot.`
                : "Select a recruiter and available time slot to reschedule the interview."}
            </DialogDescription>
          </DialogHeader>

          {selectedTaskForCancel && (
            <div className="mt-6 space-y-6">
              {/* Recruiter Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Recruiter
                </label>
                <select
                  value={selectedRecruiter}
                  onChange={(e) => {
                    const recruiterId = e.target.value;
                    const jobId = selectedTaskForCancel.job_id?._id?.toString() || selectedTaskForCancel.job_id?.toString();
                    handleRecruiterChange(recruiterId, jobId);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a recruiter</option>
                  {jobRecruiters.map((recruiter) => (
                    <option key={recruiter.value} value={recruiter.value}>
                      {recruiter.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Slots */}
              {loadingAvailability ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : selectedRecruiter && recruiterAvailability ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Time Slot
                  </label>
                  {recruiterAvailability.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No available slots found for this recruiter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {recruiterAvailability.map((slot, index) => {
                        // Construct proper date-time from slot.date and slot.start_time
                        const slotDate = new Date(slot.date);
                        const slotDateTime = new Date(slotDate);
                        const [hours, minutes] = slot.start_time
                          .split(":")
                          .map(Number);
                        slotDateTime.setHours(hours, minutes, 0, 0);
                        const slotValue = slotDateTime.toISOString();
                        const isSelected = selectedSlot === slotValue;

                        return (
                          <button
                            key={index}
                            onClick={() => setSelectedSlot(slotValue)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="text-sm font-medium">
                              {formatDateShort(slotDate)}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              {convert24To12Hour(slot.start_time)} - {convert24To12Hour(slot.end_time)}
                            </div>
                            {slot._isSplit && (
                              <div className="text-xs text-blue-600 mt-1 italic">
                                Available segment
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : selectedRecruiter ? (
                <div className="text-center py-8 text-slate-500">
                  Please wait while we load availability...
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleDialogOpen(false);
                setSelectedTaskForCancel(null);
                setSelectedRecruiter("");
                setRecruiterAvailability(null);
                setSelectedSlot("");
              }}
              className="border-slate-200 hover:bg-slate-50"
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRescheduleInterview}
              disabled={!selectedRecruiter || !selectedSlot || sendingEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                "Reschedule Interview"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

