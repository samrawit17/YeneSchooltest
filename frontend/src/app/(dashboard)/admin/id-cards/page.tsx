"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import StudentIdCardGenerator, { StudentIdCardData, SchoolInfo } from "@/components/StudentIdCard";
import { studentsAPI, academicYearsAPI, classesAPI } from "@/lib/api";
import { templatesAPI } from "@/lib/api/templates";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Users,
  Printer,
  RefreshCw,
  Search,
  Loader2,
  Eye,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";

type IdCardTemplate = {
  title: string;
  templateBackgroundUrl: string;
  schoolName: string;
  schoolPhone: string;
  schoolAddress: string;
  schoolEmail: string;
  schoolLogoUrl: string;
};
type FieldMapRow = {
  field_key: string;
  x_percent: number;
  y_percent: number;
  font_size: number;
  width_percent?: number;
  height_percent?: number;
};

export default function IdCardGeneratorPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<StudentIdCardData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentIdCardData[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: "",
    address: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [template, setTemplate] = useState<IdCardTemplate>({
    title: "Student ID Card",
    templateBackgroundUrl: "",
    schoolName: "",
    schoolPhone: "",
    schoolAddress: "",
    schoolEmail: "",
    schoolLogoUrl: "",
  });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [templateRecordId, setTemplateRecordId] = useState<string>("");
  const [fieldMap, setFieldMap] = useState<FieldMapRow[]>([
    { field_key: "student_name", x_percent: 8, y_percent: 38, font_size: 13 },
    { field_key: "student_code", x_percent: 8, y_percent: 44, font_size: 10 },
    { field_key: "class", x_percent: 8, y_percent: 50, font_size: 10 },
    { field_key: "school_name", x_percent: 8, y_percent: 16, font_size: 11 },
    { field_key: "photo", x_percent: 74, y_percent: 28, font_size: 10, width_percent: 18, height_percent: 30 },
    { field_key: "qr_code", x_percent: 74, y_percent: 72, font_size: 10, width_percent: 14, height_percent: 20 },
  ]);

  // Redirect if not authenticated
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadAcademicYears();
      loadTemplate();
    }
  }, [isAuthenticated]);

  // Load students when year changes
  useEffect(() => {
    if (isAuthenticated && selectedYear) {
      loadStudents();
    }
  }, [selectedYear]);

  // Apply filters
  useEffect(() => {
    let result = students;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.studentCode.toLowerCase().includes(term)
      );
    }

    if (filterGrade !== "all") {
      result = result.filter((s) => s.grade === parseInt(filterGrade));
    }

    if (filterSection !== "all") {
      result = result.filter((s) => s.section === filterSection);
    }

    setFilteredStudents(result);
  }, [searchTerm, filterGrade, filterSection, students]);

  async function loadAcademicYears() {
    try {
      const resp = await academicYearsAPI.getAll();
      const years = resp.data?.data || resp.data || [];
      setAcademicYears(years);
      const active = years.find((y: any) => y.isActive);
      if (active) {
        setSelectedYear(active.id);
      } else if (years.length > 0) {
        setSelectedYear(years[0].id);
      }
    } catch (error) {
      console.error("Failed to load academic years", error);
    }
  }

  async function loadStudents() {
    setLoading(true);
    try {
      // Check for pre-selected student IDs from URL (e.g., from bulk upload redirect)
      const studentIdsParam = searchParams.get("studentIds");

      const params: any = {};
      if (selectedYear) params.academicYear = selectedYear;
      if (studentIdsParam) params.studentIds = studentIdsParam;

      const resp = await studentsAPI.getForIdCards(params);
      const data = resp.data;

      // Set school info from response
      if (data.school) {
        setSchoolInfo({
          name: data.school.name || "",
          address: data.school.address || "",
          phone: data.school.phone || "",
          email: data.school.email || "",
          logo: data.school.logo || undefined,
          tagline: "Excellence in Education",
        });
      }

      // Map students
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

      if (studentIdsParam && mapped.length > 0) {
        toast.success(`Loaded ${mapped.length} students from recent import`);
      }
    } catch (error: any) {
      console.error("Failed to load students", error);
      if (error.response?.status !== 401) {
        toast.error("Failed to load student data");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplate() {
    try {
      const templateResp = await templatesAPI.list("ID_CARD");
      const active = (templateResp.data || []).find((t) => t.isActive) || (templateResp.data || [])[0];
      const templateData = active || {};
      if (active) setTemplateRecordId(active.id);
      let map: any[] = [];
      try {
        map = active?.fieldMapJson ? JSON.parse(active.fieldMapJson) : [];
      } catch {}
      const kv: Record<string, string> = {};
      for (const row of map) {
        if (row?.field_key && row?.value) kv[row.field_key] = String(row.value);
      }
      const posRows = map.filter((r) => r?.field_key && typeof r?.x_percent === "number" && typeof r?.y_percent === "number");
      if (posRows.length) {
        setFieldMap(
          posRows.map((r) => ({
            field_key: String(r.field_key),
            x_percent: Number(r.x_percent),
            y_percent: Number(r.y_percent),
            font_size: Number(r.font_size || 10),
            width_percent: r.width_percent !== undefined ? Number(r.width_percent) : r.w_percent !== undefined ? Number(r.w_percent) : undefined,
            height_percent: r.height_percent !== undefined ? Number(r.height_percent) : r.h_percent !== undefined ? Number(r.h_percent) : undefined,
          }))
        );
      }

      setTemplate((prev) => ({
        ...prev,
        ...{
          title: kv.title || active?.name || prev.title,
          templateBackgroundUrl: active?.backgroundUrl || "",
          schoolName: kv.schoolName || prev.schoolName,
          schoolPhone: kv.schoolPhone || prev.schoolPhone,
          schoolAddress: kv.schoolAddress || prev.schoolAddress,
          schoolEmail: kv.schoolEmail || prev.schoolEmail,
          schoolLogoUrl: kv.schoolLogoUrl || prev.schoolLogoUrl,
        },
        title:
          (kv.title && String(kv.title).trim()) ||
          `${kv.schoolName || prev.schoolName || "School"} ID Card`,
      }));
    } catch (error) {
      console.error("Failed to load ID card template", error);
    }
  }

  async function saveTemplate() {
    setTemplateSaving(true);
    try {
      if (!templateRecordId) {
        toast.error("No ID card template found. Activate one from Template Manager.");
        return;
      }
      const requiredFields = ["student_name", "photo", "qr_code"];
      const missingFields = requiredFields.filter((key) => !fieldMap.some((row) => row.field_key === key));
      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(", ")}`);
        return;
      }
      await templatesAPI.saveFields(templateRecordId, [
        { field_key: "title", value: template.title },
        { field_key: "schoolName", value: template.schoolName },
        { field_key: "schoolPhone", value: template.schoolPhone },
        { field_key: "schoolAddress", value: template.schoolAddress },
        { field_key: "schoolEmail", value: template.schoolEmail },
        { field_key: "schoolLogoUrl", value: template.schoolLogoUrl },
        ...fieldMap.map((f) => ({
          field_key: f.field_key,
          x_percent: f.x_percent,
          y_percent: f.y_percent,
          font_size: f.font_size,
          width_percent: f.width_percent,
          height_percent: f.height_percent,
          w_percent: f.width_percent,
          h_percent: f.height_percent,
          font_color: "#000000",
          bold: false,
          italic: false,
          align: "left",
        })),
      ]);
      toast.success("ID card template saved");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save template");
    } finally {
      setTemplateSaving(false);
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

  const handleRefresh = useCallback(() => {
    loadStudents();
  }, [selectedYear]);

  const grades = Array.from(new Set(students.map((s) => s.grade).filter(Boolean))).sort(
    (a, b) => a - b
  );
  const sections = Array.from(new Set(students.map((s) => s.section).filter(Boolean))).sort();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-transparent">
        <div className="px-3 sm:px-4 md:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-black">
                  Student ID Card Generator
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Generate, customize, and print professional student ID cards
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-[var(--brand-color,#e35336)] hover:opacity-90 text-white" onClick={handleDownloadAll}>
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
      </div>

      <div className="px-3 sm:px-4 md:px-8 py-6 space-y-6">
        {/* Filters */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Academic Year */}
              <div className="w-full md:w-48">
                <Label className="text-xs text-gray-500 mb-1 block">Academic Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name} {y.isActive ? "✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="flex-1">
                <Label className="text-xs text-gray-500 mb-1 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or student code..."
                    className="pl-9 dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Grade */}
              <div className="w-full md:w-40">
                <Label className="text-xs text-gray-500 mb-1 block">Grade</Label>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="All grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map((g) => (
                      <SelectItem key={g} value={g.toString()}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section */}
              <div className="w-full md:w-40">
                <Label className="text-xs text-gray-500 mb-1 block">Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s}>
                        Section {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>ID Card Template</span>
              <Button size="sm" className="bg-[var(--brand-color,#e35336)] hover:opacity-90 text-white" onClick={() => setPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                View Preview
              </Button>
            </CardTitle>
            <CardDescription>Configure field placement for the active ID card template.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Title</Label>
              <Input value={template.title} onChange={(e) => setTemplate((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-gray-500 mb-1 block">Template Background URL</Label>
              <div className="flex flex-col gap-2">
                <Input value={template.templateBackgroundUrl} readOnly />
                <Button type="button" variant="outline" className="w-fit" onClick={() => router.push("/admin/templates")}>
                  Manage Templates
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">School Name</Label>
              <Input value={template.schoolName} onChange={(e) => setTemplate((p) => ({ ...p, schoolName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">School Phone</Label>
              <Input value={template.schoolPhone} onChange={(e) => setTemplate((p) => ({ ...p, schoolPhone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">School Email</Label>
              <Input value={template.schoolEmail} onChange={(e) => setTemplate((p) => ({ ...p, schoolEmail: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-gray-500 mb-1 block">School Address</Label>
              <Input value={template.schoolAddress} onChange={(e) => setTemplate((p) => ({ ...p, schoolAddress: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button className="bg-[var(--brand-color,#e35336)] hover:opacity-90 text-white" onClick={saveTemplate} disabled={templateSaving}>
                {templateSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Template
              </Button>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs text-gray-500 block">Field Placement</Label>
              <p className="text-xs text-gray-500">
                Use percentage of template size: <strong>Left</strong> = horizontal position, <strong>Top</strong> = vertical position, <strong>Font</strong> = text size.
              </p>
              <div className="hidden md:grid grid-cols-6 gap-2 text-[11px] font-medium text-gray-500 px-1">
                <span>Field Name</span>
                <span>Left (%)</span>
                <span>Top (%)</span>
                <span>Font Size (px)</span>
                <span>Width (%)</span>
                <span>Height (%)</span>
              </div>
              {fieldMap.map((row, idx) => (
                <div key={row.field_key} className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  <Input value={row.field_key} readOnly className="bg-slate-100 dark:bg-slate-800" />
                  <Input type="number" min={0} max={100} placeholder="Left (%)" value={row.x_percent} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, x_percent: Number(e.target.value) } : r))} />
                  <Input type="number" min={0} max={100} placeholder="Top (%)" value={row.y_percent} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, y_percent: Number(e.target.value) } : r))} />
                  <Input type="number" min={8} max={36} placeholder="Font Size (px)" value={row.font_size} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, font_size: Number(e.target.value) } : r))} />
                  <Input type="number" min={0} max={100} placeholder="Width (%)" value={row.width_percent ?? ""} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, width_percent: e.target.value === "" ? undefined : Number(e.target.value) } : r))} />
                  <Input type="number" min={0} max={100} placeholder="Height (%)" value={row.height_percent ?? ""} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, height_percent: e.target.value === "" ? undefined : Number(e.target.value) } : r))} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ID Card Generator */}
        {loading ? (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
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
              email: template.schoolEmail || schoolInfo.email,
              logo: template.schoolLogoUrl || schoolInfo.logo,
              tagline: schoolInfo.tagline,
            }}
            templateConfig={template}
            autoDownload
          />
        )}
      </div>

      {mounted &&
        createPortal(
          <>
            {previewOpen && (
              <div className="fixed inset-0 z-[11000] bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewOpen(false)}>
                <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold dark:text-white">ID Card Template Preview</h3>
                    <button
                      onClick={() => setPreviewOpen(false)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative overflow-hidden rounded-lg border border-slate-300 bg-white">
                    {template.templateBackgroundUrl ? (
                      <img src={template.templateBackgroundUrl} alt="ID template preview" className="w-full h-auto object-contain" />
                    ) : (
                      <div className="aspect-[1.586/1] w-full bg-slate-100" />
                    )}
                    <div className="absolute inset-0 p-4 text-xs">
                      {fieldMap.map((row) => {
                        if (row.field_key === "photo") {
                          return (
                            <div
                              key={row.field_key}
                              className="absolute overflow-hidden rounded bg-slate-200"
                              style={{ left: `${row.x_percent}%`, top: `${row.y_percent}%`, width: `${row.width_percent ?? 18}%`, height: `${row.height_percent ?? 30}%` }}
                            />
                          );
                        }
                        if (row.field_key === "qr_code") {
                          return (
                            <div
                              key={row.field_key}
                              className="absolute grid place-items-center rounded bg-white border border-slate-300 text-[10px]"
                              style={{ left: `${row.x_percent}%`, top: `${row.y_percent}%`, width: `${row.width_percent ?? 14}%`, height: `${row.height_percent ?? 20}%` }}
                            >
                              QR
                            </div>
                          );
                        }
                        const text = (
                          {
                            student_name: "Abel Kebede",
                            student_code: "STU-00123",
                            class: "Grade 8 - A",
                            school_name: template.schoolName || "School Name",
                          } as Record<string, string>
                        )[row.field_key];
                        if (!text) return null;
                        return (
                          <div
                            key={row.field_key}
                            className="absolute text-slate-900"
                            style={{ left: `${row.x_percent}%`, top: `${row.y_percent}%`, fontSize: `${row.font_size}px` }}
                          >
                            {row.field_key === "school_name" ? (
                              <span className="inline-block rounded bg-[var(--brand-color,#e35336)] px-2 py-1 font-semibold text-white">
                                {template.title || "Student ID Card"}
                              </span>
                            ) : text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body
        )}
    </div>
  );
}
