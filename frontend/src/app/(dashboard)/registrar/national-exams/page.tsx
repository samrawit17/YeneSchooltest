"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  Maximize,
  Minimize,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { schoolSettingsAPI, studentsAPI } from "@/lib/api";
import { getGradeNumbersFromSystem } from "@/lib/grade-system";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ExamType = "GRADE_6_REGIONAL" | "GRADE_8_REGIONAL" | "GRADE_12_ESLCE";
type BatchStatus = "DRAFT" | "READY" | "SUBMITTED" | "ACCEPTED" | "REJECTED";
type ValidationSeverity = "error" | "warning";

type ValidationIssue = {
  message: string;
  severity: ValidationSeverity;
};

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
  dateOfBirth?: string;
  birthday?: string;
  phone?: string;
  nationality?: string;
  faydaNumber?: string;
  medicalInfo?: string;
  disability?: string;
  documents?: any;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    isActive?: boolean;
    avatarUrl?: string;
    profileImage?: string;
  };
  enrollment?: {
    academicYear?: string;
    grade?: number;
    status?: string;
  };
};

type Candidate = {
  listKey: string;
  student: StudentRow;
  included: boolean;
  candidateNumber: string;
  specialNeeds: string;
  remarks: string;
};

type SubmissionForm = {
  receivingOffice: string;
  submittedDate: string;
  referenceNumber: string;
  submittedBy: string;
  responseStatus: BatchStatus;
  responseNote: string;
};

const examOptions: Record<ExamType, { label: string; grade: string; bureau: string }> = {
  GRADE_6_REGIONAL: {
    label: "Grade 6 Regional Examination",
    grade: "6",
    bureau: "Regional Education Bureau",
  },
  GRADE_8_REGIONAL: {
    label: "Grade 8 Regional Examination",
    grade: "8",
    bureau: "Regional Education Bureau",
  },
  GRADE_12_ESLCE: {
    label: "Grade 12 ESLCE / University Entrance",
    grade: "12",
    bureau: "NEAEA",
  },
};

const PAGE_REQUEST_OPTIONS = { skipAuthErrorRedirect: true };

const resolveStudents = (payload: any): StudentRow[] => {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.students)) return data.students;
  return [];
};

const studentKey = (student: StudentRow) =>
  student.user?.id || student.userId || student.studentId || student.id || student.studentCode || "";

const studentName = (student: StudentRow) => student.user?.name || student.name || "Unnamed student";
const studentEmail = (student: StudentRow) => student.user?.email || student.email || "";
const studentCode = (student: StudentRow) => student.studentCode || student.studentId || student.id || "";
const studentGrade = (student: StudentRow) => student.enrollment?.grade?.toString() || student.className?.match(/\d+/)?.[0] || "";
const studentDateOfBirth = (student: StudentRow) => student.dateOfBirth || student.birthday || "";
const dateInputValue = (value: string) => value.slice(0, 10);
const studentPlacement = (student: StudentRow) =>
  [student.className, student.section ? `Section ${student.section}` : null].filter(Boolean).join(" - ") || "-";

const normalizeDocuments = (documents: any) => {
  if (!documents) return [];
  if (Array.isArray(documents)) return documents;
  if (typeof documents === "string") {
    try {
      const parsed = JSON.parse(documents);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return documents.trim() ? [documents] : [];
    }
  }
  return [documents];
};

