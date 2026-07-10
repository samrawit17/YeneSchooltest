"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sectionsAPI, classesAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SectionFormProps {
  type: "create" | "update";
  data?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SectionForm = ({ type, data, onSuccess, onCancel }: SectionFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const academicYearId = data?.selectedAcademicYearId || data?.class?.academicYearId;
  const [formData, setFormData] = useState({
    classId: data?.classId || "",
    name: data?.name || "",
    capacity: data?.capacity || 30,
    roomNumber: data?.roomNumber || "",
  });
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    const fetchDefaultCapacity = async () => {
      if (type === "create" && !data?.capacity && user?.schoolId) {
        try {
          const { schoolSettingsAPI } = await import("@/lib/api");
          const resp = await schoolSettingsAPI.get(user.schoolId, "DEFAULT_SECTION_CAPACITY");
          const settingValue = resp.data?.value;
          if (settingValue) {
            setFormData(prev => ({ ...prev, capacity: Number(settingValue) }));
          }
        } catch (error) {
          console.error("Error fetching default capacity:", error);
        }
      }
    };
    fetchDefaultCapacity();
  }, [type, data?.capacity, user?.schoolId]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await classesAPI.getAll(
          academicYearId ? { academicYearId } : undefined,
        );
        setClasses(response.data);
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, [academicYearId]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === "create") {
        return sectionsAPI.create(formData);
      } else {
        return sectionsAPI.update(data.id, formData);
      }
    },
    onSuccess: () => {
      toast.success(
        type === "create" ? "Section created successfully" : "Section updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.sections.all });
      queryClient.invalidateQueries({ queryKey: ["academic-sections"] });
      queryClient.invalidateQueries({ queryKey: ["academic-sections-search"] });
      queryClient.invalidateQueries({ queryKey: ["academic-classes"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${type} section`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await mutation.mutateAsync();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)] focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-3">
        {/* Class and Room Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              required
              className={inputClass}
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name || `Grade ${cls.grade}`} - {cls.academicYear?.name || cls.academicYearId} ({cls.section})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Room Number
            </label>
            <input
              type="text"
              value={formData.roomNumber}
              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
              placeholder="e.g., 101, A204"
              className={inputClass}
            />
          </div>
        </div>

        {/* Section Name and Capacity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              Section Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., A, B, C"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              required
              placeholder="Enter capacity"
              min={1}
              max={100}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel ? onCancel : () => window.history.back()}
          className="px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || mutation.isPending}
          style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }} className="px-6 py-2.5 bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading || mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            type === "create" ? "Create Section" : "Update Section"
          )}
        </button>
      </div>
    </form>
  );
};

export default SectionForm;
