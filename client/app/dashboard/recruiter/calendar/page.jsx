"use client";

import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Loading from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { recruiterTasksAPI } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Briefcase,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Video,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateTimeShort, formatTimeWithAMPM, formatDateOnly } from "@/lib/timeFormatter";
import { format, isSameDay } from "date-fns";

export default function RecruiterCalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && user.role !== "recruiter") {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, currentMonth]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Fetch all tasks (no filter) to show on calendar
      const response = await recruiterTasksAPI.getTasks({ filter: "all" });
      setTasks(response.tasks || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    if (!date) return [];
    return tasks.filter((task) => {
      const taskDate = new Date(task.interview_time);
      return isSameDay(taskDate, date);
    });
  };

  // Get dates that have tasks
  const getDatesWithTasks = () => {
    return tasks.map((task) => {
      const taskDate = new Date(task.interview_time);
      return new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { variant: "default", icon: Clock, label: "Scheduled", className: "bg-blue-500" },
      completed: { variant: "default", icon: CheckCircle2, label: "Completed", className: "bg-green-500" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled" },
      rescheduled: { variant: "secondary", icon: AlertCircle, label: "Rescheduled" },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const selectedDateTasks = getTasksForDate(selectedDate);

  // Calendar helper functions
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Format event text for calendar display
  const formatEventText = (task) => {
    const time = formatTimeWithAMPM(task.interview_time);
    const candidateName = task.candidate_id?.name || "Interview";
    // Truncate to show time + first few chars (e.g., "10:00 AM In...")
    const shortName = candidateName.length > 2 
      ? candidateName.substring(0, 2) + "..." 
      : candidateName;
    return `${time} ${shortName}`;
  };

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return getTasksForDate(date);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Interview Calendar</h1>
              <p className="text-slate-600">View and manage your scheduled interviews</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="lg:col-span-2">
                <Card className="shadow-sm">
                  <CardHeader className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg p-2.5 shadow-lg shadow-cyan-500/25">
                          <CalendarIcon className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900">
                          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={previousMonth}
                          className="h-9 w-9 bg-transparent"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={goToToday}
                          className="h-9 px-4 bg-transparent"
                        >
                          Today
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={nextMonth}
                          className="h-9 w-9 bg-transparent"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 mb-2">
                      {daysOfWeek.map((day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-semibold text-gray-600 py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 border-l border-t border-gray-200">
                      {/* Empty cells for days before month starts */}
                      {Array.from({ length: firstDay }).map((_, index) => (
                        <div
                          key={`empty-${index}`}
                          className="border-r border-b border-gray-200 bg-gray-50 min-h-[100px]"
                        />
                      ))}

                      {/* Days of the month */}
                      {Array.from({ length: daysInMonth }).map((_, index) => {
                        const day = index + 1;
                        const dayDate = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth(),
                          day
                        );
                        const dayEvents = getEventsForDay(day);
                        const isSelected = isSameDay(dayDate, selectedDate);
                        const isToday = isSameDay(dayDate, new Date());

                        return (
                          <div
                            key={day}
                            onClick={() => setSelectedDate(dayDate)}
                            className={`
                              border-r border-b border-gray-200 min-h-[100px] p-2 
                              transition-colors cursor-pointer
                              ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}
                              ${isToday && !isSelected ? "bg-blue-50/30" : ""}
                            `}
                          >
                            <div
                              className={`
                                text-sm font-semibold mb-1
                                ${isSelected ? "text-blue-700" : "text-gray-900"}
                                ${isToday && !isSelected ? "text-blue-600" : ""}
                              `}
                            >
                              {day}
                            </div>
                            <div className="space-y-1">
                              {dayEvents.slice(0, 3).map((task, idx) => (
                                <div
                                  key={task._id || idx}
                                  className="text-xs bg-blue-500 text-white rounded px-2 py-0.5 truncate"
                                  title={`${formatTimeWithAMPM(task.interview_time)} - ${task.candidate_id?.name || "Unknown Candidate"}`}
                                >
                                  {formatEventText(task)}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-xs bg-blue-500 text-white rounded px-2 py-0.5 text-center">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Side Panel - Task Details */}
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      {formatDateOnly(selectedDate)}
                    </CardTitle>
                    <CardDescription>
                      {selectedDateTasks.length === 0
                        ? "No interviews scheduled"
                        : `${selectedDateTasks.length} interview${selectedDateTasks.length > 1 ? "s" : ""} scheduled`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                    {selectedDateTasks.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No interviews scheduled for this date</p>
                      </div>
                    ) : (
                      selectedDateTasks.map((task) => (
                        <div
                          key={task._id}
                          className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                        >
                          {/* Status Badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase">
                              Interview
                            </span>
                            {getStatusBadge(task.status)}
                          </div>

                          {/* Candidate Name */}
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-600 font-semibold">
                              {task.candidate_id?.name || "Unknown Candidate"}
                            </span>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-700">
                              {formatTimeWithAMPM(task.interview_time)}
                            </span>
                          </div>

                          {/* Job Position */}
                          {task.job_id && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-700">
                                {task.job_id.title || "N/A"} @ {task.job_id.company || "N/A"}
                              </span>
                            </div>
                          )}

                          {/* Candidate Email */}
                          {task.candidate_id?.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-600 text-xs">
                                {task.candidate_id.email}
                              </span>
                            </div>
                          )}

                          {/* Meet Link */}
                          {task.meet_link && (
                            <div className="flex items-center gap-2 text-sm">
                              <Video className="w-4 h-4 text-green-600" />
                              <a
                                href={task.meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:underline text-xs truncate"
                              >
                                Join Meeting
                              </a>
                            </div>
                          )}

                          {/* Email Status */}
                          {task.email_sent && (
                            <div className="flex items-center gap-2 text-xs text-green-600">
                              <Mail className="w-3 h-3" />
                              <span>Email sent</span>
                              {task.email_sent_at && (
                                <span className="text-slate-500">
                                  ({format(task.email_sent_at, "MMM dd, yyyy")})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Divider */}
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs text-slate-500">
                              Interview ID: {task._id.slice(-8)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

