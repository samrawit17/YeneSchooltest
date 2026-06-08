"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle,
  FileCheck,
  GraduationCap,
  Loader2,
  Maximize,
  Minimize,
  Printer,
  Save,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { registrarAPI, studentsAPI } from "@/lib/api";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { formatDateByCalendarType } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StudentRow = {
  id?: string;
  userId?: string;
  studentId?: string;
  studentCode?: string;
  name?: string;
  email?: string;
  className?: string;
  section?: string;
  rollNumber?: string;
  enrollmentStatus?: string;
  academicYear?: string;
  gender?: string;
  phone?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  enrollment?: {
    academicYear?: string;
    grade?: number;
    status?: string;
  };
};

type IssueForm = {
  issueDate: string;
  leavingDate: string;
  reason: string;
  destinationSchool: string;
  destinationRegion: string;
  lastGradeCompleted: string;
  conduct: string;
  attendanceSummary: string;
  academicStanding: string;
  remarks: string;
};

const defaultForm: IssueForm = {
  issueDate: format(new Date(), "yyyy-MM-dd"),
  leavingDate: format(new Date(), "yyyy-MM-dd"),
  reason: "Transfer to another school",
  destinationSchool: "",
  destinationRegion: "",
  lastGradeCompleted: "",
  conduct: "Good",
  attendanceSummary: "Satisfactory",
  academicStanding: "Eligible to continue education",
  remarks: "",
};

const PAGE_REQUEST_OPTIONS = { skipAuthErrorRedirect: true };
const SCHOOL_LEAVING_ROLES = new Set(["ADMIN", "IT_MANAGER", "REGISTRAR"]);

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const resolveStudents = (payload: any): StudentRow[] => {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.students)) return data.students;
  return [];
};

const getStudentUserId = (student: StudentRow) =>
  student.user?.id || student.userId || student.studentId || student.id || "";

const getStudentName = (student?: StudentRow | null) =>
  student?.user?.name || student?.name || "Selected student";

const getStudentEmail = (student?: StudentRow | null) =>
  student?.user?.email || student?.email || "";

const getStudentCode = (student?: StudentRow | null) =>
  student?.studentCode || student?.studentId || student?.id || "-";

const getPlacement = (student?: StudentRow | null) =>
  [student?.className, student?.section ? `Section ${student.section}` : null]
    .filter(Boolean)
    .join(" - ") || "-";

const parseDateValue = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const formatDateValue = (date: Date | undefined) => date ? format(date, "yyyy-MM-dd") : "";

