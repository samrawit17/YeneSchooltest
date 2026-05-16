"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, Eye, Loader2, Save, Settings2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { templatesAPI } from "@/lib/api/templates";
import { createPortal } from "react-dom";
import { schoolsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type CertificateTemplateForm = {
  title: string;
  templateBackgroundUrl: string;
  principalName: string;
  schoolName: string;
  schoolPhone: string;
  schoolAddress: string;
  schoolLogoUrl: string;
  headerLeftText: string;
  headerCenterText: string;
  headerRightText: string;
  bodyText: string;
  footerLeftText: string;
  footerCenterText: string;
  footerRightText: string;
  headerHeight: number;
  bodyHeight: number;
  footerHeight: number;
  bodyWidth: number;
  showStudentPhoto: boolean;
};
type FieldMapRow = {
  field_key: string;
  x_percent: number;
  y_percent: number;
  font_size: number;
  width_percent?: number;
  height_percent?: number;
};

const defaultForm: CertificateTemplateForm = {
  title: "Student Result Certificate",
  templateBackgroundUrl: "",
  principalName: "",
  schoolName: "",
  schoolPhone: "",
  schoolAddress: "",
  schoolLogoUrl: "",
  headerLeftText: "{{school_name}}",
  headerCenterText: "{{title}}",
  headerRightText: "Date: {{issue_date}}",
  bodyText:
    "This is to certify that {{student_name}} of {{class}} has successfully completed {{term}} in {{academic_year}} with total marks {{total_marks}} and rank {{rank}}.",
  footerLeftText: "{{school_address}}",
  footerCenterText: "",
  footerRightText: "Principal: {{principal_name}}",
  headerHeight: 18,
  bodyHeight: 58,
  footerHeight: 16,
  bodyWidth: 82,
  showStudentPhoto: false,
};

const placeholderGroups = [
  {
    label: "Student",
    tokens: ["{{student_name}}", "{{class}}", "{{section}}"],
  },
  {
    label: "Result",
    tokens: ["{{academic_year}}", "{{term}}", "{{total_marks}}", "{{percentage}}", "{{grade}}", "{{rank}}"],
  },
  {
    label: "School",
    tokens: ["{{school_name}}", "{{school_address}}", "{{school_phone}}", "{{principal_name}}"],
  },
  {
    label: "Document",
    tokens: ["{{issue_date}}", "{{cert_id}}"],
  },
];

const resultCertificatePreset: Pick<
  CertificateTemplateForm,
  | "title"
  | "headerLeftText"
  | "headerCenterText"
  | "headerRightText"
  | "bodyText"
  | "footerLeftText"
  | "footerCenterText"
  | "footerRightText"
  | "headerHeight"
  | "bodyHeight"
  | "footerHeight"
  | "bodyWidth"
  | "showStudentPhoto"
> = {
  title: "Certificate of Academic Achievement",
  headerLeftText: "{{school_name}}",
  headerCenterText: "Certificate of Academic Achievement",
  headerRightText: "Issued: {{issue_date}}",
  bodyText:
    "This certificate is proudly presented to {{student_name}}, a student of {{class}} Section {{section}}, for successful completion of {{term}} in the {{academic_year}} academic year.\n\nThe student achieved {{total_marks}} total marks, {{percentage}} overall percentage, grade {{grade}}, and class rank {{rank}}.\n\nThis certificate is issued as an official academic record of achievement.",
  footerLeftText: "{{school_address}}",
  footerCenterText: "Certificate ID: {{cert_id}}",
  footerRightText: "Principal: {{principal_name}}",
  headerHeight: 18,
  bodyHeight: 58,
  footerHeight: 14,
  bodyWidth: 76,
  showStudentPhoto: true,
};

export default function CertificateTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<CertificateTemplateForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [templateRecordId, setTemplateRecordId] = useState<string>("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [placeholdersOpen, setPlaceholdersOpen] = useState(false);
  const [fieldMap, setFieldMap] = useState<FieldMapRow[]>([
    { field_key: "school_logo", x_percent: 12, y_percent: 14, font_size: 10, width_percent: 10, height_percent: 14 },
    { field_key: "student_name", x_percent: 12, y_percent: 34, font_size: 14 },
    { field_key: "class", x_percent: 12, y_percent: 40, font_size: 11 },
    { field_key: "academic_year", x_percent: 12, y_percent: 45, font_size: 11 },
    { field_key: "term", x_percent: 12, y_percent: 50, font_size: 11 },
    { field_key: "total_marks", x_percent: 12, y_percent: 55, font_size: 11 },
    { field_key: "ranking", x_percent: 34, y_percent: 55, font_size: 11 },
    { field_key: "marks_table", x_percent: 12, y_percent: 62, font_size: 10, width_percent: 70, height_percent: 30 },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPdfTemplate = form.templateBackgroundUrl.toLowerCase().endsWith(".pdf");

  const sampleFieldValue = (fieldKey: string) => {
    switch (fieldKey) {
      case "student_name":
        return "Abel Kebede";
      case "class":
      case "grade":
        return "Grade 8 - A";
      case "academic_year":
        return "2018";
      case "term":
        return "Term 2";
      case "total_marks":
        return "487";
      case "percentage":
        return "91.5%";
      case "grade":
        return "A";
      case "ranking":
      case "rank":
        return "3";
      case "school_name":
        return form.schoolName || "Your School Name";
      case "school_address":
        return form.schoolAddress || "School Address";
      case "school_phone":
        return form.schoolPhone || "School Phone";
      case "title":
        return form.title || "Student Result Certificate";
      case "principal_name":
        return form.principalName || "Principal Name";
      case "issue_date":
        return new Date().toISOString().slice(0, 10);
      case "section":
        return "A";
      case "cert_id":
        return "CERT-0001";
      default:
        return "";
    }
  };

  const renderSampleText = (value: string) =>
    value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => sampleFieldValue(key) || `{{${key}}}`);

  const applyResultCertificatePreset = () => {
    setForm((prev) => ({
      ...prev,
      ...resultCertificatePreset,
    }));
    setFieldMap([
      { field_key: "school_logo", x_percent: 8, y_percent: 8, font_size: 10, width_percent: 9, height_percent: 12 },
      { field_key: "student_name", x_percent: 42, y_percent: 38, font_size: 16 },
      { field_key: "class", x_percent: 42, y_percent: 44, font_size: 11 },
      { field_key: "academic_year", x_percent: 42, y_percent: 49, font_size: 11 },
      { field_key: "term", x_percent: 42, y_percent: 54, font_size: 11 },
      { field_key: "total_marks", x_percent: 42, y_percent: 59, font_size: 11 },
      { field_key: "ranking", x_percent: 58, y_percent: 59, font_size: 11 },
      { field_key: "marks_table", x_percent: 16, y_percent: 66, font_size: 10, width_percent: 68, height_percent: 20 },
    ]);
    toast.success("Result certificate design applied");
  };

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const [response, schoolResponse] = await Promise.all([
          templatesAPI.list("CERTIFICATE"),
          user?.schoolId ? schoolsAPI.getById(user.schoolId) : Promise.resolve({ data: null }),
        ]);
        const school = schoolResponse?.data;
        const active = (response.data || []).find((t) => t.isActive) || (response.data || [])[0];
        if (active) {
          setTemplateRecordId(active.id);
          let map: any[] = [];
          try {
            map = active.fieldMapJson ? JSON.parse(active.fieldMapJson) : [];
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
                width_percent: r.width_percent !== undefined ? Number(r.width_percent) : undefined,
                height_percent: r.height_percent !== undefined ? Number(r.height_percent) : undefined,
              }))
            );
          }
          setForm({
            title: kv.title || active.name || defaultForm.title,
            templateBackgroundUrl: active.backgroundUrl || "",
            principalName: kv.principalName || "",
            schoolName: kv.schoolName || school?.name || "",
            schoolPhone: kv.schoolPhone || school?.phone || "",
            schoolAddress: kv.schoolAddress || school?.address || "",
            schoolLogoUrl: kv.schoolLogoUrl || school?.logoUrl || "",
            headerLeftText: kv.headerLeftText || defaultForm.headerLeftText,
            headerCenterText: kv.headerCenterText || defaultForm.headerCenterText,
            headerRightText: kv.headerRightText || defaultForm.headerRightText,
            bodyText: kv.bodyText || defaultForm.bodyText,
            footerLeftText: kv.footerLeftText || defaultForm.footerLeftText,
            footerCenterText: kv.footerCenterText || defaultForm.footerCenterText,
            footerRightText: kv.footerRightText || defaultForm.footerRightText,
            headerHeight: Number(kv.headerHeight || defaultForm.headerHeight),
            bodyHeight: Number(kv.bodyHeight || defaultForm.bodyHeight),
            footerHeight: Number(kv.footerHeight || defaultForm.footerHeight),
            bodyWidth: Number(kv.bodyWidth || defaultForm.bodyWidth),
            showStudentPhoto: kv.showStudentPhoto === "true",
          });
        } else {
          setForm({
            ...defaultForm,
            schoolName: school?.name || "",
            schoolPhone: school?.phone || "",
            schoolAddress: school?.address || "",
            schoolLogoUrl: school?.logoUrl || "",
          });
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load certificate template");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [user?.schoolId]);

  const onSave = async () => {
    setSaving(true);
    try {
      if (!templateRecordId) {
        toast.error("No certificate template found. Activate one from Template Manager.");
        return;
      }
      const requiredFields = ["school_logo", "student_name", "marks_table"];
      const missingFields = requiredFields.filter((key) => !fieldMap.some((row) => row.field_key === key));
      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(", ")}`);
        return;
      }
      await templatesAPI.saveFields(templateRecordId, [
        { field_key: "title", value: form.title },
        { field_key: "principalName", value: form.principalName },
        { field_key: "schoolName", value: form.schoolName },
        { field_key: "schoolPhone", value: form.schoolPhone },
        { field_key: "schoolAddress", value: form.schoolAddress },
        { field_key: "schoolLogoUrl", value: form.schoolLogoUrl },
        { field_key: "headerLeftText", value: form.headerLeftText },
        { field_key: "headerCenterText", value: form.headerCenterText },
        { field_key: "headerRightText", value: form.headerRightText },
        { field_key: "bodyText", value: form.bodyText },
        { field_key: "footerLeftText", value: form.footerLeftText },
        { field_key: "footerCenterText", value: form.footerCenterText },
        { field_key: "footerRightText", value: form.footerRightText },
        { field_key: "headerHeight", value: String(form.headerHeight) },
        { field_key: "bodyHeight", value: String(form.bodyHeight) },
        { field_key: "footerHeight", value: String(form.footerHeight) },
        { field_key: "bodyWidth", value: String(form.bodyWidth) },
        { field_key: "showStudentPhoto", value: String(form.showStudentPhoto) },
        ...fieldMap.map((f) => ({
          field_key: f.field_key,
          x_percent: f.x_percent,
          y_percent: f.y_percent,
          font_size: f.font_size,
          width_percent: f.width_percent,
          height_percent: f.height_percent,
          font_color: "#000000",
          bold: false,
          italic: false,
          align: "left",
        })),
      ]);
      toast.success("Certificate template saved");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save certificate template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="px-4 sm:px-6 pt-4">
        <button
          onClick={() => router.push("/admin/report-cards")}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Report Cards
        </button>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Certificate Template
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configure the reusable certificate text, placeholders, and print template.
            </p>
          </div>
          <button
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-color,#e35336)] text-white text-sm font-medium shadow-sm hover:opacity-90"
          >
            <Eye className="w-4 h-4" />
            View Preview
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Certificate Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </label>

              <div className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Active Template</span>
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="truncate text-slate-700 dark:text-slate-200">
                    {form.templateBackgroundUrl || "No active template selected"}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/admin/templates")}
                    className="mt-2 text-xs font-medium text-[var(--brand-color,#e35336)]"
                  >
                    Manage uploaded templates
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">School</p>
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{form.schoolName || "Not set"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{form.schoolPhone || "Not set"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Principal</p>
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{form.principalName || "Optional"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Logo</p>
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{form.schoolLogoUrl ? "From school settings" : "Not uploaded"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Certificate Content</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure the readable certificate text. Use placeholders only when you need dynamic student or school data.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPlaceholdersOpen((value) => !value)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Placeholders
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${placeholdersOpen ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={applyResultCertificatePreset}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Use Result Design
                </button>
              </div>
            </div>

            {placeholdersOpen && (
              <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {placeholderGroups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.tokens.map((placeholder) => (
                          <code
                            key={placeholder}
                            className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            {placeholder}
                          </code>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Header Left</span>
                <input
                  value={form.headerLeftText}
                  onChange={(e) => setForm((prev) => ({ ...prev, headerLeftText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Header Center</span>
                <input
                  value={form.headerCenterText}
                  onChange={(e) => setForm((prev) => ({ ...prev, headerCenterText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Header Right</span>
                <input
                  value={form.headerRightText}
                  onChange={(e) => setForm((prev) => ({ ...prev, headerRightText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </label>

              <label className="space-y-1 md:col-span-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Body Text</span>
                <textarea
                  value={form.bodyText}
                  onChange={(e) => setForm((prev) => ({ ...prev, bodyText: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Footer Left</span>
                <input
                  value={form.footerLeftText}
                  onChange={(e) => setForm((prev) => ({ ...prev, footerLeftText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Footer Center</span>
                <input
                  value={form.footerCenterText}
                  onChange={(e) => setForm((prev) => ({ ...prev, footerCenterText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Footer Right</span>
                <input
                  value={form.footerRightText}
                  onChange={(e) => setForm((prev) => ({ ...prev, footerRightText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ["Header Height", "headerHeight"],
                ["Body Height", "bodyHeight"],
                ["Footer Height", "footerHeight"],
                ["Body Width", "bodyWidth"],
              ].map(([label, key]) => (
                <label key={key} className="space-y-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label} (%)</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form[key as "headerHeight" | "bodyHeight" | "footerHeight" | "bodyWidth"]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  />
                </label>
              ))}
              <label className="flex items-end gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={form.showStudentPhoto}
                  onChange={(e) => setForm((prev) => ({ ...prev, showStudentPhoto: e.target.checked }))}
                  className="mb-1"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Show Student Photo</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <Settings2 className="h-4 w-4" />
                Advanced Field Placement
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </button>
            {advancedOpen && (
              <div className="space-y-2 border-t border-slate-200 p-4 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Use this only when an uploaded PDF/image template needs exact x/y field positions.
                </p>
                <div className="hidden md:grid grid-cols-6 gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1">
                  <span>Field Name</span>
                  <span>Left (%)</span>
                  <span>Top (%)</span>
                  <span>Font Size (px)</span>
                  <span>Width (%)</span>
                  <span>Height (%)</span>
                </div>
                {fieldMap.map((row, idx) => (
                  <div key={row.field_key} className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input value={row.field_key} readOnly className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-sm" />
                    <input type="number" min={0} max={100} value={row.x_percent} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, x_percent: Number(e.target.value) } : r))} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm" placeholder="Left (%)" />
                    <input type="number" min={0} max={100} value={row.y_percent} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, y_percent: Number(e.target.value) } : r))} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm" placeholder="Top (%)" />
                    <input type="number" min={8} max={36} value={row.font_size} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, font_size: Number(e.target.value) } : r))} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm" placeholder="Font Size (px)" />
                    <input type="number" min={0} max={100} value={row.width_percent ?? ""} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, width_percent: e.target.value === "" ? undefined : Number(e.target.value) } : r))} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm" placeholder="Width (%)" />
                    <input type="number" min={0} max={100} value={row.height_percent ?? ""} onChange={(e) => setFieldMap((p) => p.map((r, i) => i === idx ? { ...r, height_percent: e.target.value === "" ? undefined : Number(e.target.value) } : r))} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm" placeholder="Height (%)" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand-color,#e35336)] text-white rounded-lg text-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Template
            </button>
          </div>
        </div>
      </div>

      {mounted &&
        createPortal(
          <>
            {previewOpen && (
              <div className="fixed inset-0 z-[11000] bg-black/50 flex items-center justify-center p-4">
                <div className="w-full max-w-6xl max-h-[92vh] overflow-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Template Preview</h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600 bg-white">
              {form.templateBackgroundUrl ? (
                isPdfTemplate ? (
                  <object
                    data={form.templateBackgroundUrl}
                    type="application/pdf"
                    className="aspect-[1.414/1] w-full bg-white"
                    aria-label="Certificate template preview"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.templateBackgroundUrl}
                    alt="Certificate template preview"
                    className="w-full h-auto object-contain"
                  />
                )
              ) : (
                <div className="aspect-[1.414/1] w-full bg-[rgba(31,41,55,0.06)]" />
              )}

              <div className="absolute inset-0 p-4 sm:p-8 pointer-events-none">
                <div
                  className="absolute left-[6%] right-[6%] top-[5%] grid grid-cols-3 gap-3 text-xs text-slate-900"
                  style={{ minHeight: `${form.headerHeight}%` }}
                >
                  <div>{renderSampleText(form.headerLeftText)}</div>
                  <div className="text-center font-semibold">{renderSampleText(form.headerCenterText)}</div>
                  <div className="text-right">{renderSampleText(form.headerRightText)}</div>
                </div>

                <div
                  className="absolute left-1/2 -translate-x-1/2 whitespace-pre-line text-center text-sm leading-6 text-slate-900"
                  style={{
                    top: `${Math.max(12, form.headerHeight + 8)}%`,
                    width: `${form.bodyWidth}%`,
                    minHeight: `${form.bodyHeight}%`,
                  }}
                >
                  {renderSampleText(form.bodyText)}
                </div>

                <div
                  className="absolute left-[6%] right-[6%] bottom-[5%] grid grid-cols-3 gap-3 text-xs text-slate-900"
                  style={{ minHeight: `${form.footerHeight}%` }}
                >
                  <div>{renderSampleText(form.footerLeftText)}</div>
                  <div className="text-center">{renderSampleText(form.footerCenterText)}</div>
                  <div className="text-right">{renderSampleText(form.footerRightText)}</div>
                </div>

                {form.showStudentPhoto && (
                  <div className="absolute right-[8%] top-[28%] flex h-24 w-20 items-center justify-center rounded border border-slate-300 bg-white/85 text-[10px] text-slate-500">
                    Student Photo
                  </div>
                )}

                {fieldMap.map((row) => {
                  if (row.field_key === "marks_table") {
                    return (
                      <div
                        key={row.field_key}
                        className="absolute text-[11px] text-slate-900"
                        style={{ left: `${row.x_percent}%`, top: `${row.y_percent}%`, width: `${row.width_percent ?? 70}%`, minHeight: `${row.height_percent ?? 18}%` }}
                      >
                        <div className="rounded border border-slate-300 bg-white/85 px-2 py-1 shadow-sm">
                          Marks Table
                        </div>
                      </div>
                    );
                  }

                  if (row.field_key === "school_logo" && form.schoolLogoUrl) {
                    return (
                      <img
                        key={row.field_key}
                        src={form.schoolLogoUrl}
                        alt="School logo preview"
                        className="absolute rounded-lg object-contain bg-white/95 p-1 shadow-sm"
                        style={{ left: `${row.x_percent}%`, top: `${row.y_percent}%`, width: `${row.width_percent ?? 10}%`, height: `${row.height_percent ?? 14}%` }}
                      />
                    );
                  }

                  const value = sampleFieldValue(row.field_key);
                  if (!value) return null;

                  return (
                    <div
                      key={row.field_key}
                      className="absolute text-slate-900"
                      style={{
                        left: `${row.x_percent}%`,
                        top: `${row.y_percent}%`,
                        fontSize: `${row.font_size}px`,
                      }}
                    >
                      {value}
                    </div>
                  );
                })}

                <div className="absolute bottom-4 right-4 text-right text-xs text-slate-700">
                  {form.principalName ? `Prepared for: ${form.principalName}` : "Manual stamp/signature after print"}
                </div>
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
