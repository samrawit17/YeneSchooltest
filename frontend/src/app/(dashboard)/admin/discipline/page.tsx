"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { studentsAPI } from "@/lib/api";
import { disciplineAPI } from "@/lib/api/people";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Loader2,
} from "lucide-react";

interface DisciplineIncident {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "ESCALATED";
  incidentDate: string;
  actionTaken?: string;
  outcome?: string;
  student: {
    studentId: string;
    studentCode: string;
    user: {
      name: string;
      photoUrl?: string;
    };
  };
  reporter: {
    name: string;
  };
}

const severityColors = {
  LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusConfig = {
  OPEN: { icon: Clock, color: "text-blue-500" },
  INVESTIGATING: { icon: AlertTriangle, color: "text-yellow-500" },
  RESOLVED: { icon: CheckCircle, color: "text-green-500" },
  ESCALATED: { icon: AlertCircle, color: "text-red-500" },
};

export default function DisciplinePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [incidents, setIncidents] = useState<DisciplineIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user?.schoolId) {
      loadIncidents();
    }
  }, [isAuthenticated, user?.schoolId]);

  async function loadIncidents() {
    setLoading(true);
    try {
      const params: any = { schoolId: user!.schoolId };
      if (filterSeverity !== "all") params.severity = filterSeverity;
      if (filterStatus !== "all") params.status = filterStatus;

      const resp = await disciplineAPI.getIncidents(params);
      setIncidents(resp.data || []);
    } catch (error) {
      console.error("Failed to load incidents", error);
      toast.error("Failed to load discipline incidents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.schoolId) {
      loadIncidents();
    }
  }, [filterSeverity, filterStatus]);

  const filteredIncidents = incidents.filter((incident) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      incident.title.toLowerCase().includes(term) ||
      incident.student.user.name.toLowerCase().includes(term) ||
      incident.student.studentCode.toLowerCase().includes(term)
    );
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#e35336]">
                  Discipline Records
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Track and manage student disciplinary incidents
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/admin/discipline/create")}
              className="bg-[#e35336] hover:bg-[#d1482f]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Log Incident
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Incidents", value: incidents.length },
            {
              label: "Open",
              value: incidents.filter((i) => i.status === "OPEN").length,
            },
            {
              label: "Critical",
              value: incidents.filter((i) => i.severity === "CRITICAL").length,
            },
            {
              label: "Resolved",
              value: incidents.filter((i) => i.status === "RESOLVED").length,
            },
          ].map((stat) => (
            <Card key={stat.label} className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-xl font-bold dark:text-white">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-xs text-gray-500 mb-1 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title or student..."
                    className="pl-9 dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="w-full md:w-40">
                <Label className="text-xs text-gray-500 mb-1 block">Severity</Label>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-40">
                <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="ESCALATED">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-500">Loading incidents...</p>
            </CardContent>
          </Card>
        ) : filteredIncidents.length === 0 ? (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertTriangle className="w-10 h-10 text-gray-400 mb-4" />
              <p className="text-gray-500">No discipline incidents found</p>
              <Button
                onClick={() => router.push("/admin/discipline/create")}
                className="mt-4 bg-[#e35336] hover:bg-[#d1482f]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Log First Incident
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredIncidents.map((incident) => {
                  const StatusIcon = statusConfig[incident.status].icon;
                  return (
                    <div
                      key={incident.id}
                      onClick={() =>
                        router.push(`/admin/discipline/${incident.id}`)
                      }
                      className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium dark:text-white">
                            {incident.title}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {incident.student.user.name} •{" "}
                            {incident.student.studentCode} •{" "}
                            {new Date(incident.incidentDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            severityColors[incident.severity]
                          }`}
                        >
                          {incident.severity}
                        </span>
                        <span
                          className={`flex items-center gap-1 text-sm ${
                            statusConfig[incident.status].color
                          }`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          {incident.status}
                        </span>
                      </div>
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
