"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { disciplineAPI, parentsAPI } from "@/lib/api/people";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, User, Clock, CheckCircle, Shield } from "lucide-react";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ChildDiscipline {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "ESCALATED";
  incidentDate: string;
  outcome?: string;
  childName: string;
  childId?: string;
}

const severityColors = {
  LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusIcons = {
  OPEN: Clock,
  INVESTIGATING: AlertTriangle,
  RESOLVED: CheckCircle,
  ESCALATED: Shield,
};

export default function ParentDisciplinePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentAcademicYear, allAcademicYears, setSelectedAcademicYearId } = useAcademicYear();
  const router = useRouter();

  const [incidents, setIncidents] = useState<ChildDiscipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("all");
  const [selectedIncident, setSelectedIncident] = useState<ChildDiscipline | null>(null);

  const IncidentStatusIcon = selectedIncident ? statusIcons[selectedIncident.status] : null;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user?.id && currentAcademicYear?.id) {
      loadChildIncidents();
    }
  }, [isAuthenticated, user?.id, currentAcademicYear?.id]);

  async function loadChildIncidents() {
    setLoading(true);
    try {
      const resp = await parentsAPI.getChildren();
      const children = resp.data?.children || resp.data || [];
      setChildren(children);

      const allIncidents: ChildDiscipline[] = [];

      for (const child of children) {
        try {
          const studentId =
            child.studentId || child.student?.id || child.student?.userId;
          if (!studentId) continue;
          const incidentResp = await disciplineAPI.getStudentIncidents(studentId, currentAcademicYear?.id);
          const childIncidents = (incidentResp.data || []).map((i: any) => ({
            ...i,
            childName:
              child.name || child.student?.user?.name || child.studentName || "Unknown",
            childId: child.id,
          }));
          allIncidents.push(...childIncidents);
        } catch (e) {
          console.log("No incidents for child", child.studentId || child.student?.id);
        }
      }

      setIncidents(allIncidents);
    } catch (error) {
      console.error("Failed to load child incidents", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredIncidents = useMemo(() => {
    if (selectedChildId === "all") return incidents;
    return incidents.filter((i) => String(i.childId) === String(selectedChildId));
  }, [incidents, selectedChildId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
        <div className="px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="dark:bg-[#111111] dark:border-[#2A2A2A]">
                <CardContent className="pt-5 pb-4">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-6 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-40 mb-2" />
                        <Skeleton className="h-3 w-56 mb-2" />
                        <Skeleton className="h-3 w-full max-w-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const openIncidents = filteredIncidents.filter((i) => i.status !== "RESOLVED");
  const resolvedIncidents = filteredIncidents.filter((i) => i.status === "RESOLVED");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      <div className="px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Discipline Records
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View your children's disciplinary records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0 mr-[30px]">
            {children.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Select Child</label>
                <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                  <SelectTrigger className="w-[180px] dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
                    <SelectValue placeholder="All children" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All children</SelectItem>
                    {children.map((child: any) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name || child.student?.user?.name || "Unknown"} — {child.className || child.student?.className || "N/A"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Academic Year</label>
              <Select value={currentAcademicYear?.id || ""} onValueChange={setSelectedAcademicYearId}>
                <SelectTrigger className="w-[180px] dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {allAcademicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Incidents</p>
              <p className="text-xl font-bold dark:text-white">{filteredIncidents.length}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Open</p>
              <p className="text-xl font-bold text-orange-600">{openIncidents.length}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Resolved</p>
              <p className="text-xl font-bold text-green-600">{resolvedIncidents.length}</p>
            </CardContent>
          </Card>
        </div>

        {filteredIncidents.length === 0 ? (
          <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Shield className="w-10 h-10 text-gray-400 mb-4" />
              <p className="text-gray-500">No disciplinary records found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
            <CardHeader>
              <CardTitle>Incident History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredIncidents.map((incident) => {
                  const StatusIcon = statusIcons[incident.status];
                  return (
                    <div
                      key={incident.id}
                      className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#1A1A1A]">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <TranslatedText
                              text={incident.title}
                              textClassName="font-medium dark:text-white"
                            />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {incident.childName} •{" "}
                              {new Date(incident.incidentDate).toLocaleDateString()}
                            </p>
                            <TranslatedText
                              text={incident.description}
                              textClassName="text-sm text-gray-600 dark:text-gray-300 line-clamp-2"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              severityColors[incident.severity]
                            }`}
                          >
                            {incident.severity}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-xs ${
                              incident.status === "RESOLVED"
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {incident.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] dark:bg-[#111111] max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle className="text-lg font-semibold dark:text-white">
              Incident Details
            </DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="p-5 pt-3 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedIncident.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedIncident.childName} • {new Date(selectedIncident.incidentDate).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${severityColors[selectedIncident.severity]}`}>
                  {selectedIncident.severity}
                </span>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  selectedIncident.status === "RESOLVED"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                }`}>
                  {IncidentStatusIcon && <IncidentStatusIcon className="w-3 h-3" />}
                  {selectedIncident.status}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {selectedIncident.description}
                </p>
              </div>

              {selectedIncident.outcome && (
                <div className="p-4 bg-gray-50 dark:bg-[#222] rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Outcome
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                    {selectedIncident.outcome}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
