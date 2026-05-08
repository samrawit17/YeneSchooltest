"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classesAPI, subjectsAPI, teachersAPI } from "@/lib/api";
import { classSubjectsAPI } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import InputField from "@/components/InputField";

interface ClassSubjectFormProps {
  type: "create" | "update";
  data?: any;
}

const ClassSubjectForm = ({ type, data }: ClassSubjectFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    classId: data?.classId || "",
    sectionId: data?.sectionId || "",
    subjectId: data?.subjectId || "",
    academicYearId: data?.academicYearId || "",
    teacherId: data?.teacherId || "",
  });

  const queryClient = useQueryClient();

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: queryKeys.academicYears.all,
    queryFn: async () => {
      const response = await classesAPI.getAll();
      // Get unique academic years from classes
      const yearsMap = new Map();
      response.data.forEach((cls: any) => {
        if (cls.academicYear && !yearsMap.has(cls.academicYearId)) {
          yearsMap.set(cls.academicYearId, cls.academicYear);
        }
      });
      return Array.from(yearsMap.entries()).map(([id, name]) => ({ id, name }));
    },
  });

  // Fetch classes when academic year is selected
  const { data: classes } = useQuery({
    queryKey: queryKeys.classes.byAcademicYear(formData.academicYearId),
    queryFn: async () => {
      if (!formData.academicYearId) return [];
      const response = await classesAPI.getAll({ academicYearId: formData.academicYearId });
      return response.data;
    },
    enabled: !!formData.academicYearId,
  });

  // Fetch sections when class is selected
  const [sections, setSections] = useState<any[]>([]);
  useEffect(() => {
    const selectedClass = classes?.find((c: any) => c.id === formData.classId);
    if (selectedClass) {
      setSections(selectedClass.sections || []);
    } else {
      setSections([]);
    }
  }, [classes, formData.classId]);

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: queryKeys.subjects.all,
    queryFn: async () => {
      const response = await subjectsAPI.getAll();
      return response.data;
    },
  });

  // Fetch teachers
  const { data: teachers } = useQuery({
    queryKey: queryKeys.teachers.all,
    queryFn: async () => {
      const response = await teachersAPI.getAll();
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === "create") {
        return classSubjectsAPI.create(formData);
      } else {
        return classSubjectsAPI.update(data.id, { teacherId: formData.teacherId });
      }
    },
    onSuccess: () => {
      toast.success(
        type === "create" ? "Subject assigned successfully" : "Assignment updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.classSubjects.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${type} assignment`);
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
          <label className="text-sm font-medium text-gray-700">Academic Year</label>
          <select
            value={formData.academicYearId}
            onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value, classId: "", sectionId: "" })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Academic Year</option>
            {academicYears?.map((year: any) => (
              <option key={year.id} value={year.id}>
                {typeof year.name === 'object' ? year.name.name : year.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Class</label>
          <select
            value={formData.classId}
            onChange={(e) => setFormData({ ...formData, classId: e.target.value, sectionId: "" })}
            required
            disabled={!formData.academicYearId}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select Class</option>
            {classes?.map((cls: any) => (
              <option key={cls.id} value={cls.id}>
                {cls.name || `Grade ${cls.grade}`} - Section {cls.section}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Section</label>
          <select
            value={formData.sectionId}
            onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
            required
            disabled={!formData.classId}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select Section</option>
            {sections.map((section: any) => (
              <option key={section.id} value={section.id}>
                {section.name} (Capacity: {section.capacity})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Subject</label>
          <select
            value={formData.subjectId}
            onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Subject</option>
            {subjects?.map((subject: any) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} {subject.code && `(${subject.code})`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Teacher (Optional)</label>
          <select
            value={formData.teacherId}
            onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Teacher</option>
            {teachers?.map((teacher: any) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} ({teacher.email})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Assign a teacher to this subject for the class</p>
        </div>
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
            type === "create" ? "Assign Subject" : "Update"
          )}
        </button>
      </div>
    </form>
  );
};

export default ClassSubjectForm;
