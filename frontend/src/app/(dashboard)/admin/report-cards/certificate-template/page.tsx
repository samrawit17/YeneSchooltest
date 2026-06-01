"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Loader2, Palette, Save, ShieldCheck, Upload, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reportCardsAPI } from "@/lib/api/reporting";
import { resolveAssetUrl } from "@/lib/asset-url";

type CertificateSettingsForm = {
  curriculumType: string;
  currentPeriodName: string;
  activeAcademicYearName: string;
  assessmentColumns: Array<{ code: string; name: string; percentage: number }>;
  title: string;
  themeColor: string;
  principalName: string;
  schoolName: string;
  schoolPhone: string;
  schoolAddress: string;
  schoolLogoUrl: string;
  showRank: boolean;
  showAttendance: boolean;
  showGPA: boolean;
  useCustomBackground: boolean;
  customBackgroundUrl: string;
};

const defaultForm: CertificateSettingsForm = {
  curriculumType: "SEMESTER",
  currentPeriodName: "",
  activeAcademicYearName: "",
  assessmentColumns: [],
  title: "Official Student Result Certificate",
  themeColor: "#1B4F72",
  principalName: "",
  schoolName: "",
  schoolPhone: "",
  schoolAddress: "",
  schoolLogoUrl: "",
  showRank: true,
  showAttendance: false,
  showGPA: false,
  useCustomBackground: false,
  customBackgroundUrl: "",
};

