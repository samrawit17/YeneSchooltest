"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Clock, Plus, Shield, User, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { disciplineAPI } from "@/lib/api/people";
import { studentsAPI } from "@/lib/api/students";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface HomeroomStudent {
  id: string;
  userId: string;
  name: string;
  studentCode?: string;
  className?: string;
  section?: string;
}

interface DisciplineIncident {
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

export default function TeacherDisciplinePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<HomeroomStudent[]>([]);
  const [incidents, setIncidents] = useState<DisciplineIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "LOW" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", actionTaken: "" });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    if (!authLoading && isAuthenticated && user?.role !== "TEACHER") {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router, user?.role]);

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || user?.role !== "TEACHER") return;

      setLoading(true);
      try {
        const studentsResponse = await studentsAPI.getHomeroomStudents();
        const rows = studentsResponse.data?.data || studentsResponse.data?.students || studentsResponse.data || [];
        const homeroomStudents: HomeroomStudent[] = Array.isArray(rows)
          ? rows.map((student: any) => ({
              id: student.studentId || student.id,
              userId: student.userId || student.student?.userId || student.student?.id || student.id,
              name: student.name || student.student?.user?.name || "Unknown",
              studentCode: student.studentCode || student.student?.studentCode,
              className: student.className || student.student?.className,
              section: student.section || student.student?.section,
            }))
          : [];

        setStudents(homeroomStudents);

        const aggregated = await Promise.all(
          homeroomStudents.map(async (student) => {
            try {
              const resp = await disciplineAPI.getStudentIncidents(student.userId);
              const studentIncidents = Array.isArray(resp.data) ? resp.data : resp.data?.data || [];
              return studentIncidents.map((incident: any) => ({
                id: incident.id,
                title: incident.title,
                description: incident.description,
                severity: incident.severity,
                status: incident.status,
                incidentDate: incident.incidentDate,
                outcome: incident.outcome,
                childName: student.name,
                childId: student.id,
              }));
            } catch {
              return [];
            }
          }),
        );

        setIncidents(aggregated.flat());
      } catch (error) {
        console.error("Failed to load discipline records:", error);
        setStudents([]);
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, user?.role]);

  const filteredIncidents = useMemo(() => {
    if (selectedStudentId === "all") return incidents;
    return incidents.filter((i) => String(i.childId) === String(selectedStudentId));
  }, [incidents, selectedStudentId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "TEACHER") return null;

  const openIncidents = filteredIncidents.filter((incident) => incident.status !== "RESOLVED");
  const resolvedIncidents = filteredIncidents.filter((incident) => incident.status === "RESOLVED");

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleCreateIncident = async () => {
    if (!selectedStudent || !user?.schoolId || !form.title.trim()) return;
    setSubmitting(true);
    try {
      await disciplineAPI.createIncident({
        schoolId: user.schoolId,
        studentId: selectedStudent.userId,
        reportedBy: user.id,
        incidentDate: new Date().toISOString(),
        title: form.title,
        description: form.description,
        severity: form.severity,
        actionTaken: form.actionTaken,
      });
      setDialogOpen(false);
      setForm({ title: "", description: "", severity: "LOW", actionTaken: "" });
      window.location.reload();
    } catch (error) {
      console.error("Failed to create incident:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Discipline Records</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View incidents for your homeroom students
            </p>
          </div>
          {students.length > 1 && (
            <div className="flex items-center gap-2 shrink-0 mr-[30px]">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Select Student</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-full max-w-[200px] dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} — {student.className || "N/A"}{student.section ? ` - ${student.section}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStudentId !== "all" && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus className="w-4 h-4" />
                      Add Incident
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>New Discipline Incident</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          placeholder="Brief title of the incident"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="Detailed description of what happened"
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="severity">Severity</Label>
                        <Select
                          value={form.severity}
                          onValueChange={(v) => setForm({ ...form, severity: v as any })}
                        >
                          <SelectTrigger id="severity">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actionTaken">Action Taken</Label>
                        <Input
                          id="actionTaken"
                          value={form.actionTaken}
                          onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                          placeholder="What action was taken"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateIncident} disabled={submitting || !form.title.trim()}>
                        {submitting ? "Saving..." : "Save Incident"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Homeroom Students</p>
              <p className="text-xl font-bold dark:text-white">{students.length}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Open Incidents</p>
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
              <Users className="w-10 h-10 text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No discipline records found for your students</p>
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
                      <div className="flex items-start justify-between gap-4">
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
                              {incident.childName} • {new Date(incident.incidentDate).toLocaleDateString()}
                            </p>
                            <TranslatedText
                              text={incident.description}
                              textClassName="text-sm text-gray-600 dark:text-gray-300"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={severityColors[incident.severity]} variant="secondary">
                            {incident.severity}
                          </Badge>
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
