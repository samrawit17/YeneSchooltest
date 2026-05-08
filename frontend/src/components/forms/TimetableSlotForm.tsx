"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolSettingsAPI, timetableSlotsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import InputField from "@/components/InputField";
import {
  DEFAULT_SCHOOL_END_TIME,
  DEFAULT_SCHOOL_START_TIME,
  generateTimeOptions,
  getSchoolTimeBounds,
  SCHOOL_WEEK_DAYS,
} from "@/lib/timetable";

interface TimetableSlotFormProps {
  type: "create" | "update";
  data?: any;
}

const TimetableSlotForm = ({ type, data }: TimetableSlotFormProps) => {
  const [loading, setLoading] = useState(false);
  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};
  const schoolId = user.schoolId;

  const { data: schoolSettings } = useQuery({
    queryKey: queryKeys.school.timetableSlotForm(schoolId),
    queryFn: async () => {
      if (!schoolId) return null;
      const response = await schoolSettingsAPI.getAll(schoolId);
      return response.data;
    },
    enabled: Boolean(schoolId),
  });

  const { startTime: schoolStartTime, endTime: schoolEndTime } = getSchoolTimeBounds(schoolSettings);
  const timeOptions = useMemo(
    () => generateTimeOptions(schoolStartTime, schoolEndTime),
    [schoolStartTime, schoolEndTime],
  );
  const [formData, setFormData] = useState({
    classId: data?.classId || "",
    subjectId: data?.subjectId || "",
    teacherId: data?.teacherId || "",
    dayOfWeek: data?.dayOfWeek || 1,
    startTime: data?.startTime || schoolStartTime || DEFAULT_SCHOOL_START_TIME,
    endTime: data?.endTime || timeOptions[1] || schoolEndTime || DEFAULT_SCHOOL_END_TIME,
    room: data?.room || "",
    academicYearId: data?.academicYearId || "",
  });

  useEffect(() => {
    if (data) return;

    setFormData((current) => {
      const nextStartTime = timeOptions.includes(current.startTime)
        ? current.startTime
        : schoolStartTime;
      const fallbackEndTime = timeOptions[1] || schoolEndTime || DEFAULT_SCHOOL_END_TIME;
      const nextEndTime =
        timeOptions.includes(current.endTime) && current.endTime > nextStartTime
          ? current.endTime
          : fallbackEndTime;

      return {
        ...current,
        startTime: nextStartTime,
        endTime: nextEndTime > nextStartTime ? nextEndTime : fallbackEndTime,
      };
    });
  }, [data, schoolEndTime, schoolStartTime, timeOptions]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === "create") {
        return timetableSlotsAPI.create({
          ...formData,
          schoolId,
        });
      } else {
        return timetableSlotsAPI.update(data.id, formData);
      }
    },
    onSuccess: () => {
      toast.success(
        type === "create" ? "Timetable slot created successfully" : "Timetable slot updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.timetableSlots.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${type} timetable slot`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await mutation.mutateAsync();
    } catch (error) {
      // Error handled by mutation
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Day of Week</label>
          <select
            name="dayOfWeek"
            value={formData.dayOfWeek}
            onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {SCHOOL_WEEK_DAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.name}
              </option>
            ))}
          </select>
        </div>

        <InputField
          label="Room"
          name="room"
          type="text"
          value={formData.room}
          onChange={(e) => setFormData({ ...formData, room: e.target.value })}
          placeholder="Room number (optional)"
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Start Time</label>
          <select
            name="startTime"
            value={formData.startTime}
            onChange={(e) =>
              setFormData((current) => {
                const nextStartTime = e.target.value;
                const currentEndTime =
                  current.endTime > nextStartTime ? current.endTime : timeOptions[timeOptions.indexOf(nextStartTime) + 1] || schoolEndTime;
                return {
                  ...current,
                  startTime: nextStartTime,
                  endTime: currentEndTime,
                };
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">End Time</label>
          <select
            name="endTime"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {timeOptions.filter((time) => time > formData.startTime).map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <InputField
          label="Class ID"
          name="classId"
          type="text"
          value={formData.classId}
          onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
          placeholder="Enter class ID"
          required
        />

        <InputField
          label="Subject ID"
          name="subjectId"
          type="text"
          value={formData.subjectId}
          onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
          placeholder="Enter subject ID"
          required
        />

        <InputField
          label="Teacher ID"
          name="teacherId"
          type="text"
          value={formData.teacherId}
          onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
          placeholder="Enter teacher ID"
          required
        />

        <InputField
          label="Academic Year ID (optional)"
          name="academicYearId"
          type="text"
          value={formData.academicYearId}
          onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
          placeholder="Enter academic year ID"
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || mutation.isPending}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
              Loading...
            </>
          ) : (
            type === "create" ? "Create" : "Update"
          )}
        </button>
      </div>
    </form>
  );
};

export default TimetableSlotForm;