export default function CertificateTemplatePage() {
  const router = useRouter();
  const [form, setForm] = useState<CertificateSettingsForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingWatermark, setUploadingWatermark] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await reportCardsAPI.getCertificateTemplate();
        setForm({ ...defaultForm, ...response.data });
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load certificate settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateForm = <K extends keyof CertificateSettingsForm>(key: K, value: CertificateSettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadWatermark = async (file?: File) => {
    if (!file) return;
    setUploadingWatermark(true);
    try {
      const response = await reportCardsAPI.uploadCertificateWatermark(file);
      updateForm("useCustomBackground", true);
      updateForm("customBackgroundUrl", response.data?.url || "");
      toast.success("Watermark image uploaded");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to upload watermark image");
    } finally {
      setUploadingWatermark(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await reportCardsAPI.saveCertificateTemplate(form);
      setForm({ ...defaultForm, ...response.data });
      toast.success("Certificate settings saved");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save certificate settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="px-4 pt-4 sm:px-6">
        <button
          onClick={() => router.push("/admin/report-cards")}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Report Cards
        </button>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Certificate Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Set the branding used by the system-generated report card certificate.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-color,#e35336)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <ShieldCheck className="h-4 w-4" />
            Branding
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Certificate Title</span>
              <input
                value={form.title}
                onChange={(e) => updateForm("title", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Theme Color</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.themeColor}
                  onChange={(e) => updateForm("themeColor", e.target.value)}
                  className="h-10 w-12 rounded border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-900"
                />
                <input
                  value={form.themeColor}
                  onChange={(e) => updateForm("themeColor", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Principal Name</span>
              <input
                value={form.principalName}
                onChange={(e) => updateForm("principalName", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">School Name</span>
              <input
                value={form.schoolName}
                onChange={(e) => updateForm("schoolName", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Phone</span>
              <input
                value={form.schoolPhone}
                onChange={(e) => updateForm("schoolPhone", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Address</span>
              <input
                value={form.schoolAddress}
                onChange={(e) => updateForm("schoolAddress", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
          </div>

          <div className="grid gap-4 border-t border-slate-200 pt-4 dark:border-slate-700 md:grid-cols-2">
            <div className="space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">School Logo</span>
              <p className="text-xs text-slate-500">
                The certificate uses the logo from school settings automatically.
              </p>
              <p className="truncate text-xs text-slate-500">{form.schoolLogoUrl || "No school logo set"}</p>
            </div>
          </div>

          <div className="grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <input
                type="checkbox"
                checked={form.showRank}
                onChange={(e) => updateForm("showRank", e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Show rank</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <input
                type="checkbox"
                checked={form.showAttendance}
                onChange={(e) => updateForm("showAttendance", e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Show attendance</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <input
                type="checkbox"
                checked={form.showGPA}
                onChange={(e) => updateForm("showGPA", e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Show GPA</span>
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.useCustomBackground}
                onChange={(e) => updateForm("useCustomBackground", e.target.checked)}
              />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Use custom background image (Advanced)</span>
            </label>
            {form.useCustomBackground && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800">
                  {uploadingWatermark ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload watermark
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadingWatermark}
                    onChange={(e) => uploadWatermark(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
                <span className="truncate text-xs text-slate-500">
                  {form.customBackgroundUrl || "No watermark uploaded"}
                </span>
              </div>
            )}
          </div>
        </div>

        <CertificatePreview form={form} />
      </div>

      {mounted &&
        createPortal(
          previewOpen ? (
            <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Certificate Preview</h3>
                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CertificatePreview form={form} large />
              </div>
            </div>
          ) : null,
          document.body,
        )}
    </div>
  );
}

function CertificatePreview({ form, large = false }: { form: CertificateSettingsForm; large?: boolean }) {
  const watermarkSrc = form.useCustomBackground ? resolveAssetUrl(form.customBackgroundUrl) : undefined;
  const logoSrc = resolveAssetUrl(form.schoolLogoUrl);
  const previewYear = form.activeAcademicYearName || "Academic Year";
  const previewPeriod = form.currentPeriodName || `${form.curriculumType === "QUARTER" ? "Quarter" : form.curriculumType === "TERM" ? "Term" : "Semester"} 1`;
  const assessmentColumns = form.assessmentColumns.slice(0, 5);
  const previewRows = [
    { subject: "English", scores: ["18", "27", "43"], total: "88", grade: "A" },
    { subject: "Mathematics", scores: ["16", "25", "40"], total: "81", grade: "A-" },
    { subject: "Biology", scores: ["15", "24", "38"], total: "77", grade: "B+" },
    { subject: "Geography", scores: ["17", "26", "41"], total: "84", grade: "A-" },
  ];
  const gridTemplateColumns = `28px minmax(140px,1fr) repeat(${assessmentColumns.length}, minmax(56px,64px)) 58px 58px`;
  const previewSize = large
    ? { width: "760px", height: "1075px" }
    : { width: "620px", height: "877px" };
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${large ? "" : "xl:sticky xl:top-4"}`}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Palette className="h-4 w-4" />
        Official Result Certificate Layout
      </div>
      <div
        className="relative shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm"
        style={{ ...previewSize, marginInline: large ? "auto" : undefined }}
      >
        {watermarkSrc && (
          <img src={watermarkSrc} alt="" className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[58%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-10" />
        )}
        <div className="relative z-10 flex items-center gap-4 border-b-2 px-8 py-4" style={{ borderColor: form.themeColor }}>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden bg-white text-[10px]" style={{ color: form.themeColor }}>
            {logoSrc ? <img src={logoSrc} alt="School logo" className="h-full w-full object-contain" /> : "School Logo"}
          </div>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-base font-semibold" style={{ color: form.themeColor }}>{form.schoolName || "School Name"}</div>
            <div className="truncate text-xs text-slate-500">{[form.schoolAddress, form.schoolPhone].filter(Boolean).join(" • ") || "Address • Phone"}</div>
          </div>
          <div className="w-32 text-right text-[10px] leading-5 text-slate-600">
            <div>Year <b className="break-words" style={{ color: form.themeColor }}>{previewYear}</b></div>
            <div>Period <b className="break-words" style={{ color: form.themeColor }}>{previewPeriod}</b></div>
            <div>Issued <b style={{ color: form.themeColor }}>2026-05-26</b></div>
          </div>
        </div>
        <div className="relative z-10 flex justify-center px-8 py-2 text-sm font-semibold uppercase tracking-wide text-white" style={{ backgroundColor: form.themeColor }}>
          {form.title || "Student Report Card"}
        </div>
        <div className="relative z-10 px-8 py-4">
          <div className="grid grid-cols-2 overflow-hidden rounded border border-[#BDD7EE] text-xs">
            {[
              ["Full name", "Abebe Kebede"],
              ["Student ID", "STU-00123"],
              ["Class", "Grade 8 - Section A"],
              ["Academic Year / Period", `${previewYear} / ${previewPeriod}`],
              ["Issue Date", "2026-05-26"],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-r border-[#BDD7EE] p-2 even:border-r-0">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                <div className="break-words font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded border border-[#E2EEF7] text-xs">
            <div
              className="grid px-2 py-2 text-white"
              style={{ backgroundColor: form.themeColor, gridTemplateColumns }}
            >
              <span>#</span><span>Subject</span>{assessmentColumns.map((col) => <span key={col.code} className="text-center leading-tight">{col.name}</span>)}<span className="text-center">Total</span><span className="text-center">Grade</span>
            </div>
            {assessmentColumns.length === 0 ? (
              <div className="px-2 py-3 text-center text-slate-500">
                Assessment columns load from admin-defined assessment weights.
              </div>
            ) : previewRows.map((row, index) => (
              <div
                key={index}
                className="grid px-2 py-1.5 even:bg-[#F4F9FD]"
                style={{ gridTemplateColumns }}
              >
                <span>{index + 1}</span><span>{row.subject}</span>{assessmentColumns.map((col, colIndex) => <span key={col.code} className="text-center">{row.scores[colIndex] || "--"}</span>)}<span className="text-center font-semibold">{row.total}</span><span className="text-center font-semibold">{row.grade}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded border border-[#BDD7EE] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: form.themeColor }}>Summary</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>Average: <b>78.8%</b></span>
                {form.showRank && <span>Rank: <b>3</b></span>}
                <span>Grade: <b>B+</b></span>
                {form.showAttendance && <span>Attendance: <b>96%</b></span>}
                {form.showGPA && <span>GPA: <b>3.8</b></span>}
              </div>
            </div>
            <div className="rounded border border-[#BDD7EE] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: form.themeColor }}>Remarks</div>
              <div>Teacher: Good academic progress.</div>
              <div>Principal: Promoted to the next level.</div>
            </div>
          </div>
          <div className="mt-4 rounded border border-[#BDD7EE] bg-[#F8FBFD] p-2 text-center text-[10px] text-slate-600">
            This certificate is valid only with the principal signature and official school stamp.
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t-2 pt-4 text-center text-xs" style={{ borderColor: form.themeColor }}>
            <div><div className="mx-2 mb-1 h-7 border-b" style={{ borderColor: form.themeColor }} /><b style={{ color: form.themeColor }}>Prepared By</b><div className="text-slate-500">Registrar / Class Teacher</div></div>
            <div><div className="mx-2 mb-1 h-7 border-b" style={{ borderColor: form.themeColor }} /><b style={{ color: form.themeColor }}>{form.principalName || "Principal"}</b><div className="text-slate-500">Principal Signature</div></div>
            <div><div className="mx-2 mb-1 h-7 border-b" style={{ borderColor: form.themeColor }} /><b style={{ color: form.themeColor }}>School Stamp</b><div className="text-slate-500">Official Seal</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
