"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { termsAPI, academicYearsAPI, schoolSettingsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import InputField from "@/components/InputField";

interface TermFormProps {
  type: "create" | "update";
  data?: any;
  academicYearId?: string;
}

const getPeriodMeta = (curriculumType: string) => {
  if (curriculumType === "QUARTER") {
    return { label: "Quarter", plural: "Quarters", max: 4 };
  }
  if (curriculumType === "TERM") {
    return { label: "Term", plural: "Terms", max: 3 };
  }
  return { label: "Semester", plural: "Semesters", max: 2 };
};

const TermForm = ({ type, data, academicYearId }: TermFormProps) => {
  const { user } = useAuth();
  const schoolId = user?.schoolId;
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [termOptions, setTermOptions] = useState<number[]>([1, 2]);
  
  // Determine default name based on curriculum type
  const getDefaultTermName = (order: number, curriculumType: string) => {
    const { label } = getPeriodMeta(curriculumType);
    return `${label} ${order}`;
  };
  
  const [formData, setFormData] = useState({
    academicYearId: data?.academicYearId || academicYearId || "",
    name: data?.name || "Semester 1",
    startDate: data?.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "",
    endDate: data?.endDate ? new Date(data.endDate).toISOString().split('T')[0] : "",
    order: data?.order || 1,
  });

  const queryClient = useQueryClient();

  // Fetch curriculum type from school settings
  const { data: settingsData } = useQuery({
    queryKey: queryKeys.school.curriculumTermForm(schoolId),
    queryFn: async () => {
      if (!schoolId) return { data: {} };
      try {
        const response = await schoolSettingsAPI.getAll(schoolId);
        return response;
      } catch (error) {
        return { data: {} };
      }
    },
    enabled: !!schoolId,
  });

  // Determine curriculum type (default to SEMESTER)
  // Handle JSON string values from database
  let curriculumType = settingsData?.data?.CURRICULUM_TYPE || settingsData?.data?.curriculum_type || 'SEMESTER';
  if (curriculumType && typeof curriculumType === 'string') {
    try {
      curriculumType = JSON.parse(curriculumType);
    } catch {
      // Keep as is if not JSON
    }
  }
  const periodMeta = getPeriodMeta(curriculumType);
  const periodLabel = periodMeta.label;

  // Fetch academic years for dropdown
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const response = await academicYearsAPI.getAll();
        setAcademicYears(response.data);
      } catch (error) {
        console.error("Failed to fetch academic years:", error);
      }
    };
    fetchAcademicYears();
  }, []);

  // Update term options based on curriculum type
  useEffect(() => {
    setTermOptions(Array.from({ length: periodMeta.max }, (_, i) => i + 1));
  }, [curriculumType]);

  // Update default name when curriculum type changes or on mount
  useEffect(() => {
    if (type === "create" && !data?.name) {
      const defaultName = getDefaultTermName(formData.order, curriculumType);
      setFormData(prev => ({ ...prev, name: defaultName }));
    }
  }, [curriculumType, type, data]);

  // Handle academic year change to get curriculum type from academic year
  const handleAcademicYearChange = async (newAcademicYearId: string) => {
    setFormData(prev => ({ ...prev, academicYearId: newAcademicYearId }));
    
    // Fetch curriculum type from the selected academic year
    if (newAcademicYearId) {
      try {
        const yearResponse = await academicYearsAPI.getById(newAcademicYearId);
        const yearCurriculumType = yearResponse.data?.curriculumType || curriculumType;
        const maxTerms = getPeriodMeta(yearCurriculumType).max;
        setTermOptions(Array.from({ length: maxTerms }, (_, i) => i + 1));
        setFormData(prev => ({ 
          ...prev, 
          academicYearId: newAcademicYearId,
          order: 1,
          name: getDefaultTermName(1, yearCurriculumType)
        }));
      } catch (error) {
        console.error("Failed to fetch academic year:", error);
      }
    }
  };

  // Handle order change to update default name
  const handleOrderChange = (newOrder: number) => {
    const defaultName = getDefaultTermName(newOrder, curriculumType);
    setFormData(prev => ({ 
      ...prev, 
      order: newOrder,
      name: defaultName
    }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === "create") {
        return termsAPI.create(formData);
      } else {
        return termsAPI.update(data.id, formData);
      }
    },
    onSuccess: () => {
      toast.success(
        type === "create" ? `${periodLabel} created successfully` : `${periodLabel} updated successfully`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${type} ${periodLabel.toLowerCase()}`);
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
      <div className="space-y-4">
        {type === "create" && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Academic Year</label>
            <select
              value={formData.academicYearId}
              onChange={(e) => handleAcademicYearChange(e.target.value)}
              required
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((year: any) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {type === "create" && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">{periodLabel}</label>
            <select
              value={formData.order}
              onChange={(e) => handleOrderChange(parseInt(e.target.value))}
              required
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {termOptions.map((num) => (
                <option key={num} value={num}>
                  {periodLabel} {num}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Select {periodLabel.toLowerCase()} number - name will be auto-populated
            </p>
          </div>
        )}
        
        <InputField
          label={`${periodLabel} Name`}
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder={`e.g., ${periodLabel} 1, ${periodLabel} 2`}
        />
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
        {type === "update" && (
          <InputField
            label="Order"
            name="order"
            type="number"
            value={formData.order}
            onChange={(e) => handleOrderChange(parseInt(e.target.value))}
            required
            placeholder="e.g., 1, 2, 3"
            inputProps={{ min: 1 }}
          />
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

export default TermForm;
