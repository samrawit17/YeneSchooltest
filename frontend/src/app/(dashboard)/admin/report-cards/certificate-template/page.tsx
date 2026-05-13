"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save, Eye, X } from "lucide-react";
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
      default:
        return "";
    }
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
              Set school branding fields for printed certificates.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Certificate Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Template Background URL</span>
              <div className="flex flex-col gap-2">
                <input
                  value={form.templateBackgroundUrl}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  placeholder="Select an active certificate template in Template Manager"
                />
                <button
                  type="button"
                  onClick={() => router.push("/admin/templates")}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                >
                  Manage Templates
                </button>
              </div>
              {form.templateBackgroundUrl && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Current template: {form.templateBackgroundUrl}
                </p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">School Name</span>
              <input
                value={form.schoolName}
                onChange={(e) => setForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">School Phone</span>
              <input
                value={form.schoolPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, schoolPhone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">School Address</span>
              <input
                value={form.schoolAddress}
                onChange={(e) => setForm((prev) => ({ ...prev, schoolAddress: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">School Logo</span>
              <div className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-300">
                {form.schoolLogoUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={form.schoolLogoUrl} alt="School logo" className="h-10 w-10 rounded object-contain bg-white" />
                    <span>Using logo from School Settings</span>
                  </div>
                ) : (
                  <span>No school logo uploaded yet. Upload it from School Settings.</span>
                )}
              </div>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Principal Name (optional)</span>
              <input
                value={form.principalName}
                onChange={(e) => setForm((prev) => ({ ...prev, principalName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              />
            </label>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Field Placement</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use percentage of template size: `Left` = horizontal position, `Top` = vertical position, `Font` = text size.
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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.templateBackgroundUrl}
                  alt="Certificate template preview"
                  className="w-full h-auto object-contain"
                />
              ) : (
                <div className="aspect-[1.414/1] w-full bg-[rgba(31,41,55,0.06)]" />
              )}

              <div className="absolute inset-0 p-4 sm:p-8 pointer-events-none">
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
