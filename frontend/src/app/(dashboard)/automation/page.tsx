"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  History,
  Play,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RuleBuilder from "@/components/automation/RuleBuilder";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { automationAPI, type AutomationRule } from "@/lib/api/automation";

const EVENT_LABELS: Record<string, string> = {
  "attendance.marked": "Attendance Marked",
  "attendance.bulk": "Bulk Attendance",
  "fee.overdue": "Fee Overdue",
  "fee.paid": "Fee Paid",
  "grade.published": "Grade Published",
  "student.created": "Student Created",
  "student.updated": "Student Updated",
  "exam.created": "Exam Created",
  "exam.result": "Exam Result Published",
  "discipline.created": "Discipline Incident",
  "enrollment.pending": "Enrollment Pending",
  "enrollment.approved": "Enrollment Approved",
};

export default function AutomationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: async () => (await automationAPI.listRules()).data,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      automationAPI.toggleRule(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Rule updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to toggle rule"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => automationAPI.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Rule deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to delete rule"),
  });

  const rules = data?.data || [];

  return (
    <div className="bg-gray-50 p-6 dark:bg-[#111111]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Automation Rules</h1>
          <p className="text-sm text-gray-500">Create if-then rules that automate actions across your school.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/automation/logs")}>
            <History className="mr-2 h-4 w-4" />
            Execution Logs
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg" style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center gap-4 h-full min-h-[300px]">
            <Play className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No automation rules yet</h3>
              <p className="text-sm text-gray-500">Create your first rule to automate school workflows.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule: AutomationRule) => (
            <Card key={rule.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
                    <Badge variant={rule.isActive ? "default" : "secondary"} className="shrink-0">
                      {rule.isActive ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Disabled
                        </span>
                      )}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <Badge variant="outline" className="text-xs">
                      {EVENT_LABELS[rule.eventTrigger] || rule.eventTrigger}
                    </Badge>
                    <span>
                      {rule.actions?.length || 0} action{(rule.actions?.length || 0) !== 1 ? "s" : ""}
                    </span>
                    {rule.description && <span className="truncate max-w-xs">{rule.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                    title={rule.isActive ? "Disable rule" : "Enable rule"}
                  >
                    {rule.isActive ? (
                      <ToggleRight className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/automation/${rule.id}/edit`)}
                    title="Edit rule"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDeleteId(rule.id)}
                    disabled={deleteMutation.isPending && deletingId === rule.id}
                    title="Delete rule"
                  >
                    {deleteMutation.isPending && deletingId === rule.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this rule and its execution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!confirmDeleteId) return;
                setDeletingId(confirmDeleteId);
                deleteMutation.mutate(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
          </DialogHeader>
          <RuleBuilder
            onAfterSave={() => {
              setShowCreateForm(false);
              queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