const stringifyRecord = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") {
    try {
      return stringifyRecord(JSON.parse(value));
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(stringifyRecord).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key} ${stringifyRecord(entry)}`)
      .join(" ");
  }
  return String(value);
};

const documentText = (student: StudentRow) => normalizeDocuments(student.documents).map(stringifyRecord).join(" ");

const hasDocumentMatch = (student: StudentRow, keywords: string[]) => {
  const text = documentText(student).toLowerCase();
  return keywords.some((keyword) => text.includes(keyword));
};

const hasStudentPhotoEvidence = (student: StudentRow) =>
  Boolean(student.user?.avatarUrl || student.user?.profileImage) ||
  hasDocumentMatch(student, ["photo", "picture", "passport", "image", "id card"]);

const hasIdentityEvidence = (student: StudentRow) =>
  Boolean(student.faydaNumber?.trim()) ||
  hasDocumentMatch(student, ["fayda", "fan", "id", "identity", "birth", "certificate"]);

const hasAcademicEvidence = (student: StudentRow) =>
  hasDocumentMatch(student, ["grade", "report", "transcript", "card", "certificate", "result"]);

const extractProfileDisability = (student: StudentRow) => {
  if (student.disability?.trim()) return student.disability.trim();

  const medicalInfo = student.medicalInfo;
  if (medicalInfo) {
    try {
      const parsed = JSON.parse(medicalInfo);
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        const explicit =
          record.disability ||
          record.disabilityType ||
          record.specialNeeds ||
          record.specialNeed ||
          record.accommodation ||
          record.examAccommodation;
        if (explicit && String(explicit).trim()) return String(explicit).trim();
      }
    } catch {
      // Fall through to keyword-based detection for plain-text medical notes.
    }
  }

  const text = [student.medicalInfo, documentText(student)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const labels: Array<[string, string[]]> = [
    ["Visual impairment", ["visual impairment", "blind", "low vision", "vision"]],
    ["Hearing impairment", ["hearing impairment", "deaf", "hard of hearing", "sign language"]],
    ["Physical disability", ["physical disability", "wheelchair", "mobility", "orthopedic"]],
    ["Learning disability", ["learning disability", "intellectual", "dyslexia"]],
    ["Medical accommodation", ["chronic", "epilepsy", "diabetes", "medical accommodation", "special need"]],
  ];

  return labels.find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))?.[0] || "";
};

const candidateAccommodation = (candidate: Candidate) =>
  candidate.specialNeeds.trim() || extractProfileDisability(candidate.student);

const getValidationChecks = (candidate: Candidate, expectedGrade: string) => {
  const student = candidate.student;
  const checks: ValidationIssue[] = [];
  const add = (message: string, severity: ValidationSeverity = "error") => checks.push({ message, severity });

  if (!studentCode(student)) add("Missing student ID");
  if (!studentName(student) || studentName(student) === "Unnamed student") add("Missing full legal name");
  if (!student.gender) add("Missing sex");
  if (!studentDateOfBirth(student)) add("Missing date of birth");
  if (!studentGrade(student)) add("Missing grade");
  if (studentGrade(student) && studentGrade(student) !== expectedGrade) add(`Not Grade ${expectedGrade}`);
  if (!student.className || !student.section) add("Missing class or section");
  if (!student.rollNumber) add("Missing roll number");
  if (student.enrollmentStatus && !["APPROVED", "ACTIVE"].includes(student.enrollmentStatus)) {
    add(`Enrollment is ${student.enrollmentStatus}`);
  }
  if (student.user?.isActive === false) add("Inactive account");
  if (normalizeDocuments(student.documents).length === 0) add("No document evidence");
  if (!hasIdentityEvidence(student)) add("No ID/birth evidence", "warning");
  if (!hasStudentPhotoEvidence(student)) add("No photo evidence", "warning");
  if (!hasAcademicEvidence(student)) add("No grade evidence", "warning");
  if (!student.faydaNumber?.trim()) add("Missing Fayda/FAN", "warning");
  if (!candidate.candidateNumber.trim()) add("Candidate number not assigned", "warning");
  if (extractProfileDisability(student) && !candidate.specialNeeds.trim()) {
    add("Confirm disability accommodation");
  }

  return checks;
};

const getValidationIssues = (candidate: Candidate, expectedGrade: string) =>
  getValidationChecks(candidate, expectedGrade)
    .filter((check) => check.severity === "error")
    .map((check) => check.message);

const getValidationWarnings = (candidate: Candidate, expectedGrade: string) =>
  getValidationChecks(candidate, expectedGrade)
    .filter((check) => check.severity === "warning")
    .map((check) => check.message);

const csvEscape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const htmlEscape = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const parseDateValue = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const formatDateValue = (date: Date | undefined) => date ? format(date, "yyyy-MM-dd") : "";

export default function NationalExamCoordinationPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { currentAcademicYear } = useAcademicYear();
  const [examType, setExamType] = useState<ExamType>("GRADE_8_REGIONAL");
  const [batchName, setBatchName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [search, setSearch] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingGradeLevels, setLoadingGradeLevels] = useState(false);
  const [availableGrades, setAvailableGrades] = useState<number[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [submission, setSubmission] = useState<SubmissionForm>({
    receivingOffice: examOptions.GRADE_8_REGIONAL.bureau,
    submittedDate: format(new Date(), "yyyy-MM-dd"),
    referenceNumber: "",
    submittedBy: user?.name || "",
    responseStatus: "DRAFT",
    responseNote: "",
  });

  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/sign-in");
  }, [isAuthenticated, isLoading, router]);

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
    if (!isAuthenticated || !user?.schoolId) return;
    const schoolId = user.schoolId;

    const loadGradeLevels = async () => {
      try {
        setLoadingGradeLevels(true);
        const response = await schoolSettingsAPI.getAll(schoolId, PAGE_REQUEST_OPTIONS);
        setAvailableGrades(getGradeNumbersFromSystem(response.data?.grade_system || "1-12"));
      } catch (error) {
        console.error("Failed to load school grade levels", error);
        toast.error("Failed to load school grade levels");
        setAvailableGrades(getGradeNumbersFromSystem("1-12"));
      } finally {
        setLoadingGradeLevels(false);
      }
    };

    loadGradeLevels();
  }, [isAuthenticated, user?.schoolId]);

  const availableExamEntries = useMemo(
    () =>
      (Object.entries(examOptions) as Array<[ExamType, (typeof examOptions)[ExamType]]>).filter(([, option]) =>
        availableGrades.includes(Number(option.grade)),
      ),
    [availableGrades],
  );

  const availableExamLabel = useMemo(() => {
    if (loadingGradeLevels) return "configured national exam";
    const labels = availableExamEntries.map(([, option]) => `Grade ${option.grade}`);
    if (labels.length === 0) return "configured national exam";
    if (labels.length === 1) return labels[0];
    return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  }, [availableExamEntries, loadingGradeLevels]);

  useEffect(() => {
    if (loadingGradeLevels || availableExamEntries.length === 0) return;
    if (!availableExamEntries.some(([type]) => type === examType)) {
      setExamType(availableExamEntries[0][0]);
      setCandidates([]);
    }
  }, [availableExamEntries, examType, loadingGradeLevels]);

  useEffect(() => {
    const option = examOptions[examType];
    setBatchName(`${currentAcademicYear?.name || new Date().getFullYear()} ${option.label}`);
    setSubmission((prev) => ({
      ...prev,
      receivingOffice: option.bureau,
      responseStatus: prev.responseStatus === "DRAFT" ? "DRAFT" : prev.responseStatus,
    }));
  }, [currentAcademicYear?.name, examType]);

  const expectedGrade = examOptions[examType].grade;
  const includedCandidates = candidates.filter((candidate) => candidate.included);
  const readyCandidates = includedCandidates.filter(
    (candidate) => getValidationIssues(candidate, expectedGrade).length === 0,
  );
  const issueCount = includedCandidates.reduce(
    (sum, candidate) => sum + getValidationIssues(candidate, expectedGrade).length,
    0,
  );
  const warningCount = includedCandidates.reduce(
    (sum, candidate) => sum + getValidationWarnings(candidate, expectedGrade).length,
    0,
  );
  const batchStatus: BatchStatus =
    submission.responseStatus !== "DRAFT"
      ? submission.responseStatus
      : includedCandidates.length === 0
        ? "DRAFT"
        : issueCount === 0
          ? "READY"
          : "DRAFT";

  const filteredCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return candidates;
    return candidates.filter((candidate) => {
      const student = candidate.student;
      return [
        studentName(student),
        studentCode(student),
        studentPlacement(student),
        student.gender,
        studentDateOfBirth(student),
        student.faydaNumber,
        student.rollNumber,
        candidate.specialNeeds,
        candidate.remarks,
        candidate.candidateNumber,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [candidates, search]);

  const loadCandidates = async () => {
    if (!availableGrades.includes(Number(expectedGrade))) {
      toast.error(`Grade ${expectedGrade} is not configured for this school`);
      return;
    }

    try {
      setLoadingCandidates(true);
      const response = await studentsAPI.getAll({
        academicYearId: currentAcademicYear?.id,
        grade: expectedGrade,
        limit: 500,
      }, PAGE_REQUEST_OPTIONS);
      const rows = resolveStudents(response);
      setCandidates(
        rows.map((student, index) => ({
          listKey: studentKey(student) || `candidate-${index}`,
          student,
          included: true,
          candidateNumber: "",
          specialNeeds: extractProfileDisability(student),
          remarks: "",
        })),
      );
      toast.success(`Loaded ${rows.length} Grade ${expectedGrade} candidate(s)`);
    } catch (error: any) {
      console.error("Failed to load national exam candidates", error);
      toast.error(error?.response?.data?.message || "Failed to load candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const updateCandidate = (key: string, patch: Partial<Candidate>) => {
    setCandidates((prev) =>
      prev.map((candidate) => (candidate.listKey === key ? { ...candidate, ...patch } : candidate)),
    );
  };

  const updateCandidateStudent = (key: string, patch: Partial<StudentRow>) => {
    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.listKey === key ? { ...candidate, student: { ...candidate.student, ...patch } } : candidate,
      ),
    );
  };

  const buildRows = () =>
    includedCandidates.map((candidate, index) => {
      const student = candidate.student;
      const warnings = getValidationWarnings(candidate, expectedGrade);
      return {
        no: index + 1,
        studentId: studentCode(student),
        fullName: studentName(student),
        gender: student.gender || "",
        dateOfBirth: studentDateOfBirth(student),
        faydaNumber: student.faydaNumber || "",
        grade: studentGrade(student) || expectedGrade,
        section: student.section || "",
        className: student.className || "",
        rollNumber: student.rollNumber || "",
        email: studentEmail(student),
        examType: examOptions[examType].label,
        candidateNumber: candidate.candidateNumber,
        specialNeeds: candidateAccommodation(candidate),
        remarks: candidate.remarks,
        validation: getValidationIssues(candidate, expectedGrade).join("; "),
        warnings: warnings.join("; "),
      };
    });

  const exportCsv = () => {
    if (includedCandidates.length === 0) {
      toast.error("No included candidates to export");
      return;
    }

    const headers = [
      "No",
      "Student ID",
      "Full Name",
      "Sex",
      "Date of Birth",
      "Fayda/FAN",
      "Grade",
      "Class",
      "Section",
      "Roll Number",
      "Email",
      "Exam Type",
      "Candidate Number",
      "Special Needs",
      "Remarks",
      "Validation Issues",
      "Warnings",
    ];
    const csvRows = buildRows().map((row) => [
      row.no,
      row.studentId,
      row.fullName,
      row.gender,
      row.dateOfBirth,
      row.faydaNumber,
      row.grade,
      row.className,
      row.section,
      row.rollNumber,
      row.email,
      row.examType,
      row.candidateNumber,
      row.specialNeeds,
      row.remarks,
      row.validation,
      row.warnings,
    ]);
    const content = [headers, ...csvRows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const suffix =
      examType === "GRADE_6_REGIONAL"
        ? "grade-6-regional"
        : examType === "GRADE_8_REGIONAL"
          ? "grade-8-regional"
          : "grade-12-eslce";
    downloadFile(`${suffix}-candidate-list.csv`, content, "text/csv;charset=utf-8");
  };

  const printCandidateList = () => {
    if (includedCandidates.length === 0) {
      toast.error("No included candidates to print");
      return;
    }

    const rows = buildRows();
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) {
      toast.error("Allow popups to print the candidate list");
      return;
    }

    const htmlRows = rows
      .map((row) => {
        const validation = `${row.validation || "Ready"}${row.warnings ? `; Warnings: ${row.warnings}` : ""}`;
        return `<tr>
          <td>${htmlEscape(row.no)}</td><td>${htmlEscape(row.studentId)}</td><td>${htmlEscape(row.fullName)}</td><td>${htmlEscape(row.gender)}</td>
          <td>${htmlEscape(row.dateOfBirth || "-")}</td><td>${htmlEscape(row.faydaNumber || "-")}</td><td>${htmlEscape(row.grade)}</td>
          <td>${htmlEscape(row.className)}</td><td>${htmlEscape(row.section)}</td><td>${htmlEscape(row.rollNumber || "-")}</td>
          <td>${htmlEscape(row.candidateNumber || "-")}</td><td>${htmlEscape(row.specialNeeds || "-")}</td>
          <td>${htmlEscape(validation)}</td>
        </tr>`;
      })
      .join("");

    win.document.write(`<!doctype html>
