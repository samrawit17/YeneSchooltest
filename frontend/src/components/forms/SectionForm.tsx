"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sectionsAPI, classesAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import InputField from "@/components/InputField";

interface SectionFormProps {
  type: "create" | "update";
  data?: any;
}

const SectionForm = ({ type, data }: SectionFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    classId: data?.classId || "",
    name: data?.name || "",
    capacity: data?.capacity || 30, // Initial default, will be updated by settings
    roomNumber: data?.roomNumber || "",
  });
  const [classes, setClasses] = useState<any[]>([]);

  // Fetch school settings for default section capacity
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
        const response = await classesAPI.getAll();
        setClasses(response.data);
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, []);

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
      // Error handled by mutation
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Class</label>
          <select
            value={formData.classId}
            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name || `Grade ${cls.grade}`} - {cls.academicYear?.name || cls.academicYearId} ({cls.section})
              </option>
            ))}
          </select>
        </div>
        <InputField
          label="Section Name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Enter section name (e.g., A, B, C)"
        />
        <InputField
          label="Capacity"
          name="capacity"
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
          required
          placeholder="Enter section capacity"
          inputProps={{ min: 1, max: 100 }}
        />
        <InputField
          label="Room Number"
          name="roomNumber"
          type="text"
          value={formData.roomNumber}
          onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
          placeholder="Enter room number (optional)"
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

export default SectionForm;
