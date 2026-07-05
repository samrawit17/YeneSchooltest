"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Database,
  Download,
  FileArchive,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { superadminAPI, type SchoolBackupTypeOption } from "@/lib/api/superadmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SchoolOption {
  id: string;
  name: string;
  code?: string | null;
  email?: string;
  isActive?: boolean;
}

function extractSchoolOptions(payload: unknown): SchoolOption[] {
  if (Array.isArray(payload)) {
    return payload as SchoolOption[];
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: SchoolOption[] }).data;
  }

  return [];
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

function extractFileName(response: { headers: Record<string, string> }, fallback: string) {
  const disposition = response.headers["content-disposition"] || "";
  const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return fileNameMatch?.[1] || fallback;
}

export default function SuperAdminBackupsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [types, setTypes] = useState<SchoolBackupTypeOption[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [backupType, setBackupType] = useState("FULL_SCHOOL");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadingPlatform, setDownloadingPlatform] = useState(false);
  const [downloadingSchool, setDownloadingSchool] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (user?.role?.toLowerCase() !== "super_admin") {
      toast.error("Access denied. Super Admin only.");
      router.push("/dashboard");
      return;
    }
    void loadOptions();
  }, [authLoading, isAuthenticated, router, user]);

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === schoolId),
    [schoolId, schools],
  );

  const selectedType = useMemo(
    () => types.find((type) => type.value === backupType),
    [backupType, types],
  );

  async function loadOptions() {
    try {
      setLoading(true);
      setLoadError(null);
      const [schoolsResponse, typesResponse] = await Promise.all([
        superadminAPI.getSchools(),
        superadminAPI.getSchoolBackupTypes(),
      ]);
      const schoolRows = extractSchoolOptions(schoolsResponse.data);
      const typeRows = Array.isArray(typesResponse.data) ? typesResponse.data : [];
      setSchools(schoolRows);
      setTypes(typeRows);
      setSchoolId((current) =>
        schoolRows.some((school) => school.id === current) ? current : schoolRows[0]?.id || "",
      );
      setBackupType((current) =>
        typeRows.some((type) => type.value === current) ? current : typeRows[0]?.value || "FULL_SCHOOL",
      );
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to load backup options";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPlatformBackup() {
    try {
      setDownloadingPlatform(true);
      const response = await superadminAPI.downloadBackup();
      const fileName = extractFileName(response, `sms-platform-backup-${Date.now()}.zip`);
      triggerBlobDownload(response.data, fileName);
      toast.success("Platform backup download started");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Platform backup download failed");
    } finally {
      setDownloadingPlatform(false);
    }
  }

  async function downloadSchoolBackup() {
    if (!schoolId) {
      toast.error("Choose a school first");
      return;
    }

    try {
      setDownloadingSchool(true);
      const response = await superadminAPI.downloadSchoolBackup(schoolId, backupType);
      const fallbackName = `sms-${selectedSchool?.code || selectedSchool?.name || "school"}-${backupType.toLowerCase()}.zip`;
      const fileName = extractFileName(response, fallbackName);
      triggerBlobDownload(response.data, fileName);
      toast.success("School backup download started");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "School backup download failed");
    } finally {
      setDownloadingSchool(false);
    }
  }

  const isBusy = loading || downloadingPlatform || downloadingSchool;

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-[#1A1A1A] md:p-6">
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backups</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Download full platform disaster-recovery backups or school-scoped exports for migration and support.
          </p>
        </div>

        <Card className="dark:border-[#2A2A2A] dark:bg-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
              <Database className="h-5 w-5 text-purple-600" />
              Platform Backup
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Full PostgreSQL dump plus all uploaded files. Use this for disaster recovery and scheduled off-site storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-[#1A1A1A] dark:text-amber-200">
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">Disaster recovery backup</p>
                  <p>
                    Includes the complete database and uploads directory. Environment secrets are not included.
                    Large databases may take several minutes to download.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={downloadPlatformBackup}
                disabled={isBusy}
              >
                {downloadingPlatform ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Platform Backup
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:border-[#2A2A2A] dark:bg-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
              <FileArchive className="h-5 w-5 text-purple-600" />
              School Backup
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Application-level JSON export for one school. Password hashes and temporary credentials are excluded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">School</span>
                <select
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white"
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  disabled={isBusy}
                >
                  {loading ? (
                    <option value="">Loading schools...</option>
                  ) : schools.length === 0 ? (
                    <option value="">No schools available</option>
                  ) : (
                    schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                        {school.code ? ` (${school.code})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Backup Type</span>
                <select
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white"
                  value={backupType}
                  onChange={(event) => setBackupType(event.target.value)}
                  disabled={isBusy}
                >
                  {loading ? (
                    <option value="">Loading backup types...</option>
                  ) : types.length === 0 ? (
                    <option value="">No backup types available</option>
                  ) : (
                    types.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            {selectedType?.description ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-gray-300">
                {selectedType.description}
              </div>
            ) : null}

            {loadError ? (
              <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-[#1A1A1A] dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {loadError}
                </span>
                <Button variant="outline" size="sm" onClick={loadOptions} disabled={loading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : null}

            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-gray-300">
              {selectedSchool ? (
                <span>
                  Selected: <strong>{selectedSchool.name}</strong>. The download will be a zip with JSON files
                  {backupType === "FULL_SCHOOL" || backupType === "DOCUMENTS"
                    ? " and matching uploaded files"
                    : ""}{" "}
                  for the selected backup type.
                </span>
              ) : (
                <span>No school selected.</span>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={downloadSchoolBackup}
                disabled={isBusy || !schoolId}
              >
                {downloadingSchool ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download School Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
