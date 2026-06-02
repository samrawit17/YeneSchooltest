"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { parentsAPI, studentsAPI } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";

interface RecipientOption {
  id: string;
  name: string;
  className?: string;
  section?: string;
  childName?: string;
  subjectNames?: string[];
  relationType?: "HOMEROOM" | "TEACHING";
  targetStudentId?: string;
  targetUserId?: string;
}

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (targetUserId: string, subject: string, message: string) => void;
  isSending: boolean;
  preselectedStudentId?: string | null;
  preselectedStudentName?: string | null;
  isParent?: boolean;
  isTeacher?: boolean;
}

export default function NewMessageModal({
  isOpen,
  onClose,
  onSubmit,
  isSending,
  preselectedStudentId,
  preselectedStudentName,
  isParent,
  isTeacher,
}: NewMessageModalProps) {
  const { t } = useTranslations<any>("communications");
  const [studentId, setStudentId] = useState(preselectedStudentId || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState<RecipientOption[]>([]);
  const [allStudents, setAllStudents] = useState<RecipientOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchStudents = async (queryOverride?: string) => {
    try {
      setLoadingStudents(true);
      if (isParent) {
        const response = await parentsAPI.getRelatedTeachers();
        const teachers = response.data?.teachers || response.data || [];
        const mapped = teachers
          .filter((teacher: any) => teacher.relationType === "HOMEROOM")
          .map((teacher: any) => ({
            id: `${teacher.studentId}:${teacher.teacherId}:${teacher.relationType}`,
            name: teacher.teacherName,
            childName: teacher.childName,
            className: teacher.className,
            section: teacher.section,
            subjectNames: Array.isArray(teacher.subjects) ? teacher.subjects : [],
            relationType: teacher.relationType,
            targetStudentId: teacher.studentId,
            targetUserId: teacher.teacherId,
          }));

        const query = (queryOverride ?? searchQuery).trim().toLowerCase();
        const filtered = mapped.filter(
          (teacher: RecipientOption) =>
            !query ||
            teacher.name.toLowerCase().includes(query) ||
            teacher.childName?.toLowerCase().includes(query) ||
            teacher.className?.toLowerCase().includes(query) ||
            teacher.subjectNames?.some((subject) =>
              subject.toLowerCase().includes(query),
            ),
        );

        setAllStudents(mapped);
        setStudents(filtered);
        setShowDropdown(true);
      } else if (isTeacher) {
        const response = await studentsAPI.getAll({
          search: queryOverride ?? searchQuery,
          limit: "200",
        });
        const data = response.data?.data || [];
        const fetched = data.map((student: any) => ({
          id: student.userId || student.user?.id || student.id,
          name: student.user?.name || student.name,
          className: student.className,
          section: student.section,
        }));
        setAllStudents(fetched);
        setStudents(fetched);
        setShowDropdown(true);
      } else {
        const response = await studentsAPI.getAll({ search: searchQuery, limit: "50" });
        const data = response.data?.data || response.data || [];
        const mapped = data.map((student: any) => ({
          id: student.userId || student.user?.id || student.id,
          name: student.user?.name || student.name,
          className: student.className || student.class?.name,
          section: student.section || student.class?.section,
        }));
        setAllStudents(mapped);
        setStudents(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const filterStudents = (query: string) => {
    if (isTeacher) {
      fetchStudents(query);
      return;
    }

    if (!query.trim()) {
      setStudents(allStudents);
      return;
    }

    const normalizedQuery = query.toLowerCase();
    setStudents(
      allStudents.filter(
        (student) =>
          student.name.toLowerCase().includes(normalizedQuery) ||
          student.className?.toLowerCase().includes(normalizedQuery) ||
          student.childName?.toLowerCase().includes(normalizedQuery) ||
          student.subjectNames?.some((subject) =>
            subject.toLowerCase().includes(normalizedQuery),
          ),
      ),
    );
  };

  useEffect(() => {
    if (!isOpen) return;

    setStudentId(preselectedStudentId || "");
    setSubject("");
    setMessage("");
    setSearchQuery("");
    setShowDropdown(false);

    if (preselectedStudentId) {
      return;
    }

    setStudents([]);
    setAllStudents([]);
    if (isTeacher) {
      fetchStudents();
    }
  }, [isOpen, preselectedStudentId, isTeacher]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = () => {
    const selectedRecipient =
      students.find((student) => student.id === studentId) ||
      allStudents.find((student) => student.id === studentId);
    const targetUserId =
      selectedRecipient?.targetUserId ||
      selectedRecipient?.targetStudentId ||
      studentId;

    const trimmedTargetUserId = targetUserId.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTargetUserId || !trimmedSubject || !trimmedMessage) {
      toast.error(
        isParent
          ? "Please fill in all fields and select a teacher"
          : "Please fill in all fields and select a student",
      );
      return;
    }

    onSubmit(trimmedTargetUserId, trimmedSubject, trimmedMessage);
  };

  const selectedStudent = students.find((student) => student.id === studentId);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-color,#e35336)]">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.actions.newMessage}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isParent
                  ? "Send a message to your child's teacher"
                  : isTeacher
                    ? "Send a message about a student to their parent"
                    : "Send a message to a parent"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
          <div ref={dropdownRef} className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isParent ? t.fields.selectTeacher : t.fields.selectStudent} <span className="text-red-500">*</span>
            </label>
            {preselectedStudentId ? (
              <div className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-700">
                <span className="font-medium text-slate-900 dark:text-white">
                  {preselectedStudentName || t.states.studentSelected}
                </span>
              </div>
            ) : (
              <div
                className="relative cursor-pointer"
                onMouseEnter={() => {
                  if (isTeacher && allStudents.length > 0) setShowDropdown(true);
                }}
                onMouseLeave={() => {
                  if (isTeacher) setShowDropdown(false);
                }}
              >
                <input
                  type="text"
                  placeholder={
                    isParent
                      ? t.placeholders.searchTeacher
                      : isTeacher
                        ? allStudents.length > 0
                          ? `Search in ${allStudents.length} assigned students...`
                          : "Click or hover to see students from your assigned classes..."
                        : t.placeholders.searchStudent
                  }
                  value={searchQuery}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearchQuery(value);
                    setShowDropdown(true);
                    if (isTeacher) {
                      filterStudents(value);
                    } else if (allStudents.length > 0) {
                      filterStudents(value);
                    }
                  }}
                  onFocus={() => {
                    setShowDropdown(true);
                    if (allStudents.length === 0) {
                      fetchStudents();
                    } else if (isTeacher) {
                      setStudents(allStudents);
                    }
                  }}
                  className="w-full cursor-pointer rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)]/40 dark:bg-slate-700 dark:text-white"
                />
                {loadingStudents && (
                  <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[var(--brand-color,#e35336)]" />
                )}
                {!loadingStudents && isTeacher && allStudents.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-400 dark:bg-slate-600">
                    {allStudents.length} students
                  </span>
                )}
                {showDropdown && students.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-64 overflow-y-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {isTeacher ? t.states.assignedStudents : t.states.searchResults}
                      </p>
                    </div>
                    {students.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => {
                          setStudentId(student.id);
                          setSearchQuery(student.name);
                          setShowDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                          studentId === student.id ? "bg-[rgba(var(--brand-color-rgb),0.08)]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-color,#e35336)] text-sm font-medium text-white">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <span className="block font-medium text-slate-900 dark:text-white">{student.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {student.className && student.section
                                ? `${student.className} - Section ${student.section}`
                                : student.childName || ""}
                              {!student.className && student.subjectNames?.length
                                ? `${student.childName ? " • " : ""}${student.subjectNames.join(", ")}`
                                : ""}
                              {student.className && student.subjectNames?.length
                                ? ` • ${student.subjectNames.join(", ")}`
                                : ""}
                              {student.relationType
                                ? ` • ${student.relationType === "HOMEROOM" ? "Homeroom" : "Teaching"}`
                                : ""}
                            </span>
                          </div>
                        </div>
                        {studentId === student.id && <CheckCircle className="h-5 w-5 text-[var(--brand-color,#e35336)]" />}
                      </button>
                    ))}
                  </div>
                )}
                {!loadingStudents && students.length === 0 && allStudents.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400">{t.states.noMatches}</p>
                  </div>
                )}
                {!loadingStudents && isTeacher && allStudents.length === 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                      You don't have any students in your assigned classes
                    </p>
                  </div>
                )}
              </div>
            )}
            {selectedStudent && (
              <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                {t.states.selected}: {selectedStudent.name}
              </p>
            )}
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t.fields.subject} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={t.placeholders.enterSubject}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)]/40 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t.fields.message} <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder={t.placeholders.writeMessage}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              className="w-full resize-none rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)]/40 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {t.actions.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSending || !studentId || !subject.trim() || !message.trim()}
            className="flex items-center gap-2 rounded-xl bg-[var(--brand-color,#e35336)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
