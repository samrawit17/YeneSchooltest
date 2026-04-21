"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classesAPI, academicYearsAPI, schoolSettingsAPI } from "@/lib/api";
import { toast } from "sonner";
import InputField from "@/components/InputField";

interface ClassFormProps {
  type: "create" | "update";
  data?: any;
}

const ClassForm = ({ type, data }: ClassFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: data?.name || "",
    grade: data?.grade || 1,
    academicYearId: data?.academicYearId || "",
    section: data?.section || "A",
  });

  const [schoolSettings, setSchoolSettings] = useState<any>({});

  const queryClient = useQueryClient();

  // Fetch school settings
  const { data: settingsData } = useQuery({
    queryKey: ["school-settings-class-form"],
    queryFn: async () => {
      const response = await schoolSettingsAPI.getAll();
      return response.data;
    },
  });

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const response = await academicYearsAPI.getAll();
      return response.data;
    },
  });

  useEffect(() => {
    if (settingsData) {
      const settings: Record<string, any> = {};
      settingsData.forEach((s: any) => {
        settings[s.key] = s.value;
      });
      setSchoolSettings(settings);
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
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${type} class`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate grade range
    if (formData.grade < gradeRange.min || formData.grade > gradeRange.max) {
      toast.error(`Grade must be between ${gradeRange.min} and ${gradeRange.max}`);
      return;
    }

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
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Grade System:</strong> {gradeRange.labels}
            {schoolSettings?.grade_system && (
              <span className="ml-2 text-xs">(Configured in school settings)</span>
            )}
          </p>
        </div>
        
        <InputField
          label="Grade"
          name="grade"
          type="number"
          value={formData.grade}
          onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value) })}
          required
          placeholder={`Enter grade (${gradeRange.min}-${gradeRange.max})`}
          inputProps={{ min: gradeRange.min, max: gradeRange.max }}
        />
        <InputField
          label="Class Name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter class name (optional)"
        />
        <InputField
          label="Section"
          name="section"
          type="text"
          value={formData.section}
          onChange={(e) => setFormData({ ...formData, section: e.target.value })}
          required
          placeholder="Enter section (e.g., A, B, C)"
        />
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Academic Year</label>
          <select
            value={formData.academicYearId}
            onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Academic Year</option>
            {academicYears?.map((year: any) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>
        
        {schoolSettings?.DEFAULT_SECTION_CAPACITY && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Section Capacity:</strong> Default capacity is {schoolSettings.DEFAULT_SECTION_CAPACITY} students per section
            </p>
          </div>
        )}
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
          disabled={loading || mutation.isPending || !formData.academicYearId}
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

export default ClassForm;