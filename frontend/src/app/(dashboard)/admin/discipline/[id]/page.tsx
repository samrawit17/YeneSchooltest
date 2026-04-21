"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { disciplineAPI } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, ArrowLeft, User, Calendar, FileText } from "lucide-react";

interface IncidentDetail {
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

export default function IncidentDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [updateData, setUpdateData] = useState({
    status: "" as "OPEN" | "INVESTIGATING" | "RESOLVED" | "ESCALATED",
    outcome: "",
    actionTaken: "",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      loadIncident();
    }
  }, [isAuthenticated, params.id]);

  async function loadIncident() {
    setLoading(true);
    try {
      const resp = await disciplineAPI.getIncident(params.id as string);
      const data = resp.data;
      setIncident(data);
      setUpdateData({
        status: data.status,
        outcome: data.outcome || "",
        actionTaken: data.actionTaken || "",
      });
    } catch (error) {
      console.error("Failed to load incident", error);
      toast.error("Failed to load incident");
      router.push("/admin/discipline");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    setUpdating(true);
    try {
      await disciplineAPI.updateIncident(params.id as string, {
        status: updateData.status,
        outcome: updateData.outcome || undefined,
        actionTaken: updateData.actionTaken || undefined,
      });
      toast.success("Incident updated successfully");
      loadIncident();
    } catch (error) {
      console.error("Failed to update incident", error);
      toast.error("Failed to update incident");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this incident?")) return;
    
    try {
      await disciplineAPI.deleteIncident(params.id as string);
      toast.success("Incident deleted");
      router.push("/admin/discipline");
    } catch (error) {
      console.error("Failed to delete incident", error);
      toast.error("Failed to delete incident");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !incident) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/discipline")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#e35336]">
                  Incident Details
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {incident.title}
                </p>
              </div>
            </div>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Incident Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">Severity</Label>
                <p className={`mt-1 inline-block px-3 py-1 rounded-full text-sm font-medium ${severityColors[incident.severity]}`}>
                  {incident.severity}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">Status</Label>
                <p className="mt-1 text-lg font-medium dark:text-white">{incident.status}</p>
              </div>
            </div>

            <div>
              <Label className="text-gray-500">Student</Label>
              <div className="mt-1 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium dark:text-white">
                  {incident.student.user.name}
                </span>
                <span className="text-gray-500">({incident.student.studentCode})</span>
              </div>
            </div>

            <div>
              <Label className="text-gray-500">Incident Date</Label>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="dark:text-white">
                  {new Date(incident.incidentDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-gray-500">Description</Label>
              <p className="mt-1 dark:text-white">{incident.description}</p>
            </div>

            {incident.actionTaken && (
              <div>
                <Label className="text-gray-500">Action Taken</Label>
                <p className="mt-1 dark:text-white">{incident.actionTaken}</p>
              </div>
            )}

            <div>
              <Label className="text-gray-500">Reported By</Label>
              <p className="mt-1 dark:text-white">{incident.reporter.name}</p>
            </div>
          </CardContent>
        </Card>

        {user?.role === "admin" && (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Update Incident</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={updateData.status}
                  onValueChange={(value: "OPEN" | "INVESTIGATING" | "RESOLVED" | "ESCALATED") =>
                    setUpdateData({ ...updateData, status: value })
                  }
                >
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="ESCALATED">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Action Taken</Label>
                <Textarea
                  value={updateData.actionTaken}
                  onChange={(e) =>
                    setUpdateData({ ...updateData, actionTaken: e.target.value })
                  }
                  placeholder="What action was taken?"
                  rows={3}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Outcome</Label>
                <Textarea
                  value={updateData.outcome}
                  onChange={(e) =>
                    setUpdateData({ ...updateData, outcome: e.target.value })
                  }
                  placeholder="What was the outcome?"
                  rows={3}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <Button
                onClick={handleUpdate}
                disabled={updating}
                className="bg-[#e35336] hover:bg-[#d1482f]"
              >
                {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Incident
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}