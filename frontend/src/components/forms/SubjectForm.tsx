"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SubjectFormProps {
  type: "create" | "update";
  data?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SubjectForm = ({ type, data, onSuccess, onCancel }: SubjectFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: data?.name || "",
    code: data?.code || "",
    isActive: data?.isActive !== undefined ? data.isActive : true,
    description: data?.description || "",
    grade: data?.grade || "",
    credits: data?.credits || "",
    colorCode: data?.colorCode || "#3B82F6",
  });

  const getSchoolId = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.schoolId || "";
    }
    return "";
  };

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === "create") {
        return subjectsAPI.create({
          schoolId: getSchoolId(),
          name: formData.name,
          code: formData.code || undefined,
          isActive: formData.isActive,
          description: formData.description || undefined,
          academicYearId: data?.academicYearId,
        });
      } else {
        return subjectsAPI.update(data.id, {
          name: formData.name,
          code: formData.code || undefined,
          isActive: formData.isActive,
          description: formData.description || undefined,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        type === "create" ? "Subject created successfully" : "Subject updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.academic });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${type} subject`);
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

  const colorOptions: string[] = [];

  return (
    <>
      <form onSubmit={handleSubmit} className="font-sans" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
      <div className="space-y-5">
        {/* Subject Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Mathematics, Science"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)] focus:border-transparent transition-all"
            />
          </div>

          {/* Code and Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Subject Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., MATH, SCI"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Status
              </label>
              <div className="flex items-center gap-3 h-10 px-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  className="data-[state=checked]:bg-green-500"
                />
                <span className={`text-sm font-medium ${formData.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter subject description (optional)"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Grade Range and Credits Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Grade Range
              </label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)] focus:border-transparent transition-all"
              >
                <option value="">Select grade range</option>
                <option value="1-5">Grades 1-5</option>
                <option value="5-10">Grades 5-10</option>
                <option value="5-12">Grades 5-12</option>
                <option value="1-8">Grades 1-8</option>
                <option value="1-10">Grades 1-10</option>
                <option value="1-12">Grades 1-12</option>
                <option value="9-12">Grades 9-12</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Credits <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                placeholder="e.g., 3, 4"
                min={0}
                step={0.5}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t dark:border-slate-700">
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
            className="px-6 py-2.5 text-white bg-[var(--brand-color,#e35336)] rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading || mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              type === "create" ? "Create Subject" : "Update Subject"
            )}
          </button>
        </div>
      </form>
    </>
  );
};

export default SubjectForm;
