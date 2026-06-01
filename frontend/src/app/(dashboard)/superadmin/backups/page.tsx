"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileArchive, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { schoolsAPI } from "@/lib/api";
import { superadminAPI, type SchoolBackupTypeOption } from "@/lib/api/superadmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SchoolOption {
  id: string;
  name: string;
  code?: string | null;
  email?: string;
  isActive?: boolean;
}

export default function SuperAdminBackupsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [types, setTypes] = useState<SchoolBackupTypeOption[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [backupType, setBackupType] = useState("FULL_SCHOOL");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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

  async function loadOptions() {
    try {
      setLoading(true);
      const [schoolsResponse, typesResponse] = await Promise.all([
        schoolsAPI.getAll(),
        superadminAPI.getSchoolBackupTypes(),
      ]);
      const schoolRows = Array.isArray(schoolsResponse.data) ? schoolsResponse.data : [];
      const typeRows = Array.isArray(typesResponse.data) ? typesResponse.data : [];
      setSchools(schoolRows);
      setTypes(typeRows);
      setSchoolId((current) => current || schoolRows[0]?.id || "");
      setBackupType((current) => current || typeRows[0]?.value || "FULL_SCHOOL");
    } catch (error) {
      toast.error("Failed to load backup options");
    } finally {
      setLoading(false);
    }
  }

  async function downloadSelectedBackup() {
    if (!schoolId) {
      toast.error("Choose a school first");
      return;
    }

    try {
      setDownloading(true);
      const response = await superadminAPI.downloadSchoolBackup(schoolId, backupType);
      const disposition = response.headers["content-disposition"] || "";
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const fallbackName = `sms-${selectedSchool?.code || selectedSchool?.name || "school"}-${backupType.toLowerCase()}.zip`;
      const fileName = fileNameMatch?.[1] || fallbackName;
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Backup download started");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Backup download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 md:p-6">
      <div className="w-full space-y-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Backups</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Download useful school records for migration, support, or audit.
          </p>
        </div>

        <Card className="dark:border-gray-700 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
              <FileArchive className="h-5 w-5 text-purple-600" />
              Create Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">School</span>
                <select
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  disabled={loading || downloading}
                >
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}{school.code ? ` (${school.code})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Backup Type</span>
                <select
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  value={backupType}
                  onChange={(event) => setBackupType(event.target.value)}
                  disabled={loading || downloading}
                >
                  {types.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {selectedSchool ? (
                <span>
                  Selected: <strong>{selectedSchool.name}</strong>. The download will be a zip containing JSON files for the selected backup type.
                </span>
              ) : (
                <span>No school selected.</span>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                className="bg-purple-600 text-white hover:bg-purple-700"
                onClick={downloadSelectedBackup}
                disabled={loading || downloading || !schoolId}
              >
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
