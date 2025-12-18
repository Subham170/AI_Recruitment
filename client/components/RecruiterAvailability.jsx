"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recruiterAvailabilityAPI } from "@/lib/api";
import {
  convert24To12Hour,
  formatFullDateTimeWithAMPM,
} from "@/lib/timeFormatter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Clock, Plus, Trash2, X, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export default function RecruiterAvailability({ jobId, user, onSaveSuccess }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [timeSlots, setTimeSlots] = useState({}); // { dateString: [{ start_time, end_time, is_available }] }
  const [newSlot, setNewSlot] = useState({ start_time: "", end_time: "" });
  const [editingSlot, setEditingSlot] = useState(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Check if user is a recruiter assigned to this job
  const isRecruiter = user?.role === "recruiter";

  useEffect(() => {
    if (jobId && isRecruiter) {
      fetchAvailability();
    }
  }, [jobId, isRecruiter]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await recruiterAvailabilityAPI.getAvailabilityByJob(
        jobId
      );
      setAvailability(response);
      // Convert availability slots to timeSlots format
      const slotsMap = {};
      if (response?.availability_slots) {
        response.availability_slots.forEach((slot) => {
          const dateStr = format(new Date(slot.date), "yyyy-MM-dd");
          if (!slotsMap[dateStr]) {
            slotsMap[dateStr] = [];
          }
          slotsMap[dateStr].push({
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_available: slot.is_available,
            index: slotsMap[dateStr].length,
          });
        });
      }
      setTimeSlots(slotsMap);
    } catch (err) {
      console.error("Error fetching availability:", err);
      if (err.message?.includes("not found")) {
        // No availability exists yet, that's okay
        setAvailability(null);
      } else {
        setError(err.message || "Failed to load availability");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      const dateStr = format(date, "yyyy-MM-dd");
      if (!timeSlots[dateStr]) {
        setTimeSlots({ ...timeSlots, [dateStr]: [] });
      }
    }
  };

  const handleAddTimeSlot = () => {
    if (!selectedDate || !newSlot.start_time || !newSlot.end_time) {
      setError("Please select a date and provide both start and end times");
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (
      !timeRegex.test(newSlot.start_time) ||
      !timeRegex.test(newSlot.end_time)
    ) {
      setError("Time format must be HH:MM (24-hour format)");
      return;
    }

    // Validate that end_time is after start_time
    const [startHour, startMin] = newSlot.start_time.split(":").map(Number);
    const [endHour, endMin] = newSlot.end_time.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      setError("End time must be after start time");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const updatedSlots = { ...timeSlots };
    if (!updatedSlots[dateStr]) {
      updatedSlots[dateStr] = [];
    }

    // Check for duplicate
    const isDuplicate = updatedSlots[dateStr].some(
      (slot) =>
        slot.start_time === newSlot.start_time &&
        slot.end_time === newSlot.end_time
    );

    if (isDuplicate) {
      setError("This time slot already exists for this date");
      return;
    }

    updatedSlots[dateStr].push({
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      is_available: true,
    });

    setTimeSlots(updatedSlots);
    setNewSlot({ start_time: "", end_time: "" });
    setError(null);
  };

  const handleRemoveTimeSlot = (dateStr, index) => {
    const updatedSlots = { ...timeSlots };
    if (updatedSlots[dateStr]) {
      updatedSlots[dateStr] = updatedSlots[dateStr].filter(
        (_, i) => i !== index
      );
      if (updatedSlots[dateStr].length === 0) {
        delete updatedSlots[dateStr];
      }
      setTimeSlots(updatedSlots);
    }
  };

  const handleToggleAvailability = (dateStr, index) => {
    const updatedSlots = { ...timeSlots };
    if (updatedSlots[dateStr] && updatedSlots[dateStr][index]) {
      updatedSlots[dateStr][index].is_available =
        !updatedSlots[dateStr][index].is_available;
      setTimeSlots(updatedSlots);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      setError(null);

      // Convert timeSlots to API format
      const availabilitySlots = [];
      Object.keys(timeSlots).forEach((dateStr) => {
        timeSlots[dateStr].forEach((slot) => {
          availabilitySlots.push({
            date: dateStr,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_available: slot.is_available,
          });
        });
      });

      if (availabilitySlots.length === 0) {
        setError("Please add at least one availability slot");
        setSaving(false);
        return;
      }

      await recruiterAvailabilityAPI.createOrUpdateAvailability(
        jobId,
        availabilitySlots
      );

      // Refresh availability
      await fetchAvailability();
      setSelectedDate(null);
      setError(null);
      
      // Close the dialog if callback is provided
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err) {
      console.error("Error saving availability:", err);
      setError(err.message || "Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAvailability = async () => {
    try {
      setSaving(true);
      setError(null);
      await recruiterAvailabilityAPI.deleteAvailability(jobId);
      setAvailability(null);
      setTimeSlots({});
      setSelectedDate(null);
      setClearAllDialogOpen(false);
    } catch (err) {
      console.error("Error deleting availability:", err);
      setError(err.message || "Failed to delete availability");
    } finally {
      setSaving(false);
    }
  };

  // Get dates that have availability slots
  const getDatesWithSlots = () => {
    return Object.keys(timeSlots)
      .filter((dateStr) => timeSlots[dateStr].length > 0)
      .map((dateStr) => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date;
      });
  };

  if (!isRecruiter) {
    return null;
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto mb-3 animate-spin text-cyan-600" />
          <p className="text-slate-600 font-medium">Loading availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {availability && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearAllDialogOpen(true)}
            disabled={saving}
            className="group border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-300"
          >
            <div className="p-0.5 rounded bg-red-100/50 group-hover:bg-red-200/70 transition-colors mr-2">
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </div>
            <span className="font-medium">Clear All</span>
          </Button>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-md border-white/60 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-3 text-slate-900">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              Clear All Availability
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Are you sure you want to delete all availability for this job? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-700">
              This will permanently remove all time slots you've set for this job posting. You'll need to add them again if you want to set availability later.
            </p>
          </div>
          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => setClearAllDialogOpen(false)}
              disabled={saving}
              className="border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAvailability}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Clear All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm text-red-800 font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white">
          <Label className="mb-4 block text-slate-700 font-semibold">
            Select Date
          </Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) =>
              date < new Date(new Date().setHours(0, 0, 0, 0))
            }
            modifiers={{
              hasSlots: getDatesWithSlots(),
            }}
            modifiersClassNames={{
              hasSlots: "bg-cyan-100 rounded-md font-semibold",
            }}
            className="rounded-xl border-slate-200 bg-white"
          />
        </div>

        {/* Time Slots */}
        <div className="space-y-4">
          {selectedDate ? (
            <>
              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <Label className="mb-4 block text-slate-700 font-semibold">
                  Time Slots for {format(selectedDate, "MMMM d, yyyy")}
                </Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {timeSlots[format(selectedDate, "yyyy-MM-dd")]?.map(
                    (slot, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                          slot.is_available
                            ? "bg-cyan-50 border-cyan-200 hover:shadow-md hover:shadow-cyan-500/10"
                            : "bg-slate-100 border-slate-300 opacity-60"
                        )}
                      >
                        <div className="p-1.5 rounded bg-cyan-100">
                          <Clock className="h-4 w-4 text-cyan-600" />
                        </div>
                        <span className="flex-1 text-sm font-medium text-slate-900">
                          {convert24To12Hour(slot.start_time)} -{" "}
                          {convert24To12Hour(slot.end_time)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleAvailability(
                              format(selectedDate, "yyyy-MM-dd"),
                              index
                            )
                          }
                          className={cn(
                            "text-xs font-medium",
                            slot.is_available
                              ? "text-green-600 hover:bg-green-50"
                              : "text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          {slot.is_available ? "Available" : "Unavailable"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveTimeSlot(
                              format(selectedDate, "yyyy-MM-dd"),
                              index
                            )
                          }
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  ) || (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm text-slate-500">
                        No time slots added for this date
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-5 rounded-xl border border-slate-200 bg-white">
                <Label className="text-slate-700 font-semibold">
                  Add New Time Slot
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    placeholder="Start Time"
                    value={newSlot.start_time}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, start_time: e.target.value })
                    }
                    className="flex-1 bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                  <Input
                    type="time"
                    placeholder="End Time"
                    value={newSlot.end_time}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, end_time: e.target.value })
                    }
                    className="flex-1 bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                  <Button
                    onClick={handleAddTimeSlot}
                    size="sm"
                    disabled={!newSlot.start_time || !newSlot.end_time}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px] p-5 rounded-xl border border-slate-200 bg-white">
              <div className="text-center">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-600 font-medium">
                  Select a date from the calendar to add time slots
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <Button
          onClick={handleSaveAvailability}
          disabled={saving || Object.keys(timeSlots).length === 0}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
        >
          {saving ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Availability"
          )}
        </Button>
        {selectedDate && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedDate(null);
              setNewSlot({ start_time: "", end_time: "" });
              setError(null);
            }}
            className="border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </Button>
        )}
      </div>

      {availability && (
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                Last updated:{" "}
                <span className="text-slate-900">
                  {formatFullDateTimeWithAMPM(availability.updatedAt)}
                </span>
              </p>
              <p className="text-xs text-slate-600">
                Total slots:{" "}
                <span className="font-semibold text-cyan-600">
                  {Object.values(timeSlots).reduce(
                    (sum, slots) => sum + slots.length,
                    0
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
