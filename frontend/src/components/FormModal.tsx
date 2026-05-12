"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  UserPlus, 
  GraduationCap, 
  FileText, 
  Building2, 
  Users,
  AlertTriangle,
  Loader2,
  Calendar
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { communicationsAPI } from "@/lib/api/communications";
import { announcementsAPI, eventsAPI } from "@/lib/api/content";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

// Lazy load forms for better performance
const EnrollmentForm = dynamic(() => import("./forms/EnrollmentForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const SchoolForm = dynamic(() => import("./forms/SchoolForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const SectionForm = dynamic(() => import("./forms/SectionForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const AcademicYearForm = dynamic(() => import("./forms/AcademicYearForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const TermForm = dynamic(() => import("./forms/TermForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const TimetableSlotForm = dynamic(() => import("./forms/TimetableSlotForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const ClassSubjectForm = dynamic(() => import("./forms/ClassSubjectForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const UnifiedStaffForm = dynamic(() => import("./forms/UnifiedStaffForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const UnifiedStudentForm = dynamic(() => import("./forms/UnifiedStudentForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const ParentChildLinkForm = dynamic(() => import("./forms/ParentChildLinkForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});
const EventForm = dynamic(() => import("./forms/EventForm"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)] mx-auto" />
      <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Loading form...</p>
    </div>
  ),
});

const forms: {
  [key: string]: (type: string, data?: any, onClose?: () => void) => React.ReactNode;
} = {
  teacher: (type, data, onClose) => {
    if (type === "create") {
      return <UnifiedStaffForm mode="create" onSuccess={onClose} />;
    }
    // For update, use UnifiedStaffForm with mode="update"
    return (
      <UnifiedStaffForm 
        mode="update" 
        initialData={data} 
        onSuccess={onClose} 
        onCancel={onClose}
      />
    );
  },
  student: (type, data, onClose) => {
    if (type === "create") {
      return <UnifiedStudentForm mode="create" onSuccess={onClose} />;
    }
    // For update, use UnifiedStudentForm with mode="update"
    return (
      <UnifiedStudentForm 
        mode="update" 
        initialData={data} 
        onSuccess={onClose} 
        onCancel={onClose}
      />
    );
  },
  parent: (type, data, onClose) => {
    if (type === "create") {
      return <UnifiedStaffForm mode="create" onSuccess={onClose} />;
    }
    return (
      <UnifiedStaffForm 
        mode="update" 
        initialData={data} 
        onSuccess={onClose} 
        onCancel={onClose}
      />
    );
  },
  enrollment: (type, data) => (
    // @ts-expect-error - Type mismatch expected for form props
    <EnrollmentForm type={type} data={data} />
  ),
  school: (type, data) => (
    // @ts-expect-error - Type mismatch expected for form props
    <SchoolForm type={type} data={data} />
  ),
  user: (type, data, onClose) => {
    if (type === "create") {
      return <UnifiedStaffForm mode="create" onSuccess={onClose} />;
    }
    return (
      <UnifiedStaffForm 
        mode="update" 
        initialData={data} 
        onSuccess={onClose} 
        onCancel={onClose}
      />
    );
  },
  class: (type, data, onClose) => (
    // @ts-expect-error - Type mismatch expected for form props
    <ClassForm type={type} data={data} onSuccess={onClose} onCancel={onClose} />
  ),
  section: (type, data, onClose) => (
    // @ts-expect-error - Type mismatch expected for form props
    <SectionForm type={type} data={data} onSuccess={onClose} onCancel={onClose} />
  ),
  academic_year: (type, data) => (
    // @ts-expect-error - Type mismatch expected for form props
    <AcademicYearForm type={type} data={data} />
  ),
  term: (type, data) => (
    // @ts-expect-error - Type mismatch expected for form props
    <TermForm type={type} data={data} />
  ),
  "timetable-slot": (type, data) => (
    // @ts-expect-error - Type mismatch expected for form props
    <TimetableSlotForm type={type} data={data} />
  ),
  subject: (type, data, onClose) => (
    // @ts-expect-error - Type mismatch expected for form props
    <SubjectForm type={type} data={data} onSuccess={onClose} onCancel={onClose} />
  ),
  "class-subject": (type, data) => (
    // @ts-expect-error - Type mismatch expected for form props
    <ClassSubjectForm type={type} data={data} />
  ),
  parent_student: (type, data, onClose) => {
    if (type === "create") {
      return <UnifiedStaffForm mode="create" onSuccess={onClose} />;
    }
    return (
      <UnifiedStaffForm 
        mode="update" 
        initialData={data} 
        onSuccess={onClose} 
        onCancel={onClose}
      />
    );
  },
  parent_child_link: (type, data, onClose) => (
    <ParentChildLinkForm
      isOpen={true}
      onClose={onClose || (() => {})}
      mode={(type as "link" | "manage") || "link"}
      parentData={data?.parentData}
      studentData={data?.studentData}
      onSuccess={onClose}
    />
  ),
  staff: (type, data, onClose) => (
    <UnifiedStaffForm 
      mode={type === "create" ? "create" : "update"}
      schoolId={data?.schoolId} 
      schoolCode={data?.schoolCode}
      initialData={type === "update" ? data : undefined}
      onSuccess={onClose}
      onCancel={onClose}
      allowedRoles={["TEACHER", "IT_MANAGER", "REGISTRAR", "FINANCE"]}
    />
  ),
  student_unified: (type, data, onClose) => (
    <UnifiedStudentForm 
      mode={type === "create" ? "create" : "update"}
      schoolId={data?.schoolId} 
      schoolCode={data?.schoolCode}
      initialData={type === "update" ? data : undefined}
      onSuccess={onClose}
      onCancel={onClose}
    />
  ),
  event: (type, data, onClose) => (
    <EventForm 
      initialData={type === "update" ? data : undefined}
      onSuccess={onClose}
      onCancel={onClose}
    />
  ),
};

interface FormModalProps {
  table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "section"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "attendance"
    | "event"
    | "announcement"
    | "enrollment"
    | "school"
    | "user"
    | "academic_year"
    | "term"
    | "timetable-slot"
    | "parent_student"
    | "parent_child_link"
    | "staff"
    | "student_unified";
  type: "create" | "update" | "delete" | "link";
  data?: any;
  id?: string | number;
  title?: string;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  children?: React.ReactNode;
}

const FormModal = ({
  table,
  type,
  data,
  id,
  title,
  isOpen: externalOpen,
  setIsOpen: externalSetOpen,
  children,
}: FormModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalSetOpen || setInternalOpen;

  useEffect(() => {
    setMounted(true);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string | number }) => {
      switch (table) {
        case 'event':
          return eventsAPI.delete(id.toString());
        case 'announcement':
          return announcementsAPI.delete(id.toString());
        case 'communication':
          return communicationsAPI.delete(id.toString());
        default:
          throw new Error(`Delete not supported for ${table}`);
      }
    },
    onSuccess: () => {
      toast.success(`${table} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: (table as string) === 'communication' ? queryKeys.communications.all : queryKeys[table as keyof typeof queryKeys]?.all ?? [table + 's'] });
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to delete ${table}`);
    },
  });

  const handleDelete = (id: string | number) => {
    deleteMutation.mutate({ table, id });
  };

  const getTableIcon = () => {
    switch (table) {
      case "teacher":
      case "user":
        return <Users className="w-5 h-5" />;
      case "student":
        return <GraduationCap className="w-5 h-5" />;
      case "parent":
      case "parent_student":
        return <Users className="w-5 h-5" />;
      case "enrollment":
        return <FileText className="w-5 h-5" />;
      case "school":
        return <Building2 className="w-5 h-5" />;
      case "academic_year":
        return <Calendar className="w-5 h-5" />;
      case "term":
        return <Calendar className="w-5 h-5" />;
      case "timetable-slot":
        return <Calendar className="w-5 h-5" />;
      default:
        return <UserPlus className="w-5 h-5" />;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case "create":
        return <Plus className="w-4 h-4" />;
      case "update":
        return <Edit2 className="w-4 h-4" />;
      case "delete":
        return <Trash2 className="w-4 h-4" />;
    }
  };

  const bgColor =
    type === "create"
      ? "bg-[var(--brand-color,#e35336)] hover:bg-[var(--brand-color,#e35336)] hover:opacity-90"
      : type === "update"
      ? "bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
      : "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700";

  const iconColor = "text-white";

  const FormContent = () => {
    if (children) {
      return children;
    }

    if (type === "delete" && id) {
      return (
        <div className="p-6 md:p-8 flex flex-col gap-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Confirm Deletion
            </p>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Are you sure you want to delete this {table}? This action cannot be undone.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
            <button
              onClick={() => setOpen(false)}
              className="px-5 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleDelete(id)}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </button>
          </div>
        </div>
      );
    }
    
    if (type === "create" || type === "update" || type === "link") {
      const FormComponent = forms[table];
      if (FormComponent) {
        return FormComponent(type, data, () => setOpen(false));
      }
      return (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-600 dark:text-gray-300" />
          </div>
          <p className="text-gray-900 dark:text-gray-100 font-bold">Form Not Available</p>
          <p className="text-gray-600 dark:text-gray-400 font-medium mt-1">
            Form for {table} is currently under development
          </p>
        </div>
      );
    }
    
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-gray-600 dark:text-gray-300" />
        </div>
        <p className="text-gray-900 dark:text-gray-100 font-bold">Invalid Form Type</p>
        <p className="text-gray-600 dark:text-gray-400 font-medium mt-1">
          Form type not supported
        </p>
      </div>
    );
  };
    
  // Table label mapping
  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      event: "Activity",
    };
    return labels[table] || table;
  };

  // Table description mapping
  const getTableDescription = (table: string, type: string) => {
    const descriptions: Record<string, Record<string, string>> = {
      event: {
        create: "Enter activity details below",
        update: "Edit existing information",
      },
    };
    return descriptions[table]?.[type] || 
      (type === "create" ? "Fill in the details below" : "Edit existing information");
  };

  // If title is provided, render as modal directly
  if (title) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen && onClose) onClose();
      setOpen(nextOpen);
    }}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden" customCloseButton={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--brand-color,#e35336)] rounded-xl flex items-center justify-center shadow-md">
              {getTableIcon()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {type === "create" ? "Create New" : type === "update" ? "Update" : "Delete"} {getTableLabel(table)}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getTableDescription(table, type)}
              </p>
            </div>
</div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        {/* Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="p-5">
            <FormContent />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

  // Otherwise, render as button that opens modal
  const modalContent = (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border bg-white font-sans shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--brand-color,#e35336)] rounded-xl flex items-center justify-center shadow-md">
              {getTableIcon()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {type === "create" ? "Create New" : type === "update" ? "Update" : "Delete"} {getTableLabel(table)}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getTableDescription(table, type)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        {/* Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="p-5">
            <FormContent />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        className={`${bgColor} ${iconColor} w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all duration-200 shadow-md hover:shadow-lg`}
        onClick={() => setOpen(true)}
        title={type.charAt(0).toUpperCase() + type.slice(1) + " " + table}
        aria-label={`${type} ${table}`}
      >
        {getTypeIcon()}
      </button>
      {open && mounted ? createPortal(modalContent, document.body) : null}
    </>
  );
};

export default FormModal;
