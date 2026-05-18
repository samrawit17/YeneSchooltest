"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import StudentIdCardGenerator, { StudentIdCardData, SchoolInfo } from "@/components/StudentIdCard";
import { studentsAPI, academicYearsAPI } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Loader2, Palette, Printer, RefreshCw, Save, Search, Upload, X } from "lucide-react";

type IdCardTemplate = {
  title: string;
  themeColor: string;
  schoolName: string;
  schoolPhone: string;
  schoolAddress: string;
  showEmergencyContact: boolean;
  showBloodGroup: boolean;
  useCustomBackground: boolean;
  customBackgroundUrl: string;
};

const defaultTemplate: IdCardTemplate = {
  title: "Student ID Card",
  themeColor: "#1B4F72",
  schoolName: "",
  schoolPhone: "",
  schoolAddress: "",
  showEmergencyContact: true,
  showBloodGroup: false,
  useCustomBackground: false,
  customBackgroundUrl: "",
};

export default function IdCardGeneratorPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentIdCardData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentIdCardData[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({ name: "", address: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [template, setTemplate] = useState<IdCardTemplate>(defaultTemplate);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [watermarkUploading, setWatermarkUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/sign-in");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAcademicYears();
      loadTemplate();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && selectedYear) loadStudents();
  }, [selectedYear]);

  useEffect(() => {
    let result = students;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(term) || s.studentCode.toLowerCase().includes(term));
    }
    if (filterGrade !== "all") result = result.filter((s) => s.grade === parseInt(filterGrade));
    if (filterSection !== "all") result = result.filter((s) => s.section === filterSection);
    setFilteredStudents(result);
  }, [searchTerm, filterGrade, filterSection, students]);

  async function loadAcademicYears() {
    try {
      const resp = await academicYearsAPI.getAll();
      const years = resp.data?.data || resp.data || [];
      setAcademicYears(years);
      setSelectedYear((years.find((y: any) => y.isActive) || years[0])?.id || "");
    } catch (error) {
      console.error("Failed to load academic years", error);
    }
  }

  async function loadTemplate() {
    try {
      const resp = await studentsAPI.getIdCardTemplate();
      setTemplate({ ...defaultTemplate, ...resp.data });
    } catch (error) {
      console.error("Failed to load ID card settings", error);
    }
  }

  async function loadStudents() {
    setLoading(true);
    try {
      const studentIdsParam = searchParams.get("studentIds");
      const params: any = {};
      if (selectedYear) params.academicYear = selectedYear;
      if (studentIdsParam) params.studentIds = studentIdsParam;
      const resp = await studentsAPI.getForIdCards(params);
      const data = resp.data;
      if (data.school) {
        setSchoolInfo({
          name: data.school.name || "",
          address: data.school.address || "",
          phone: data.school.phone || "",
          email: "",
          logo: data.school.logo || undefined,
          tagline: "Excellence in Education",
        });
      }
      const mapped: StudentIdCardData[] = (data.students || []).map((s: any) => ({
        studentId: s.studentId,
        studentCode: s.studentCode,
        name: s.name,
        grade: s.grade || 0,
        section: s.section || "N/A",
        academicYear: s.academicYear || data.academicYear || "",
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        bloodGroup: s.bloodGroup,
        address: s.address,
        phone: s.phone,
        email: s.email,
        photoUrl: s.photoUrl,
        rollNumber: s.rollNumber,
        emergencyContact: s.emergencyContact,
      }));
      setStudents(mapped);
      setFilteredStudents(mapped);
      if (studentIdsParam && mapped.length > 0) toast.success(`Loaded ${mapped.length} students from recent import`);
    } catch (error: any) {
      console.error("Failed to load students", error);
      if (error.response?.status !== 401) toast.error("Failed to load student data");
    } finally {
      setLoading(false);
    }
  }

  async function saveTemplate() {
    setTemplateSaving(true);
    try {
      const response = await studentsAPI.saveIdCardTemplate(template);
      setTemplate({ ...defaultTemplate, ...response.data });
      toast.success("ID card settings saved");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save ID card settings");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleWatermarkUpload(file?: File) {
    if (!file) return;
    setWatermarkUploading(true);
    try {
      const response = await studentsAPI.uploadIdCardWatermark(file);
      const url = response.data?.url || "";
      setTemplate((prev) => ({ ...prev, useCustomBackground: true, customBackgroundUrl: url }));
      toast.success("Watermark image uploaded");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to upload watermark image");
    } finally {
      setWatermarkUploading(false);
    }
  }

  async function handleDownloadAll() {
    try {
      const ids = filteredStudents.map((s) => s.studentId).filter(Boolean);
      if (!ids.length) {
        toast.error("No students available to download");
        return;
      }
      const resp = await studentsAPI.downloadIdCardsBulkPdf(ids);
      const blob = new Blob([resp.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "id-cards.zip";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("ID cards download started");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to download ID cards");
    }
  }

  const handleRefresh = useCallback(() => loadStudents(), [selectedYear]);
  const grades = Array.from(new Set(students.map((s) => s.grade).filter(Boolean))).sort((a, b) => a - b);
  const sections = Array.from(new Set(students.map((s) => s.section).filter(Boolean))).sort();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="px-3 py-6 sm:px-4 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Student ID Cards</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Generate professional student ID cards from school branding and student records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-[var(--brand-color,#e35336)] text-white hover:opacity-90" onClick={handleDownloadAll}>
              <Printer className="mr-2 h-4 w-4" />
              Download ID Cards
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-3 pb-6 sm:px-4 md:px-8">
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="w-full md:w-48">
                <Label className="mb-1 block text-xs text-gray-500">Academic Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="dark:border-slate-700 dark:bg-slate-800">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.id} value={y.id}>{y.name} {y.isActive ? "✓" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="mb-1 block text-xs text-gray-500">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or student code..." className="pl-9 dark:border-slate-700 dark:bg-slate-800" />
                </div>
              </div>
              <div className="w-full md:w-40">
                <Label className="mb-1 block text-xs text-gray-500">Grade</Label>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="dark:border-slate-700 dark:bg-slate-800"><SelectValue placeholder="All grades" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map((g) => <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-40">
                <Label className="mb-1 block text-xs text-gray-500">Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="dark:border-slate-700 dark:bg-slate-800"><SelectValue placeholder="All sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span>ID Card Settings</span>
              <Button size="sm" className="bg-[var(--brand-color,#e35336)] text-white hover:opacity-90" onClick={() => setPreviewOpen(true)}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </CardTitle>
            <CardDescription>Configure the generated card branding. Student data and QR codes are rendered automatically.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs text-gray-500">Title</Label>
              <Input value={template.title} onChange={(e) => setTemplate((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-gray-500">Theme Color</Label>
              <div className="flex gap-2">
                <input type="color" value={template.themeColor} onChange={(e) => setTemplate((p) => ({ ...p, themeColor: e.target.value }))} className="h-10 w-12 rounded border border-slate-300 bg-white p-1" />
                <Input value={template.themeColor} onChange={(e) => setTemplate((p) => ({ ...p, themeColor: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-gray-500">School Name</Label>
              <Input value={template.schoolName} onChange={(e) => setTemplate((p) => ({ ...p, schoolName: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-gray-500">School Phone</Label>
              <Input value={template.schoolPhone} onChange={(e) => setTemplate((p) => ({ ...p, schoolPhone: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1 block text-xs text-gray-500">School Address</Label>
              <Input value={template.schoolAddress} onChange={(e) => setTemplate((p) => ({ ...p, schoolAddress: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <input type="checkbox" checked={template.showEmergencyContact} onChange={(e) => setTemplate((p) => ({ ...p, showEmergencyContact: e.target.checked }))} />
              <span className="text-sm font-medium">Show emergency contact</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <input type="checkbox" checked={template.showBloodGroup} onChange={(e) => setTemplate((p) => ({ ...p, showBloodGroup: e.target.checked }))} />
              <span className="text-sm font-medium">Show blood group</span>
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 md:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={template.useCustomBackground} onChange={(e) => setTemplate((p) => ({ ...p, useCustomBackground: e.target.checked }))} />
                <span className="text-sm font-semibold">Use custom background image (Advanced)</span>
              </label>
              {template.useCustomBackground && (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800">
                    {watermarkUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload watermark
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={watermarkUploading}
                      onChange={(e) => handleWatermarkUpload(e.target.files?.[0])}
                    />
                  </Label>
                  <span className="truncate text-xs text-slate-500">
                    {template.customBackgroundUrl ? template.customBackgroundUrl : "No watermark uploaded"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end md:col-span-2">
              <Button className="bg-[var(--brand-color,#e35336)] text-white hover:opacity-90" onClick={saveTemplate} disabled={templateSaving}>
                {templateSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" />
              <p className="text-gray-500">Loading students...</p>
            </CardContent>
          </Card>
        ) : (
          <StudentIdCardGenerator
            students={filteredStudents}
            school={{
              name: template.schoolName || schoolInfo.name,
              address: template.schoolAddress || schoolInfo.address,
              phone: template.schoolPhone || schoolInfo.phone,
              email: "",
              logo: schoolInfo.logo,
              tagline: schoolInfo.tagline,
            }}
            templateConfig={template}
            autoDownload
          />
        )}
      </div>

      {mounted && createPortal(previewOpen ? (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/50 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold dark:text-white"><Palette className="h-4 w-4" /> Generated ID Card Preview</h3>
              <button onClick={() => setPreviewOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <IdCardPreview template={template} />
          </div>
        </div>
      ) : null, document.body)}
    </div>
  );
}

function IdCardPreview({ template }: { template: IdCardTemplate }) {
  const watermarkSrc = template.useCustomBackground ? resolveAssetUrl(template.customBackgroundUrl) : undefined;
  return (
    <div className="relative aspect-[1.586/1] overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
      {watermarkSrc && (
        <img src={watermarkSrc} alt="" className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[58%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-10" />
      )}
      <div className="relative z-10 flex h-[23%] items-center justify-between px-5 text-white" style={{ backgroundColor: template.themeColor }}>
        <div className="flex h-10 w-10 items-center justify-center rounded bg-white/95 text-[10px] text-slate-500">LOGO</div>
          <div className="min-w-0 flex-1 px-3">
            <div className="truncate text-lg font-bold">{template.schoolName || "School Name"}</div>
            <div className="truncate text-[11px] opacity-90">
              {[template.schoolPhone, template.schoolAddress].filter(Boolean).join(" • ") || "Phone • Address"}
            </div>
          </div>
        <div className="text-right text-xs font-semibold">{template.title}</div>
      </div>
      <div className="relative z-10 grid grid-cols-[96px_1fr_68px] gap-4 p-5">
        <div className="flex h-28 items-center justify-center rounded-lg border text-xs text-slate-500">PHOTO</div>
        <div className="space-y-2 text-sm">
          <div className="text-lg font-bold" style={{ color: template.themeColor }}>Abebe Kebede</div>
          <div><b>ID:</b> STU-00123</div>
          <div><b>Class:</b> Grade 8 A</div>
          <div><b>Academic Year:</b> 2016</div>
          {template.showBloodGroup && <div><b>Blood Group:</b> O+</div>}
          {template.showEmergencyContact && <div><b>Emergency:</b> 0911000000</div>}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="grid h-14 w-14 place-items-center rounded border text-xs">QR</div>
          <span className="text-[10px] text-slate-500">Scan to verify</span>
        </div>
      </div>
      <div className="relative z-10 flex items-end justify-between bg-slate-50 px-5 py-2 text-[11px] text-slate-500">
        <div className="w-28 text-center">
          <div className="mb-1 border-t border-slate-400" />
          <span>School Stamp</span>
        </div>
        <div className="w-36 text-center">
          <div className="mb-1 border-t border-slate-400" />
          <span>Principal Signature</span>
        </div>
      </div>
    </div>
  );
}
