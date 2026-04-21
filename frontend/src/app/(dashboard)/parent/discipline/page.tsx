"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { disciplineAPI, parentsAPI } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, User, Clock, CheckCircle, Shield } from "lucide-react";

interface ChildDiscipline {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "ESCALATED";
  incidentDate: string;
  outcome?: string;
  childName: string;
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
      const resp = await parentsAPI.getChildren(user!.id);
      const children = resp.data?.data || resp.data || [];

      const allIncidents: ChildDiscipline[] = [];

      for (const child of children) {
        try {
          const incidentResp = await disciplineAPI.getStudentIncidents(child.studentId);
          const childIncidents = (incidentResp.data || []).map((i: any) => ({
            ...i,
            childName: child.name,
          }));
          allIncidents.push(...childIncidents);
        } catch (e) {
          console.log("No incidents for child", child.studentId);
        }
      }

      setIncidents(allIncidents);
    } catch (error) {
      console.error("Failed to load child incidents", error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const openIncidents = incidents.filter((i) => i.status !== "RESOLVED");
  const resolvedIncidents = incidents.filter((i) => i.status === "RESOLVED");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#e35336]">
                Discipline Records
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                View your children's disciplinary records
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Incidents</p>
              <p className="text-xl font-bold dark:text-white">{incidents.length}</p>
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

        {incidents.length === 0 ? (
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
                {incidents.map((incident) => {
                  const StatusIcon = statusIcons[incident.status];
                  return (
                    <div key={incident.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <User className="h-5 w-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium dark:text-white">
                              {incident.title}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {incident.childName} •{" "}
                              {new Date(incident.incidentDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {incident.description}
                            </p>
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
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Outcome:</span>{" "}
                            {incident.outcome}
                          </p>
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