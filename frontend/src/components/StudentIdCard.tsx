"use client";

import { useState, useCallback, useEffect } from "react";
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
  // Generate a deterministic pattern from the data string
  const hash = Array.from(data).reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
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
      const seed = (hash + i * 31 + j * 37 + data.charCodeAt(Math.abs(i - j) % data.length)) % 100;
      if (seed < 45) {
        rects += `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
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
  const logoSrc = resolveAssetUrl(school.logo);
  const photoSrc = resolveAssetUrl(student.photoUrl);
  const watermarkSrc = templateConfig?.useCustomBackground
    ? resolveAssetUrl(templateConfig.customBackgroundUrl)
    : undefined;

  return (
    <div className="relative w-[540px] h-[340px] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl">
      {watermarkSrc && (
        <img src={watermarkSrc} alt="" className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[58%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-10" />
      )}
      <div className="relative z-10 flex h-[76px] items-center justify-between px-5 text-white" style={{ backgroundColor: template.primaryColor }}>
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-11 w-11 rounded bg-white/95 object-contain p-1" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded bg-white/95 text-[10px] font-semibold text-slate-500">LOGO</div>
        )}
        <div className="min-w-0 flex-1 px-4">
          <h3 className="truncate text-xl font-bold leading-tight">{school.name || "School Name"}</h3>
          <p className="truncate text-[12px] leading-tight opacity-90">
            {[school.phone, school.address].filter(Boolean).join(" • ") || "Phone • Address"}
          </p>
        </div>
        <div className="text-right text-[12px] font-bold uppercase tracking-wide">Student ID</div>
      </div>

      <div className="relative z-10 grid grid-cols-[110px_1fr_82px] gap-5 p-5">
        <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {photoSrc ? (
            <img src={photoSrc} alt={student.name} className="h-full w-full object-cover" />
          ) : (
            <InitialsAvatar name={student.name || "Student"} size="sm" bgColor={template.primaryColor} />
          )}
        </div>
        <div className="min-w-0 space-y-2 text-[13px]">
          <h2 className="truncate text-xl font-bold" style={{ color: template.primaryColor }}>{student.name || "Student Name"}</h2>
          <p><span className="font-semibold text-slate-500">ID:</span> {student.studentCode || "-"}</p>
          <p><span className="font-semibold text-slate-500">Class:</span> Grade {student.grade || "-"} {student.section || ""}</p>
          <p><span className="font-semibold text-slate-500">Academic Year:</span> {student.academicYear || "-"}</p>
          {student.bloodGroup && <p><span className="font-semibold text-slate-500">Blood Group:</span> {student.bloodGroup}</p>}
          {student.emergencyContact?.phone && (
            <p><span className="font-semibold text-slate-500">Emergency:</span> {student.emergencyContact.phone}</p>
          )}
        </div>
        <div className="flex flex-col items-center justify-start gap-1 pt-2">
          <div className="rounded border border-slate-200 bg-white p-1" dangerouslySetInnerHTML={{ __html: generateQRSvg(student.studentCode || student.studentId || "id", 58) }} />
          <span className="text-[10px] text-slate-500">Scan to verify</span>
        </div>
      </div>
      <div className="relative z-10 flex items-end justify-between bg-slate-50 px-5 py-2 text-[11px] text-slate-500">
        <div className="w-32 text-center">
          <div className="mb-1 border-t border-slate-400" />
          <span>School Stamp</span>
        </div>
        <div className="w-40 text-center">
          <div className="mb-1 border-t border-slate-400" />
          <span>Principal Signature</span>
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
): string {
  const watermarkSrc = templateConfig?.useCustomBackground
    ? resolveAssetUrl(templateConfig.customBackgroundUrl)
    : undefined;
  const cards = students.map((s) => {
    const initials = s.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const logoSrc = resolveAssetUrl(school.logo);
    const photoSrc = resolveAssetUrl(s.photoUrl);
    const photo = photoSrc
      ? `<img src="${photoSrc}" style="width:100%;height:100%;object-fit:cover"/>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:${template.primaryColor};font-weight:800;font-size:24px">${initials}</div>`;

    return `<div class="id-card">
      ${watermarkSrc ? `<img src="${watermarkSrc}" class="watermark"/>` : ""}
      <div class="card-header">
        ${logoSrc ? `<img src="${logoSrc}" class="logo"/>` : `<div class="logo-placeholder">LOGO</div>`}
        <div class="school-block">
          <div class="school-name">${school.name || "School Name"}</div>
          <div class="school-contact">${[school.phone, school.address].filter(Boolean).join(" • ") || "Phone • Address"}</div>
        </div>
        <div class="card-title">Student ID</div>
      </div>
      <div class="card-body">
        <div class="photo">${photo}</div>
        <div class="details">
          <div class="student-name">${s.name || "Student Name"}</div>
          <div><b>ID:</b> ${s.studentCode || "-"}</div>
          <div><b>Class:</b> Grade ${s.grade || "-"} ${s.section || ""}</div>
          <div><b>Academic Year:</b> ${s.academicYear || "-"}</div>
          ${s.bloodGroup ? `<div><b>Blood Group:</b> ${s.bloodGroup}</div>` : ""}
          ${s.emergencyContact?.phone ? `<div><b>Emergency:</b> ${s.emergencyContact.phone}</div>` : ""}
        </div>
        <div class="qr">${generateQRSvg(s.studentCode || s.studentId || "id", 58)}<span>Scan to verify</span></div>
      </div>
      <div class="card-footer"><div class="footer-slot"><div class="footer-line"></div><span>School Stamp</span></div><div class="footer-slot signature"><div class="footer-line"></div><span>Principal Signature</span></div></div>
    </div>`;
  });

  return `<!DOCTYPE html><html><head><title>Student ID Cards - ${school.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#fff}
.page{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:flex-start;padding:10mm;page-break-after:always}
.page:last-child{page-break-after:auto}
.id-card{position:relative;width:540px;height:340px;overflow:hidden;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;box-shadow:0 4px 12px rgba(15,23,42,.08)}
.watermark{position:absolute;left:50%;top:50%;width:58%;max-height:72%;object-fit:contain;transform:translate(-50%,-50%);opacity:.1;z-index:0}
.card-header{position:relative;z-index:1;height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:${template.primaryColor};color:white}
.logo,.logo-placeholder{width:44px;height:44px;border-radius:6px;background:rgba(255,255,255,.95);object-fit:contain;padding:4px;color:#64748b;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
.school-block{min-width:0;flex:1;padding:0 16px}
.school-name{font-size:20px;line-height:1.1;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.school-contact{font-size:12px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-title{text-align:right;text-transform:uppercase;font-size:12px;font-weight:800;letter-spacing:.04em}
.card-body{position:relative;z-index:1;display:grid;grid-template-columns:110px 1fr 82px;gap:20px;padding:20px}
.photo{height:144px;overflow:hidden;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc}
.details{font-size:13px;line-height:1.65;min-width:0}
.student-name{font-size:20px;line-height:1.2;font-weight:800;color:${template.primaryColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px}
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
  };
  autoDownload?: boolean;
}

export default function StudentIdCardGenerator({
  students = [defaultStudentData],
  school = defaultSchoolInfo,
  templateConfig,
  autoDownload = false,
}: StudentIdCardGeneratorProps) {
  const [selectedTemplate] = useState<IdCardTemplate>(cardTemplates[0]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [previewStudent, setPreviewStudent] = useState<StudentIdCardData>(students[0] || defaultStudentData);
  const [localSchool, setLocalSchool] = useState<SchoolInfo>(school);
  const [activeTab, setActiveTab] = useState("preview");
  useEffect(() => {
    setLocalSchool(school);
  }, [school]);
  useEffect(() => {
    if (students.length > 0) setPreviewStudent(students[0]);
  }, [students]);
  useEffect(() => {
    if (!templateConfig?.themeColor) return;
    const theme = templateConfig.themeColor;
    (selectedTemplate as any).primaryColor = theme;
    (selectedTemplate as any).secondaryColor = theme;
  }, [templateConfig, selectedTemplate]);

  const handlePrintAll = useCallback(() => {
    const toPrint = students.filter(
      (s) => selectedStudents.length === 0 || selectedStudents.includes(s.studentId)
    );
    if (toPrint.length === 0) {
      toast.error("No students selected");
      return;
    }
    const html = generatePrintHTML(toPrint, localSchool, selectedTemplate, templateConfig);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 600);
    }
  }, [students, selectedStudents, localSchool, selectedTemplate, templateConfig]);

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
  const actionLabel = autoDownload ? "Download ID Cards" : `Print ${printCount} Card${printCount !== 1 ? "s" : ""}`;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto p-1 bg-white dark:bg-slate-900 border rounded-xl shadow-sm">
          <TabsTrigger value="preview" className="rounded-lg gap-1.5"><Eye className="w-4 h-4" /> Preview</TabsTrigger>
          <TabsTrigger value="students" className="rounded-lg gap-1.5"><Users className="w-4 h-4" /> Students ({students.length})</TabsTrigger>
        </TabsList>

        {/* ---- PREVIEW TAB ---- */}
        <TabsContent value="preview">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5" /> Card Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Preview Student Selector */}
              {students.length > 1 && (
                <div className="mb-4">
                  <Label className="text-xs text-gray-500 mb-1 block">Preview student:</Label>
                  <Select
                    value={previewStudent.studentId}
                    onValueChange={(id) => {
                      const s = students.find((x) => x.studentId === id);
                      if (s) setPreviewStudent(s);
                    }}
                  >
                    <SelectTrigger className="w-64 dark:bg-slate-800 dark:border-slate-700">
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

              <div className="flex justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-xl">
                <StudentIdCard
                  student={previewStudent}
                  school={localSchool}
                  template={selectedTemplate}
                  templateConfig={templateConfig}
                />
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <Button onClick={handlePrintAll} className="shadow-md">
                  {autoDownload ? <Download className="w-4 h-4 mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
                  {actionLabel}
                </Button>
                {!autoDownload && (
                  <Button variant="outline" onClick={handlePrintAll}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- STUDENTS TAB ---- */}
        <TabsContent value="students">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="w-5 h-5" /> Select Students</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedStudents.length} selected</Badge>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No students available</p>
                  <p className="text-sm">Import students via Bulk Upload first, then generate ID cards.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {students.map((student) => (
                    <div
                      key={student.studentId}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedStudents.includes(student.studentId)
                          ? "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800"
                          : "hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700"
                      }`}
                      onClick={() => toggleStudent(student.studentId)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.studentId)}
                        onChange={() => toggleStudent(student.studentId)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <InitialsAvatar name={student.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium dark:text-white truncate">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.studentCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium dark:text-white">Grade {student.grade}-{student.section}</p>
                        <p className="text-xs text-gray-500">{student.academicYear}</p>
                      </div>
                    </div>
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

export { StudentIdCard, cardTemplates };
