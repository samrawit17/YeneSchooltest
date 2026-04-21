"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { academicYearsAPI, schoolSettingsAPI } from "@/lib/api";
import { toast } from "sonner";
import InputField from "@/components/InputField";

interface AcademicYearFormProps {
  type: "create" | "update";
  data?: any;
}

const getCurriculumHint = (curriculumType: string) => {
  if (curriculumType === "QUARTER") return "Will create 4 quarters with 25% weight each";
  if (curriculumType === "TERM") return "Will create 3 terms with balanced default weights";
  return "Will create 2 semesters with 50% weight each";
};

const AcademicYearForm = ({ type, data }: AcademicYearFormProps) => {
  const { user } = useAuth();
  const schoolId = user?.schoolId;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: data?.name || "2026-2027",
    startDate: data?.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "",
    endDate: data?.endDate ? new Date(data.endDate).toISOString().split('T')[0] : "",
    curriculumType: data?.curriculumType || "SEMESTER",
  });

  // Fetch current curriculum type from school settings for default
  const { data: settingsData } = useQuery({
    queryKey: ['school-settings-curriculum-form', schoolId],
    queryFn: async () => {
      if (!schoolId) return { data: {} };
      try {
        const response = await schoolSettingsAPI.getAll(schoolId);
        return response;
      } catch (error) {
        return { data: {} };
      }
    },
    enabled: !!schoolId && type === "create",
  });

  // Set default curriculum type from school settings on mount
  useEffect(() => {
    if (type === "create" && settingsData?.data?.CURRICULUM_TYPE && !data) {
      setFormData(prev => ({
        ...prev,
        curriculumType: settingsData.data.CURRICULUM_TYPE || "SEMESTER"
      }));
    }
  }, [settingsData, type, data]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === "create") {
        return academicYearsAPI.create(formData);
      } else {
        return academicYearsAPI.update(data.id, formData);
      }
    },
    onSuccess: () => {
      toast.success(
        type === "create" ? "Academic year created successfully" : "Academic year updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${type} academic year`);
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

  const handleActivate = async () => {
    if (!data?.id) return;
    setLoading(true);
    try {
      await academicYearsAPI.activate(data.id);
      toast.success("Academic year activated successfully");
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to activate academic year");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-4">
        <InputField
          label="Academic Year Name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., 2026-2027"
        />
        {type === "create" && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Curriculum System</label>
            <select
              value={formData.curriculumType}
              onChange={(e) => setFormData({ ...formData, curriculumType: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SEMESTER">Semester (2 Terms)</option>
              <option value="TERM">Term (3 Terms)</option>
              <option value="QUARTER">Quarter (4 Terms)</option>
            </select>
            <p className="text-xs text-gray-500">
              {getCurriculumHint(formData.curriculumType)}
            </p>
          </div>
        )}
        <InputField
          label="Start Date"
          name="startDate"
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
        />
        <InputField
          label="End Date"
          name="endDate"
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          required
        />
        {data?.isActive && (
          <div className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm">
            ✓ This academic year is currently active
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-3 mt-6">
        {type === "update" && !data?.isActive && (
          <button
            type="button"
            onClick={handleActivate}
            disabled={loading || mutation.isPending}
            className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Activating..." : "Activate"}
          </button>
        )}
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

export default AcademicYearForm;
