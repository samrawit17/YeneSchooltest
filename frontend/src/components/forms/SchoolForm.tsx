"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { 
  Building2, 
  Mail, 
  MapPin, 
  Phone, 
  Save, 
  Loader2,
  CheckCircle
} from "lucide-react";

interface SchoolFormProps {
  type: "create" | "update";
  data?: any;
  onSuccess?: () => void;
}

const SchoolForm = ({ type, data, onSuccess }: SchoolFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: data?.name || "",
    email: data?.email || "",
    address: data?.address || "",
    phone: data?.phone || "",
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === "create") {
        return schoolsAPI.create(formData);
      } else {
        return schoolsAPI.update(data.id, formData);
      }
    },
    onSuccess: (response) => {
      toast.success(type === "create" ? "School created successfully" : "School updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.all });
      if (type === "update" && data?.id) {
        const updatedSchool = response.data || { ...data, ...formData };
        const updateSchool = (current: any) =>
          current ? { ...current, ...updatedSchool } : current;

        queryClient.setQueryData(queryKeys.school.layout(data.id), updateSchool);
        queryClient.setQueryData(queryKeys.school.detail(data.id), updateSchool);
        queryClient.setQueryData(queryKeys.schools.detail(data.id), updateSchool);
        queryClient.invalidateQueries({ queryKey: queryKeys.school.layout(data.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.school.detail(data.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.schools.detail(data.id) });
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${type} school`);
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

      {/* Form Fields */}
      <div className="space-y-5">
        {/* School Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            School Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter school name"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="Enter school email"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none top-3">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter school address"
              rows={3}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={loading || mutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {type === "create" ? "Create School" : "Update School"}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default SchoolForm;