<html><head><title>${htmlEscape(batchName)}</title>
<style>
body{font-family:Arial,sans-serif;padding:28px;color:#111827} h1{font-size:20px;margin:0 0 6px}
.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:16px 0;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:11px} th,td{border:1px solid #d1d5db;padding:6px;text-align:left}
th{background:#f3f4f6}.sign{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:60px}
.line{border-top:1px solid #111827;padding-top:8px;text-align:center;font-size:12px}
</style></head><body>
<h1>${htmlEscape(batchName)}</h1>
<div>${htmlEscape(examOptions[examType].label)}</div>
<div class="meta">
<div>Academic Year: ${htmlEscape(currentAcademicYear?.name || "-")}</div>
<div>Status: ${htmlEscape(batchStatus)}</div>
<div>Receiving Office: ${htmlEscape(submission.receivingOffice || "-")}</div>
<div>Reference: ${htmlEscape(submission.referenceNumber || "-")}</div>
<div>Prepared By: ${htmlEscape(user?.name || "-")}</div>
<div>Generated: ${htmlEscape(format(new Date(), "yyyy-MM-dd HH:mm"))}</div>
</div>
<table><thead><tr><th>No</th><th>Student ID</th><th>Name</th><th>Sex</th><th>DOB</th><th>Fayda/FAN</th><th>Grade</th><th>Class</th><th>Section</th><th>Roll</th><th>Candidate No.</th><th>Disability / Accommodation</th><th>Validation</th></tr></thead><tbody>${htmlRows}</tbody></table>
<div class="sign"><div class="line">Registrar</div><div class="line">Director / Principal</div></div>
<script>window.print(); window.close();</script>
</body></html>`);
    win.document.close();
  };

  const markSubmitted = () => {
    if (includedCandidates.length === 0) {
      toast.error("Create a candidate list before marking submitted");
      return;
    }
    if (issueCount > 0) {
      toast.error("Resolve validation issues before submission");
      return;
    }
    if (!submission.receivingOffice.trim()) {
      toast.error("Receiving office is required");
      return;
    }
    setSubmission((prev) => ({
      ...prev,
      responseStatus: "SUBMITTED",
      submittedDate: prev.submittedDate || format(new Date(), "yyyy-MM-dd"),
      submittedBy: prev.submittedBy || user?.name || "",
    }));
    toast.success("Candidate list marked as submitted");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-6 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white">National Exam Coordination</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Prepare {availableExamLabel} candidate lists based on this school's configured grade levels.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={batchStatus === "READY" ? "bg-emerald-600 text-white" : "bg-gray-700 text-white"}>
              {batchStatus}
            </Badge>
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

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric label="Included Candidates" value={includedCandidates.length} icon={Users} />
          <Metric label="Ready Candidates" value={readyCandidates.length} icon={CheckCircle} />
          <Metric label="Validation Issues" value={issueCount} icon={AlertTriangle} tone={issueCount > 0 ? "warn" : "ok"} />
          <Metric label="Warnings" value={warningCount} icon={ShieldCheck} tone={warningCount > 0 ? "warn" : "ok"} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Candidate List Setup</CardTitle>
                <CardDescription>Select exam type and load the eligible grade from active student records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Exam Type">
                  <select
                    value={examType}
                    onChange={(event) => {
                      setExamType(event.target.value as ExamType);
                      setCandidates([]);
                    }}
                    disabled={loadingGradeLevels || availableExamEntries.length === 0}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {availableExamEntries.length === 0 && (
                      <option value={examType}>No configured national exam grade</option>
                    )}
                    {availableExamEntries.map(([type, option]) => (
                      <option key={type} value={type}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {(loadingGradeLevels || availableExamEntries.length === 0) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {loadingGradeLevels
                        ? "Loading configured grade levels..."
                        : "No national exam grades are configured for this school."}
                    </p>
                  )}
                </Field>
                <Field label="Batch Name">
                  <Input value={batchName} onChange={(event) => setBatchName(event.target.value)} />
                </Field>
                <Field label="Registration Deadline">
                  <CalendarDatePicker
                    value={parseDateValue(deadline)}
                    onChange={(date) => setDeadline(formatDateValue(date))}
                    placeholder="Select registration deadline"
                  />
                </Field>
                <Button
                  onClick={loadCandidates}
                  disabled={loadingCandidates || loadingGradeLevels || availableExamEntries.length === 0}
                  className="w-full"
                >
                  {loadingCandidates ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Load Grade {expectedGrade} Students
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requirement Checks</CardTitle>
                <CardDescription>Blocking items must be fixed before marking the list submitted.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-950 dark:text-white">Blocking</p>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Student ID, full legal name, sex, date of birth, grade match, class, section, roll number,
                    active enrollment, active account, document evidence, and disability accommodation confirmation.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-950 dark:text-white">Warnings</p>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Fayda/FAN, candidate number, photo evidence, ID/birth evidence, and grade report evidence.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submission Tracking</CardTitle>
                <CardDescription>Record the bureau/NEAEA handoff after the list is validated.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Receiving Office">
                  <Input
                    value={submission.receivingOffice}
                    onChange={(event) => setSubmission((prev) => ({ ...prev, receivingOffice: event.target.value }))}
                  />
                </Field>
                <Field label="Submitted Date">
                  <CalendarDatePicker
                    value={parseDateValue(submission.submittedDate)}
                    onChange={(date) =>
                      setSubmission((prev) => ({ ...prev, submittedDate: formatDateValue(date) }))
                    }
                    placeholder="Select submitted date"
                  />
                </Field>
                <Field label="Response Status">
                  <select
                    value={submission.responseStatus}
                    onChange={(event) => setSubmission((prev) => ({ ...prev, responseStatus: event.target.value as BatchStatus }))}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </Field>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Candidate Review</CardTitle>
                    <CardDescription>Validate records, include/exclude students, and add candidate numbers.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportCsv} disabled={includedCandidates.length === 0}>
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button variant="outline" onClick={printCandidateList} disabled={includedCandidates.length === 0}>
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                    <Button onClick={markSubmitted} disabled={includedCandidates.length === 0 || issueCount > 0}>
                      <Send className="h-4 w-4" />
                      Mark Submitted
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter candidate list" />
                </div>

                {candidates.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                    <FileSpreadsheet className="mb-3 h-10 w-10 text-gray-400" />
                    <h2 className="font-semibold text-gray-950 dark:text-white">No candidate list loaded</h2>
                    <p className="mt-1 max-w-md text-sm text-gray-500">
                      Load Grade {expectedGrade} students to begin validation and candidate list preparation.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-[1480px] w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        <tr>
                          <th className="px-3 py-3">Include</th>
                          <th className="px-3 py-3">Student ID</th>
                          <th className="px-3 py-3">Full Name</th>
                          <th className="px-3 py-3">Sex</th>
                          <th className="px-3 py-3">DOB</th>
                          <th className="px-3 py-3">Fayda/FAN</th>
                          <th className="px-3 py-3">Class</th>
                          <th className="px-3 py-3">Section</th>
                          <th className="px-3 py-3">Roll</th>
                          <th className="px-3 py-3">Candidate No.</th>
                          <th className="px-3 py-3">Disability / Accommodation</th>
                          <th className="px-3 py-3">Remarks</th>
                          <th className="px-3 py-3">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                        {filteredCandidates.map((candidate) => {
                          const key = candidate.listKey;
                          const issues = getValidationIssues(candidate, expectedGrade);
                          const warnings = getValidationWarnings(candidate, expectedGrade);
                          return (
                            <tr key={key} className={!candidate.included ? "opacity-50" : ""}>
                              <td className="px-3 py-3 align-top">
                                <input
                                  type="checkbox"
                                  checked={candidate.included}
                                  onChange={(event) => updateCandidate(key, { included: event.target.checked })}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  value={studentCode(candidate.student)}
                                  onChange={(event) =>
                                    updateCandidateStudent(key, {
                                      studentCode: event.target.value,
                                      studentId: event.target.value,
                                    })
                                  }
                                  placeholder="Student ID"
                                  className="min-w-32"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  value={studentName(candidate.student)}
                                  onChange={(event) =>
                                    updateCandidateStudent(key, {
                                      name: event.target.value,
                                      user: { ...candidate.student.user, name: event.target.value },
                                    })
                                  }
                                  placeholder="Full legal name"
                                  className="min-w-52"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <select
                                  value={(candidate.student.gender || "").toUpperCase()}
                                  onChange={(event) => updateCandidateStudent(key, { gender: event.target.value })}
                                  className="h-9 min-w-28 rounded-md border border-input bg-transparent px-3 text-sm"
                                >
                                  <option value="">Select</option>
                                  <option value="MALE">Male</option>
                                  <option value="FEMALE">Female</option>
                                </select>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  type="date"
                                  value={dateInputValue(studentDateOfBirth(candidate.student))}
                                  onChange={(event) => updateCandidateStudent(key, { dateOfBirth: event.target.value })}
                                  className="min-w-36"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  value={candidate.student.faydaNumber || ""}
                                  onChange={(event) => updateCandidateStudent(key, { faydaNumber: event.target.value })}
                                  placeholder="FAN"
                                  className="min-w-36"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  value={candidate.student.className || ""}
                                  onChange={(event) => updateCandidateStudent(key, { className: event.target.value })}
                                  placeholder={`Grade ${expectedGrade}`}
                                  className="min-w-32"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  value={candidate.student.section || ""}
                                  onChange={(event) => updateCandidateStudent(key, { section: event.target.value })}
                                  placeholder="Section"
                                  className="min-w-24"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  value={candidate.student.rollNumber || ""}
                                  onChange={(event) => updateCandidateStudent(key, { rollNumber: event.target.value })}
                                  placeholder="Roll"
                                  className="min-w-24"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  value={candidate.candidateNumber}
                                  onChange={(event) => updateCandidate(key, { candidateNumber: event.target.value })}
                                  placeholder="Optional"
                                  className="min-w-36"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  value={candidate.specialNeeds}
                                  onChange={(event) => updateCandidate(key, { specialNeeds: event.target.value })}
                                  placeholder="None / required accommodation"
                                  className="min-w-56"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Input
                                  value={candidate.remarks}
                                  onChange={(event) => updateCandidate(key, { remarks: event.target.value })}
                                  placeholder="Optional"
                                  className="min-w-40"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="flex max-w-80 flex-wrap gap-1">
                                  {issues.length === 0 && (
                                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      Ready
                                    </Badge>
                                  )}
                                  {issues.map((issue) => (
                                    <Badge key={issue} variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300">
                                      {issue}
                                    </Badge>
                                  ))}
                                  {warnings.map((warning) => (
                                    <Badge key={warning} variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                                      {warning}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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

function Metric({
  label,
  value,
  icon: Icon,
  tone = "normal",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "normal" | "ok" | "warn";
}) {
  const toneClass =
    tone === "warn"
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      : tone === "ok"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
