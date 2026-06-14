"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Printer,
  Download,
  CreditCard,
  User,
  School,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building2,
  Hash,
  Users,
  CheckCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { resolveAssetUrl } from "@/lib/asset-url";
import { useTranslations } from "@/hooks/useTranslations";

// ===================== TYPES =====================

export interface StudentIdCardData {
  studentId: string;
  studentCode: string;
  name: string;
  grade: number;
  section: string;
  stream?: string;
  academicYear: string;
  dateOfBirth?: string | null;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  phone?: string;
  email?: string;
  rollNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  photoUrl?: string;
}

export interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  tagline?: string;
  code?: string;
}

export interface IdCardTemplate {
  id: string;
  name: string;
  type: "vertical" | "horizontal" | "compact";
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  showQR?: boolean;
  showBack?: boolean;
  fontFamily?: string;
}

// ===================== QR CODE GENERATOR =====================
// Simple QR-like pattern using SVG for student ID verification

function generateQRSvg(data: string, size: number = 80): string {
  const safeData = data || "id";
  // Generate a deterministic pattern from the data string
  const hash = Array.from(safeData).reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const modules = 21; // 21x21 grid (Version 1 QR)
  const cellSize = size / modules;
  let rects = "";

  // Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (x: number, y: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isOuter = i === 0 || i === 6 || j === 0 || j === 6;
        const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        if (isOuter || isInner) {
          rects += `<rect x="${(x + j) * cellSize}" y="${(y + i) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  // Data area - deterministic pattern based on input
  for (let i = 0; i < modules; i++) {
    for (let j = 0; j < modules; j++) {
      // Skip finder pattern areas
      if ((i < 8 && j < 8) || (i < 8 && j >= modules - 8) || (i >= modules - 8 && j < 8)) continue;
      // Timing patterns
      if (i === 6 || j === 6) {
        if ((i + j) % 2 === 0) {
          rects += `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
        }
        continue;
      }
      // Data modules
      const seed = (hash + i * 31 + j * 37 + safeData.charCodeAt(Math.abs(i - j) % safeData.length)) % 100;
      if (seed < 45) {
        rects += `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function normalizeHexColor(value: unknown, fallback = "#1e40af") {
  const raw = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function formatMessage(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

// ===================== TEMPLATES =====================

const cardTemplates: IdCardTemplate[] = [
  { id: "standard", name: "Standard", type: "vertical", primaryColor: "#1e40af", secondaryColor: "#3b82f6", showQR: true },
  { id: "modern", name: "Modern", type: "vertical", primaryColor: "#7c3aed", secondaryColor: "#a78bfa", showQR: true },
  { id: "classic", name: "Classic", type: "vertical", primaryColor: "#059669", secondaryColor: "#34d399" },
  { id: "horizontal", name: "Horizontal", type: "horizontal", primaryColor: "#dc2626", secondaryColor: "#f87171", showQR: true },
  { id: "compact", name: "Compact", type: "compact", primaryColor: "#ea580c", secondaryColor: "#fb923c" },
  { id: "executive", name: "Executive", type: "vertical", primaryColor: "#18181b", secondaryColor: "#3f3f46", accentColor: "#d4a843", showQR: true, showBack: true },
  { id: "gradient", name: "Gradient", type: "vertical", primaryColor: "#6366f1", secondaryColor: "#ec4899", accentColor: "#8b5cf6", showQR: true },
  { id: "minimalist", name: "Minimalist", type: "vertical", primaryColor: "#334155", secondaryColor: "#64748b", showQR: true },
];

// ===================== DEFAULT DATA =====================

const defaultSchoolInfo: SchoolInfo = {
  name: "School Name",
  address: "City, Country",
  phone: "+000 00 000 0000",
  email: "info@school.edu",
  tagline: "Excellence in Education",
};

const defaultStudentData: StudentIdCardData = {
  studentId: "",
  studentCode: "",
  name: "",
  grade: 0,
  section: "",
  academicYear: "",
  gender: "Male",
  photoUrl: "",
};

function getStudentCardIssues(
  student: StudentIdCardData,
  templateConfig?: StudentIdCardGeneratorProps["templateConfig"],
  t?: any,
) {
  const issues: string[] = [];
  if (!student.studentCode) issues.push(t?.generator?.missingId || "Missing ID");
  if (!student.photoUrl) issues.push(t?.generator?.noPhoto || "No photo");
  if (!student.academicYear) issues.push(t?.generator?.missingYear || "Missing year");
  if (!student.grade || !student.section || student.section === "N/A") issues.push(t?.generator?.missingClass || "Missing class");
  if (templateConfig?.showEmergencyContact !== false && !student.emergencyContact?.phone) issues.push(t?.generator?.noEmergency || "No emergency");
  if (templateConfig?.showBloodGroup && !student.bloodGroup) issues.push(t?.generator?.noBloodGroup || "No blood group");
  return issues;
}

// ===================== INITIALS AVATAR =====================

function InitialsAvatar({ name, size = "lg", bgColor }: { name: string; size?: "sm" | "lg"; bgColor?: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#4f46e5", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#059669", "#0d9488", "#2563eb"];
  const colorIdx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const bg = bgColor || colors[colorIdx];
  const dim = size === "lg" ? "w-24 h-24" : "w-20 h-20";
  const textSize = size === "lg" ? "text-3xl" : "text-2xl";

  return (
    <div className={`${dim} rounded-full flex items-center justify-center border-4 border-white shadow-lg`} style={{ backgroundColor: bg }}>
      <span className={`${textSize} font-bold text-white`}>{initials}</span>
    </div>
  );
}

// ===================== SINGLE CARD COMPONENT =====================

interface StudentIdCardProps {
  student: StudentIdCardData;
  school?: SchoolInfo;
  template?: IdCardTemplate;
  templateConfig?: StudentIdCardGeneratorProps["templateConfig"];
  showBack?: boolean;
}

const StudentIdCard = ({
  student,
  school = defaultSchoolInfo,
  template = cardTemplates[0],
  templateConfig,
}: StudentIdCardProps) => {
  const { t } = useTranslations<any>("idCards");
  const logoSrc = resolveAssetUrl(school.logo);
  const photoSrc = resolveAssetUrl(student.photoUrl);
  const watermarkSrc = templateConfig?.useCustomBackground
    ? resolveAssetUrl(templateConfig.customBackgroundUrl)
    : undefined;

  return (
    <div className="relative w-[540px] h-[340px] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl">
      {watermarkSrc && (
        <img src={watermarkSrc} alt="" className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[58%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-10" />
      )}
      <div className="relative z-10 flex h-[76px] items-center justify-between px-5 text-white" style={{ backgroundColor: template.primaryColor }}>
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-11 w-11 rounded bg-white/95 object-contain p-1" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded bg-white/95 text-[10px] font-semibold text-gray-500">{t.preview.logo}</div>
        )}
        <div className="min-w-0 flex-1 px-4">
          <h3 className="truncate text-xl font-bold leading-tight">{school.name || t.generator.schoolName}</h3>
          <p className="truncate text-[12px] leading-tight opacity-90">
            {[school.phone, school.address].filter(Boolean).join(" • ") || t.generator.phoneAddress}
          </p>
        </div>
        <div className="text-right text-[12px] font-bold uppercase tracking-wide">{templateConfig?.title || t.generator.studentId}</div>
      </div>

      <div className="relative z-10 grid grid-cols-[110px_1fr_82px] gap-5 p-5">
        <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {photoSrc ? (
            <img src={photoSrc} alt={student.name} className="h-full w-full object-cover" />
          ) : (
            <InitialsAvatar name={student.name || t.generator.studentName} size="sm" bgColor={template.primaryColor} />
          )}
        </div>
        <div className="min-w-0 space-y-2 text-[13px]">
          <h2 className="truncate text-xl font-bold" style={{ color: template.primaryColor }}>{student.name || t.generator.studentName}</h2>
          <p><span className="font-semibold text-gray-500">{t.generator.id}:</span> {student.studentCode || "-"}</p>
          <p><span className="font-semibold text-gray-500">{t.generator.class}:</span> {t.generator.grade} {student.grade || "-"} {student.section || ""}</p>
          <p><span className="font-semibold text-gray-500">{t.generator.academicYear}:</span> {student.academicYear || "-"}</p>
          {student.bloodGroup && <p><span className="font-semibold text-gray-500">{t.generator.bloodGroup}:</span> {student.bloodGroup}</p>}
          {student.emergencyContact?.phone && (
            <p><span className="font-semibold text-gray-500">{t.generator.emergency}:</span> {student.emergencyContact.phone}</p>
          )}
        </div>
        <div className="flex flex-col items-center justify-start gap-1 pt-2">
          <div className="rounded border border-gray-200 bg-white p-1" dangerouslySetInnerHTML={{ __html: generateQRSvg(student.studentCode || student.studentId || "id", 58) }} />
          <span className="text-[10px] text-gray-500">{t.generator.scanToVerify}</span>
        </div>
      </div>
      <div className="relative z-10 flex items-end justify-between bg-gray-50 px-5 py-2 text-[11px] text-gray-500">
        <div className="w-32 text-center">
          <div className="mb-1 border-t border-gray-400" />
          <span>{t.generator.schoolStamp}</span>
        </div>
        <div className="w-40 text-center">
          <div className="mb-1 border-t border-gray-400" />
          <span>{t.generator.principalSignature}</span>
        </div>
      </div>
    </div>
  );
};

// ===================== PRINT HTML GENERATOR =====================

function generatePrintHTML(
  students: StudentIdCardData[],
  school: SchoolInfo,
  template: IdCardTemplate,
  templateConfig?: StudentIdCardGeneratorProps["templateConfig"],
  t?: any,
): string {
  const watermarkSrc = templateConfig?.useCustomBackground
    ? resolveAssetUrl(templateConfig.customBackgroundUrl)
    : undefined;
  const primaryColor = normalizeHexColor(template.primaryColor);
  const rawSchoolName = school.name || t?.generator?.schoolName || "School Name";
  const safeSchoolName = escapeHtml(rawSchoolName);
  const safeContact = escapeHtml([school.phone, school.address].filter(Boolean).join(" • ") || t?.generator?.phoneAddress || "Phone • Address");
  const safeTitle = escapeHtml(templateConfig?.title || t?.generator?.studentId || "Student ID");
  const safeWatermarkSrc = watermarkSrc ? escapeAttr(watermarkSrc) : "";
  const safeLogoSrc = resolveAssetUrl(school.logo);
  const cards = students.map((s) => {
    const initials = escapeHtml(s.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "ST");
    const photoSrc = resolveAssetUrl(s.photoUrl);
    const photo = photoSrc
      ? `<img src="${escapeAttr(photoSrc)}" style="width:100%;height:100%;object-fit:cover" alt=""/>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:${primaryColor};font-weight:800;font-size:24px">${initials}</div>`;
    const safeStudentName = escapeHtml(s.name || t?.generator?.studentName || "Student Name");
    const safeStudentCode = escapeHtml(s.studentCode || "-");
    const safeSection = escapeHtml(s.section || "");
    const safeAcademicYear = escapeHtml(s.academicYear || "-");
    const safeBloodGroup = escapeHtml(s.bloodGroup || "");
    const safeEmergencyPhone = escapeHtml(s.emergencyContact?.phone || "");

    return `<div class="id-card">
      ${safeWatermarkSrc ? `<img src="${safeWatermarkSrc}" class="watermark" alt=""/>` : ""}
      <div class="card-header">
        ${safeLogoSrc ? `<img src="${escapeAttr(safeLogoSrc)}" class="logo" alt=""/>` : `<div class="logo-placeholder">${escapeHtml(t?.preview?.logo || "LOGO")}</div>`}
        <div class="school-block">
          <div class="school-name">${safeSchoolName}</div>
          <div class="school-contact">${safeContact}</div>
        </div>
        <div class="card-title">${safeTitle}</div>
      </div>
      <div class="card-body">
        <div class="photo">${photo}</div>
        <div class="details">
          <div class="student-name">${safeStudentName}</div>
          <div><b>${escapeHtml(t?.generator?.id || "ID")}:</b> ${safeStudentCode}</div>
          <div><b>${escapeHtml(t?.generator?.class || "Class")}:</b> ${escapeHtml(t?.generator?.grade || "Grade")} ${escapeHtml(s.grade || "-")} ${safeSection}</div>
          <div><b>${escapeHtml(t?.generator?.academicYear || "Academic Year")}:</b> ${safeAcademicYear}</div>
          ${s.bloodGroup ? `<div><b>${escapeHtml(t?.generator?.bloodGroup || "Blood Group")}:</b> ${safeBloodGroup}</div>` : ""}
          ${s.emergencyContact?.phone ? `<div><b>${escapeHtml(t?.generator?.emergency || "Emergency")}:</b> ${safeEmergencyPhone}</div>` : ""}
        </div>
        <div class="qr">${generateQRSvg(s.studentCode || s.studentId || "id", 58)}<span>${escapeHtml(t?.generator?.scanToVerify || "Scan to verify")}</span></div>
      </div>
      <div class="card-footer"><div class="footer-slot"><div class="footer-line"></div><span>${escapeHtml(t?.generator?.schoolStamp || "School Stamp")}</span></div><div class="footer-slot signature"><div class="footer-line"></div><span>${escapeHtml(t?.generator?.principalSignature || "Principal Signature")}</span></div></div>
    </div>`;
  });

  return `<!DOCTYPE html><html><head><title>${escapeHtml(formatMessage(t?.generator?.printTitle || "Student ID Cards - {school}", { school: rawSchoolName }))}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#fff}
.page{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:flex-start;padding:10mm;page-break-after:always}
.page:last-child{page-break-after:auto}
.id-card{position:relative;width:540px;height:340px;overflow:hidden;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;box-shadow:0 4px 12px rgba(15,23,42,.08)}
.watermark{position:absolute;left:50%;top:50%;width:58%;max-height:72%;object-fit:contain;transform:translate(-50%,-50%);opacity:.1;z-index:0}
.card-header{position:relative;z-index:1;height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:${primaryColor};color:white}
.logo,.logo-placeholder{width:44px;height:44px;border-radius:6px;background:rgba(255,255,255,.95);object-fit:contain;padding:4px;color:#64748b;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
.school-block{min-width:0;flex:1;padding:0 16px}
.school-name{font-size:20px;line-height:1.1;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.school-contact{font-size:12px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-title{text-align:right;text-transform:uppercase;font-size:12px;font-weight:800;letter-spacing:.04em}
.card-body{position:relative;z-index:1;display:grid;grid-template-columns:110px 1fr 82px;gap:20px;padding:20px}
.photo{height:144px;overflow:hidden;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc}
.details{font-size:13px;line-height:1.65;min-width:0}
.student-name{font-size:20px;line-height:1.2;font-weight:800;color:${primaryColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px}
.qr{display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:8px;font-size:10px;color:#64748b}
.qr svg{border:1px solid #e2e8f0;border-radius:4px;padding:4px;background:#fff}
.card-footer{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;background:#f8fafc;padding:8px 20px;font-size:11px;color:#64748b}
.footer-slot{width:128px;text-align:center}.footer-slot.signature{width:160px}.footer-line{border-top:1px solid #94a3b8;margin-bottom:4px}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{size:A4;margin:8mm}
}
</style></head><body>
${(() => {
    const perPage = 4;
    let pages = "";
    for (let i = 0; i < cards.length; i += perPage) {
      pages += `<div class="page">${cards.slice(i, i + perPage).join("")}</div>`;
    }
    return pages;
  })()}
</body></html>`;
}

