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
import { recruiterAvailabilityAPI } from "@/lib/api";
import { format } from "date-fns";
import { CalendarIcon, Clock, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function RecruiterAvailability({ jobId, user }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [timeSlots, setTimeSlots] = useState({}); // { dateString: [{ start_time, end_time, is_available }] }
  const [newSlot, setNewSlot] = useState({ start_time: "", end_time: "" });
  const [editingSlot, setEditingSlot] = useState(null);

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
    } catch (err) {
      console.error("Error saving availability:", err);
      setError(err.message || "Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAvailability = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all availability for this job?"
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await recruiterAvailabilityAPI.deleteAvailability(jobId);
      setAvailability(null);
      setTimeSlots({});
      setSelectedDate(null);
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
      <div className="py-6">
        <p className="text-muted-foreground text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              My Availability
            </h3>
            <p className="text-sm text-muted-foreground">
              Set your available dates and times for this job posting
            </p>
          </div>
          {availability && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAvailability}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200">
            <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div>
            <Label className="mb-2 block">Select Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              modifiers={{
                hasSlots: getDatesWithSlots(),
              }}
              modifiersClassNames={{
                hasSlots: "bg-blue-100 dark:bg-blue-900/30 rounded-md",
              }}
              className="rounded-md border"
            />
          </div>

          {/* Time Slots */}
          <div className="space-y-4">
            {selectedDate ? (
              <>
                <div>
                  <Label className="mb-2 block">
                    Time Slots for {format(selectedDate, "MMMM d, yyyy")}
                  </Label>
                  <div className="space-y-2">
                    {timeSlots[format(selectedDate, "yyyy-MM-dd")]?.map(
                      (slot, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md border",
                            !slot.is_available &&
                              "bg-gray-100 dark:bg-gray-800 opacity-60"
                          )}
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 text-sm">
                            {slot.start_time} - {slot.end_time}
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
                            className="text-xs"
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
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    ) || (
                      <p className="text-sm text-muted-foreground">
                        No time slots added for this date
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Add New Time Slot</Label>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      placeholder="Start Time"
                      value={newSlot.start_time}
                      onChange={(e) =>
                        setNewSlot({ ...newSlot, start_time: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Input
                      type="time"
                      placeholder="End Time"
                      value={newSlot.end_time}
                      onChange={(e) =>
                        setNewSlot({ ...newSlot, end_time: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddTimeSlot}
                      size="sm"
                      disabled={!newSlot.start_time || !newSlot.end_time}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <p className="text-muted-foreground text-center">
                  Select a date from the calendar to add time slots
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSaveAvailability}
            disabled={saving || Object.keys(timeSlots).length === 0}
            className="flex-1"
          >
            {saving ? "Saving..." : "Save Availability"}
          </Button>
          {selectedDate && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDate(null);
                setNewSlot({ start_time: "", end_time: "" });
                setError(null);
              }}
            >
              Cancel
            </Button>
          )}
        </div>

        {availability && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Last updated:{" "}
              {format(new Date(availability.updatedAt), "PPp")}
            </p>
            <p className="text-xs text-muted-foreground">
              Total slots:{" "}
              {Object.values(timeSlots).reduce(
                (sum, slots) => sum + slots.length,
                0
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

