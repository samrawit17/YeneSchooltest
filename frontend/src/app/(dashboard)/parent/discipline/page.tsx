"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { disciplineAPI, parentsAPI } from "@/lib/api/people";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, User, Clock, CheckCircle, Shield } from "lucide-react";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const router = useRouter();

  const [incidents, setIncidents] = useState<ChildDiscipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadChildIncidents();
    }
  }, [isAuthenticated, user?.id]);

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
          const incidentResp = await disciplineAPI.getStudentIncidents(studentId);
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
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const openIncidents = filteredIncidents.filter((i) => i.status !== "RESOLVED");
  const resolvedIncidents = filteredIncidents.filter((i) => i.status === "RESOLVED");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Discipline Records
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View your children's disciplinary records
            </p>
          </div>
          {children.length > 1 && (
            <div className="flex items-center gap-2 shrink-0 mr-[30px]">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Select Child</label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-full max-w-[200px] dark:bg-slate-800 dark:border-slate-700">
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
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Incidents</p>
              <p className="text-xl font-bold dark:text-white">{filteredIncidents.length}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Open</p>
              <p className="text-xl font-bold text-orange-600">{openIncidents.length}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Resolved</p>
              <p className="text-xl font-bold text-green-600">{resolvedIncidents.length}</p>
            </CardContent>
          </Card>
        </div>

        {filteredIncidents.length === 0 ? (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Shield className="w-10 h-10 text-gray-400 mb-4" />
              <p className="text-gray-500">No disciplinary records found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Incident History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredIncidents.map((incident) => {
                  const StatusIcon = statusIcons[incident.status];
                  return (
                    <div key={incident.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <User className="h-5 w-5 text-slate-500" />
                          </div>
                          <div>
                            <TranslatedText
                              text={incident.title}
                              textClassName="font-medium dark:text-white"
                            />
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {incident.childName} •{" "}
                              {new Date(incident.incidentDate).toLocaleDateString()}
                            </p>
                            <TranslatedText
                              text={incident.description}
                              textClassName="text-sm text-gray-600 dark:text-gray-300"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
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
                      {incident.outcome && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Outcome:</span>
                            <TranslatedText text={incident.outcome} className="mt-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