// ===================== MAIN GENERATOR COMPONENT =====================

interface StudentIdCardGeneratorProps {
  students?: StudentIdCardData[];
  school?: SchoolInfo;
  templateConfig?: {
    title?: string;
    themeColor?: string;
    useCustomBackground?: boolean;
    customBackgroundUrl?: string;
    showEmergencyContact?: boolean;
    showBloodGroup?: boolean;
  };
  autoDownload?: boolean;
  onDownloadSelected?: (studentIds: string[]) => void | Promise<void>;
  downloading?: boolean;
}

export default function StudentIdCardGenerator({
  students = [defaultStudentData],
  school = defaultSchoolInfo,
  templateConfig,
  autoDownload = false,
  onDownloadSelected,
  downloading = false,
}: StudentIdCardGeneratorProps) {
  const { t, language } = useTranslations<any>("idCards");
  const [selectedTemplate] = useState<IdCardTemplate>(cardTemplates[0]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [previewStudent, setPreviewStudent] = useState<StudentIdCardData>(students[0] || defaultStudentData);
  const [localSchool, setLocalSchool] = useState<SchoolInfo>(school);
  const [activeTab, setActiveTab] = useState("preview");
  const activeTemplate = useMemo(
    () => ({
      ...selectedTemplate,
      primaryColor: normalizeHexColor(templateConfig?.themeColor, selectedTemplate.primaryColor),
      secondaryColor: normalizeHexColor(templateConfig?.themeColor, selectedTemplate.secondaryColor),
    }),
    [selectedTemplate, templateConfig?.themeColor],
  );

  useEffect(() => {
    setLocalSchool(school);
  }, [school]);
  useEffect(() => {
    setPreviewStudent(students[0] || defaultStudentData);
    setSelectedStudents((prev) => {
      const availableIds = new Set(students.map((student) => student.studentId));
      return prev.filter((id) => availableIds.has(id));
    });
  }, [students]);

  const handlePrintAll = useCallback(() => {
    const toPrint = students.filter(
      (s) => selectedStudents.length === 0 || selectedStudents.includes(s.studentId)
    );
    if (toPrint.length === 0) {
      toast.error(t.toasts.noStudentsSelected);
      return;
    }
    const html = generatePrintHTML(toPrint, localSchool, activeTemplate, templateConfig, t);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 600);
    }
  }, [students, selectedStudents, localSchool, activeTemplate, templateConfig, t]);

  const handleDownloadSelected = useCallback(async () => {
    const ids = students
      .filter((s) => selectedStudents.length === 0 || selectedStudents.includes(s.studentId))
      .map((s) => s.studentId)
      .filter(Boolean);
    if (ids.length === 0) {
      toast.error(t.toasts.noStudentsSelected);
      return;
    }

    if (!onDownloadSelected) {
      handlePrintAll();
      return;
    }

    await onDownloadSelected(ids);
  }, [handlePrintAll, onDownloadSelected, selectedStudents, students, t.toasts.noStudentsSelected]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedStudents((prev) =>
      prev.length === students.length ? [] : students.map((s) => s.studentId)
    );
  };

  const printCount = selectedStudents.length || students.length;
  const printPlural = language === "en" && printCount !== 1 ? "s" : "";
  const actionLabel = formatMessage(t.generator.printCards, {
    count: printCount,
    plural: printPlural,
  });
  const downloadCount = selectedStudents.length || students.length;
  const downloadPlural = language === "en" && downloadCount !== 1 ? "s" : "";

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
          <TabsTrigger value="preview" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"><Eye className="w-4 h-4" /> {t.generator.previewTab}</TabsTrigger>
          <TabsTrigger value="students" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"><Users className="w-4 h-4" /> {formatMessage(t.generator.studentsTab, { count: students.length })}</TabsTrigger>
        </TabsList>

        {/* ---- PREVIEW TAB ---- */}
        <TabsContent value="preview">
          <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5" /> {t.generator.cardPreview}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Preview Student Selector */}
              {students.length > 1 && (
                <div className="mb-4">
                  <Label className="text-xs text-gray-500 mb-1 block">{t.generator.previewStudent}</Label>
                  <Select
                    value={previewStudent.studentId}
                    onValueChange={(id) => {
                      const s = students.find((x) => x.studentId === id);
                      if (s) setPreviewStudent(s);
                    }}
                  >
                    <SelectTrigger className="w-64 dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {students.slice(0, 50).map((s) => (
                        <SelectItem key={s.studentId} value={s.studentId}>
                          {s.name} ({s.studentCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#1A1A1A] dark:to-[#111111] rounded-xl">
                <StudentIdCard
                  student={previewStudent}
                  school={localSchool}
                  template={activeTemplate}
                  templateConfig={templateConfig}
                />
              </div>

              <div className="mt-6 flex justify-center gap-3">
                {autoDownload && (
                  <Button onClick={handleDownloadSelected} className="shadow-md" disabled={downloading || students.length === 0}>
                    {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    {formatMessage(t.generator.downloadPdfs, {
                      count: downloadCount,
                      plural: downloadPlural,
                    })}
                  </Button>
                )}
                <Button onClick={handlePrintAll} className="shadow-md" variant={autoDownload ? "outline" : "default"} disabled={students.length === 0}>
                  <Printer className="w-4 h-4 mr-2" />
                  {actionLabel}
                </Button>
                {!autoDownload && (
                  <Button variant="outline" onClick={handlePrintAll}>
                    <Download className="w-4 h-4 mr-2" />
                    {t.generator.downloadPdf}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- STUDENTS TAB ---- */}
        <TabsContent value="students">
          <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="w-5 h-5" /> {t.generator.selectStudents}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{formatMessage(t.generator.selectedCount, { count: selectedStudents.length })}</Badge>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedStudents.length === students.length ? t.generator.deselectAll : t.generator.selectAll}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">{t.generator.noStudentsTitle}</p>
                  <p className="text-sm">{t.generator.noStudentsDescription}</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {students.map((student) => (
                    <StudentRow
                      key={student.studentId}
                      student={student}
                      selected={selectedStudents.includes(student.studentId)}
                      templateConfig={templateConfig}
                      t={t}
                      downloading={downloading}
                      onToggle={() => toggleStudent(student.studentId)}
                      onDownload={
                        onDownloadSelected
                          ? () => onDownloadSelected([student.studentId])
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function StudentRow({
  student,
  selected,
  templateConfig,
  t,
  downloading,
  onToggle,
  onDownload,
}: {
  student: StudentIdCardData;
  selected: boolean;
  templateConfig?: StudentIdCardGeneratorProps["templateConfig"];
  t: any;
  downloading: boolean;
  onToggle: () => void;
  onDownload?: () => void | Promise<void>;
}) {
  const issues = getStudentCardIssues(student, templateConfig, t);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
        selected
          ? "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800"
          : "hover:bg-gray-50 dark:hover:bg-[#1A1A1A] dark:border-[#2A2A2A]"
      }`}
      onClick={onToggle}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        onClick={(event) => event.stopPropagation()}
        className="w-4 h-4 rounded accent-blue-600"
      />
      <InitialsAvatar name={student.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-medium dark:text-white truncate">{student.name}</p>
        <p className="text-xs text-gray-500">{student.studentCode || t.generator.noStudentId}</p>
        {issues.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {issues.slice(0, 3).map((issue) => (
              <Badge key={issue} variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                {issue}
              </Badge>
            ))}
            {issues.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{issues.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm font-medium dark:text-white">{t.generator.grade} {student.grade || "-"}-{student.section || "-"}</p>
        <p className="text-xs text-gray-500">{student.academicYear || t.generator.noYear}</p>
      </div>
      {onDownload && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={downloading || !student.studentId}
          onClick={(event) => {
            event.stopPropagation();
            void onDownload();
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export { StudentIdCard, cardTemplates };