export default function SchoolLeavingIssuePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { currentAcademicYear, displayTermName } = useAcademicYear();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<IssueForm>(defaultForm);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issuedReference, setIssuedReference] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const normalizedRole = user?.role?.toUpperCase() || "";
  const canAccessSchoolLeaving =
    SCHOOL_LEAVING_ROLES.has(normalizedRole) && Boolean(user?.schoolId);

  useEffect(() => {
    const onFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullScreenChange);
  }, []);

  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error("Full screen request was denied.");
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/sign-in");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !canAccessSchoolLeaving || search.trim().length < 2) {
      setStudents([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        setLoadingStudents(true);
        const response = await studentsAPI.getAll({
          search: search.trim(),
          academicYearId: currentAcademicYear?.id,
          limit: 8,
        }, PAGE_REQUEST_OPTIONS);
        setStudents(resolveStudents(response));
      } catch (error) {
        console.error("Failed to search students", error);
        toast.error("Failed to search students");
      } finally {
        setLoadingStudents(false);
      }
    }, 350);

    return () => window.clearTimeout(handle);
  }, [canAccessSchoolLeaving, currentAcademicYear?.id, isAuthenticated, search]);

  const referenceNumber = useMemo(() => {
    if (issuedReference) return issuedReference;
    const code = getStudentCode(selectedStudent).replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "STUDENT";
    const datePart = form.issueDate.replaceAll("-", "");
    return `SLC-${datePart}-${code}`;
  }, [form.issueDate, issuedReference, selectedStudent]);

  const updateForm = (key: keyof IssueForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIssuedReference("");
  };

  const selectStudent = (student: StudentRow) => {
    setSelectedStudent(student);
    setIssuedReference("");
    setForm((prev) => ({
      ...prev,
      lastGradeCompleted: prev.lastGradeCompleted || student.className || student.enrollment?.grade?.toString() || "",
    }));
  };

  const validateIssue = () => {
    if (!selectedStudent) return "Select a student first";
    if (!form.issueDate) return "Issue date is required";
    if (!form.leavingDate) return "Leaving date is required";
    if (!form.reason.trim()) return "Leaving reason is required";
    if (!form.lastGradeCompleted.trim()) return "Last grade completed is required";
    return null;
  };

  const buildDocumentRecord = () => ({
    type: "SCHOOL_LEAVING_CERTIFICATE",
    title: "School Leaving Certificate",
    referenceNumber,
    fileUrl: "",
    status: "ISSUED",
    issuedAt: new Date().toISOString(),
    issuedBy: user?.name || user?.email || "Registrar",
    metadata: {
      issueDate: form.issueDate,
      leavingDate: form.leavingDate,
      reason: form.reason,
      destinationSchool: form.destinationSchool,
      destinationRegion: form.destinationRegion,
      lastGradeCompleted: form.lastGradeCompleted,
      conduct: form.conduct,
      attendanceSummary: form.attendanceSummary,
      academicStanding: form.academicStanding,
      remarks: form.remarks,
      academicYear: currentAcademicYear?.name,
      term: displayTermName,
    },
  });

  const issueCertificate = async () => {
    const validationError = validateIssue();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const studentId = getStudentUserId(selectedStudent!);
    if (!studentId) {
      toast.error("Selected student is missing a user id");
      return;
    }

    try {
      setIssuing(true);
      await registrarAPI.uploadDocuments(studentId, [buildDocumentRecord()], PAGE_REQUEST_OPTIONS);
      setIssuedReference(referenceNumber);
      toast.success("School leaving certificate issued");
    } catch (error: any) {
      console.error("Failed to issue school leaving certificate", error);
      toast.error(error?.response?.data?.message || "Failed to issue certificate");
    } finally {
      setIssuing(false);
    }
  };

  const buildPrintHtml = (withPrintScript = true) => {
    const studentName = getStudentName(selectedStudent);
    const calendarType = user?.calendarType as any || "GREGORIAN";
    const issueDate = formatDateByCalendarType(form.issueDate, calendarType);
    const leavingDate = formatDateByCalendarType(form.leavingDate, calendarType);
    const generatedDate = formatDateByCalendarType(new Date(), calendarType);
    return `<!doctype html>
<html>
<head>
  <title>${escapeHtml(referenceNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 24px; font-size: 13px; line-height: 2; }
    h1 { font-size: 16px; margin: 0 0 16px; text-align: center; }
    .meta { font-size: 12px; margin-bottom: 20px; }
    .footer { margin-top: 32px; font-size: 11px; color: #4b5563; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>School Leaving Details</h1>
  <div class="meta">Reference: <strong>${escapeHtml(referenceNumber)}</strong> &mdash; Issue Date: <strong>${escapeHtml(issueDate)}</strong></div>
  <p>Student <strong>${escapeHtml(studentName)}</strong> from <strong>${escapeHtml(getPlacement(selectedStudent))}</strong>, having completed <strong>${escapeHtml(form.lastGradeCompleted)}</strong> in the academic year <strong>${escapeHtml(currentAcademicYear?.name || "-")}</strong>, left school on <strong>${escapeHtml(leavingDate)}</strong>. Reason: ${escapeHtml(form.reason)}. Destination: ${escapeHtml(form.destinationSchool || "-")}, ${escapeHtml(form.destinationRegion || "-")}. Conduct: ${escapeHtml(form.conduct)}. Attendance: ${escapeHtml(form.attendanceSummary)}. Academic Standing: ${escapeHtml(form.academicStanding)}. Remarks: ${escapeHtml(form.remarks || "-")}.</p>
  <div class="footer">Registrar: ${escapeHtml(user?.name || "Registrar")} &mdash; Generated: ${escapeHtml(generatedDate)}</div>
  ${withPrintScript ? '<script>window.print(); window.close();</script>' : ''}
</body>
</html>`;
  };

  const printCertificate = () => {
    const validationError = validateIssue();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      toast.error("Allow popups to print the certificate");
      return;
    }

    printWindow.document.write(buildPrintHtml(true));
    printWindow.document.close();
  };

  const downloadCertificate = () => {
    if (!issuedReference) {
      toast.error("Issue the certificate first");
      return;
    }
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      toast.error("Allow popups to print the certificate");
      return;
    }
    printWindow.document.write(buildPrintHtml(true));
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!canAccessSchoolLeaving) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
        <Card className="mx-auto max-w-xl border-red-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              School leaving access denied
            </CardTitle>
            <CardDescription>
              This page requires a school-scoped Admin, IT Manager, or Registrar account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>Current role: {normalizedRole || "Unknown"}</p>
            {!user?.schoolId && <p>School context is missing for this account.</p>}
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white">School Leaving Issuing</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Issue official leaving certificates for student transfer, withdrawal, or completion records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {issuedReference ? (
              <>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  Issued {issuedReference}
                </Badge>
                <Button variant="outline" size="sm" onClick={downloadCertificate}>
                  <FileCheck className="mr-1 h-3.5 w-3.5" />
                  Download
                </Button>
              </>
            ) : (
              <Badge variant="outline">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Registrar document
              </Badge>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullScreen}
              title={isFullScreen ? "Exit full screen" : "Full screen"}
            >
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Student
                </CardTitle>
                <CardDescription>Search by name, email, admission number, or student ID.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students"
                />
                {loadingStudents ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                ) : students.length > 0 ? (
                  <div className="space-y-2">
                    {students.map((student) => {
                      const studentId = getStudentUserId(student);
                      const selected = studentId && studentId === getStudentUserId(selectedStudent || {});
                      return (
                        <button
                          key={studentId || getStudentCode(student)}
                          onClick={() => selectStudent(student)}
                          className={`w-full rounded-md border p-3 text-left transition ${
                            selected
                              ? "border-[var(--brand-color,#e35336)] bg-[rgba(var(--brand-color-rgb),0.08)]"
                              : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                          }`}
                        >
                          <div className="font-medium text-gray-950 dark:text-white">{getStudentName(student)}</div>
                          <div className="mt-1 text-xs text-gray-500">{getStudentCode(student)} · {getPlacement(student)}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : search.trim().length >= 2 ? (
                  <p className="text-sm text-gray-500">No students found.</p>
                ) : (
                  <p className="text-sm text-gray-500">Type at least 2 characters.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Selected Student
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStudent ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-semibold text-gray-950 dark:text-white">{getStudentName(selectedStudent)}</div>
                      <div className="text-gray-500">{getStudentEmail(selectedStudent)}</div>
                    </div>
                    <InfoRow label="Student ID" value={getStudentCode(selectedStudent)} />
                    <InfoRow label="Placement" value={getPlacement(selectedStudent)} />
                    <InfoRow label="Academic Year" value={currentAcademicYear?.name || "-"} />
                    <InfoRow label="Status" value={selectedStudent.enrollmentStatus || selectedStudent.enrollment?.status || "-"} />
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Select a student before issuing a certificate.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Leaving Certificate Details
                </CardTitle>
                <CardDescription>These details are stored as an issued student document and used for printing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Issue Date">
                    <CalendarDatePicker
                      value={parseDateValue(form.issueDate)}
                      onChange={(date) => updateForm("issueDate", formatDateValue(date))}
                      placeholder="Select issue date"
                    />
                  </Field>
                  <Field label="Leaving Date">
                    <CalendarDatePicker
                      value={parseDateValue(form.leavingDate)}
                      onChange={(date) => updateForm("leavingDate", formatDateValue(date))}
                      placeholder="Select leaving date"
                    />
                  </Field>
                  <Field label="Last Grade Completed">
                    <Input value={form.lastGradeCompleted} onChange={(event) => updateForm("lastGradeCompleted", event.target.value)} placeholder="Grade 8, Grade 12, etc." />
                  </Field>
                  <Field label="Conduct">
                    <Input value={form.conduct} onChange={(event) => updateForm("conduct", event.target.value)} />
                  </Field>
                  <Field label="Destination School">
                    <Input value={form.destinationSchool} onChange={(event) => updateForm("destinationSchool", event.target.value)} placeholder="Optional" />
                  </Field>
                  <Field label="Destination Region / Woreda">
                    <Input value={form.destinationRegion} onChange={(event) => updateForm("destinationRegion", event.target.value)} placeholder="Optional" />
                  </Field>
                </div>

                <Field label="Reason for Leaving">
                  <Textarea value={form.reason} onChange={(event) => updateForm("reason", event.target.value)} />
                </Field>
                <Field label="Attendance Summary">
                  <Textarea value={form.attendanceSummary} onChange={(event) => updateForm("attendanceSummary", event.target.value)} />
                </Field>
                <Field label="Academic Standing">
                  <Textarea value={form.academicStanding} onChange={(event) => updateForm("academicStanding", event.target.value)} />
                </Field>
                <Field label="Remarks">
                  <Textarea value={form.remarks} onChange={(event) => updateForm("remarks", event.target.value)} placeholder="Optional registrar remarks" />
                </Field>

                <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-700 sm:flex-row">
                  <Button onClick={issueCertificate} disabled={issuing || !selectedStudent}>
                    {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Issue Certificate
                  </Button>
                  <Button type="button" variant="outline" onClick={printCertificate} disabled={!selectedStudent}>
                    <Printer className="h-4 w-4" />
                    Print Preview
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-2 dark:border-gray-700">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
