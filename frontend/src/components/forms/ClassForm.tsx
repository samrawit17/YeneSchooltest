"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classesAPI, academicYearsAPI, schoolSettingsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ClassFormProps {
  type: "create" | "update";
  data?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ClassForm = ({ type, data, onSuccess, onCancel }: ClassFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: data?.name || "",
    grade: data?.grade || 1,
    academicYearId: data?.academicYearId || "",
    section: data?.section || "A",
  });

  const [schoolSettings, setSchoolSettings] = useState<any>({});

  const queryClient = useQueryClient();

  const { data: settingsData } = useQuery({
    queryKey: queryKeys.school.classForm,
    queryFn: async () => {
      if (!user?.schoolId) return [];
      const response = await schoolSettingsAPI.getAll(user.schoolId);
      return response.data;
    },
    enabled: !!user?.schoolId,
  });

  const { data: academicYears } = useQuery({
    queryKey: queryKeys.academicYears.all,
    queryFn: async () => {
      const response = await academicYearsAPI.getAll();
      return response.data;
    },
  });

  useEffect(() => {
    if (settingsData) {
      setSchoolSettings(settingsData);
    }
  }, [settingsData]);

  const getGradeSystem = () => {
    return schoolSettings?.grade_system || 'KG_TO_12';
  };

  const getGradeRange = () => {
    const gradeSystem = getGradeSystem();
    switch (gradeSystem) {
      case 'K-12':
      case 'KG_TO_12':
        return { min: 1, max: 12, labels: 'Grades 1-12 (K-12)' };
      case 'K-8':
      case 'KG_TO_8':
        return { min: 1, max: 8, labels: 'Grades 1-8 (K-8)' };
      case '1-8':
        return { min: 1, max: 8, labels: 'Grades 1-8' };
      case '1-10':
        return { min: 1, max: 10, labels: 'Grades 1-10' };
      case '1-12':
        return { min: 1, max: 12, labels: 'Grades 1-12' };
      case '9-12':
        return { min: 9, max: 12, labels: 'Grades 9-12 (High School)' };
      case 'PRE-K-12':
        return { min: 1, max: 12, labels: 'Pre-K to Grade 12' };
      case 'PRE_PRIMARY':
        return { min: 1, max: 3, labels: 'Pre-primary (1-3)' };
      case 'PRIMARY':
        return { min: 1, max: 6, labels: 'Grades 1-6 (Primary)' };
      case 'SECONDARY':
        return { min: 7, max: 12, labels: 'Grades 7-12 (Secondary)' };
      default:
        return { min: 1, max: 12, labels: 'Grades 1-12' };
    }
  };

  const gradeRange = getGradeRange();

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === "create") {
        return classesAPI.create(formData);
      } else {
        return classesAPI.update(data.id, formData);
      }
    },
    onSuccess: () => {
      toast.success(
        type === "create" ? "Class created successfully" : "Class updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.classSections.academicClasses(
          data?.academicYearId || formData.academicYearId,
        ),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.classSections.academicSections });
      queryClient.invalidateQueries({ queryKey: ["academic-classes"] });
      queryClient.invalidateQueries({ queryKey: ["academic-classes-search"] });
      queryClient.invalidateQueries({ queryKey: ["academic-sections-search"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${type} class`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.grade < gradeRange.min || formData.grade > gradeRange.max) {
      toast.error(`Grade must be between ${gradeRange.min} and ${gradeRange.max}`);
      return;
    }

    setLoading(true);
    try {
      await mutation.mutateAsync();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#e35336] focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Grade System:</strong> {gradeRange.labels}
            {schoolSettings?.grade_system && (
              <span className="ml-1.5">(Configured in school settings)</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              Grade <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value) })}
              required
              placeholder={`Enter grade (${gradeRange.min}-${gradeRange.max})`}
              min={gradeRange.min}
              max={gradeRange.max}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Section <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              required
              placeholder="e.g., A, B, C"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              Class Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter class name (optional)"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Academic Year <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.academicYearId}
              onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
              required
              className={inputClass}
            >
              <option value="">Select Academic Year</option>
              {academicYears?.map((year: any) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {schoolSettings?.DEFAULT_SECTION_CAPACITY && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Section Capacity:</strong> Default capacity is {schoolSettings.DEFAULT_SECTION_CAPACITY} students per section
            </p>
          </div>
        )}
      </div>

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
          disabled={loading || mutation.isPending || !formData.academicYearId}
          className="px-6 py-2.5 text-white bg-[#e35336] rounded-lg hover:bg-[#d14830] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading || mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            type === "create" ? "Create Class" : "Update Class"
          )}
        </button>
      </div>
    </form>
  );
};

export default ClassForm;
