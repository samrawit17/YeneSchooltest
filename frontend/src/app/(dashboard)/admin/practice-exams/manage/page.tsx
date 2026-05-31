"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Eye, Loader2, MoreVertical, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { practiceExamsAPI, type PracticeExam, type PracticeExamStatus } from "@/lib/api";

const statusTone: Record<PracticeExamStatus, string> = {
  DRAFT: "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
  READY: "border-sky-200 text-sky-700 dark:border-sky-900 dark:text-sky-300",
  ACTIVE: "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  ARCHIVED: "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300",
};

function formatStream(stream?: string | null) {
  if (stream === "NATURAL") return "Natural";
  if (stream === "SOCIAL") return "Social";
  return "-";
}

export default function ManageOnlineExamsPage() {
  const queryClient = useQueryClient();
  const [editingExam, setEditingExam] = useState<PracticeExam | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    accessCode: "",
    durationMinutes: "60",
    passMark: "50",
    status: "DRAFT" as PracticeExamStatus,
  });
  const [deleteConfirmExam, setDeleteConfirmExam] = useState<PracticeExam | null>(null);

  const examsQuery = useQuery({
    queryKey: ["practice-exams-admin"],
    queryFn: async () => (await practiceExamsAPI.listAdmin()).data,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PracticeExamStatus }) =>
      practiceExamsAPI.update(id, { status }),
    onSuccess: () => {
      toast.success("Exam status updated");
      queryClient.invalidateQueries({ queryKey: ["practice-exams-admin"] });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Failed to update exam"),
  });

  const deleteExam = useMutation({
    mutationFn: (id: string) => practiceExamsAPI.delete(id),
    onSuccess: () => {
      toast.success("Exam deleted");
      setDeleteConfirmExam(null);
      queryClient.invalidateQueries({ queryKey: ["practice-exams-admin"] });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Failed to delete exam"),
  });

  const updateExam = useMutation({
    mutationFn: () => {
      if (!editingExam) throw new Error("Select an exam to edit");
      return practiceExamsAPI.update(editingExam.id, {
        title: editForm.title,
        accessCode: editForm.accessCode,
        durationMinutes: Number(editForm.durationMinutes),
        passMark: Number(editForm.passMark),
        status: editForm.status,
      });
    },
    onSuccess: () => {
      toast.success("Exam updated");
      setEditingExam(null);
      queryClient.invalidateQueries({ queryKey: ["practice-exams-admin"] });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || error.message || "Failed to update exam"),
  });

  const exams: PracticeExam[] = examsQuery.data || [];

  const openEdit = (exam: PracticeExam) => {
    setEditingExam(exam);
    setEditForm({
      title: exam.title,
      accessCode: exam.accessCode || "",
      durationMinutes: String(exam.durationMinutes),
      passMark: String(exam.passMark),
      status: exam.status,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/practice-exams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Manage Exams</h1>
            <p className="text-sm text-slate-500">All created online examinations.</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/practice-exams#create-exams">
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Online Exams</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {examsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading exams...
            </div>
          ) : exams.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No online exams have been created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Pass Mark</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="min-w-56 font-medium">{exam.title}</TableCell>
                      <TableCell>Grade {exam.grade}</TableCell>
                      <TableCell>{formatStream(exam.stream)}</TableCell>
                      <TableCell className="font-mono">{exam.accessCode}</TableCell>
                      <TableCell>{exam._count?.questions ?? 0}</TableCell>
                      <TableCell>{exam._count?.attempts ?? 0}</TableCell>
                      <TableCell>{exam.durationMinutes} min</TableCell>
                      <TableCell>{exam.passMark}%</TableCell>
                      <TableCell>
                        <Select
                          value={exam.status}
                          onValueChange={(status) =>
                            updateStatus.mutate({ id: exam.id, status: status as PracticeExamStatus })
                          }
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="READY">Ready</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-auto">
                              <MoreVertical className="w-4 h-4 text-gray-900 dark:text-white" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/practice-exams?examId=${exam.id}`} className="flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(exam)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={deleteExam.isPending}
                              onClick={() => setDeleteConfirmExam(exam)}
                            >
                              <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingExam && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-lg">Edit Exam</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{editingExam.title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingExam(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="edit-admin-exam-title">Exam title</Label>
                <Input
                  id="edit-admin-exam-title"
                  value={editForm.title}
                  onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-admin-exam-code">Exam code</Label>
                <Input
                  id="edit-admin-exam-code"
                  value={editForm.accessCode}
                  onChange={(event) => setEditForm({ ...editForm, accessCode: event.target.value.toUpperCase() })}
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(status) => setEditForm({ ...editForm, status: status as PracticeExamStatus })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="READY">Ready</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-admin-exam-duration">Duration</Label>
                <Input
                  id="edit-admin-exam-duration"
                  type="number"
                  min="1"
                  value={editForm.durationMinutes}
                  onChange={(event) => setEditForm({ ...editForm, durationMinutes: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-admin-exam-pass-mark">Pass mark</Label>
                <Input
                  id="edit-admin-exam-pass-mark"
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.passMark}
                  onChange={(event) => setEditForm({ ...editForm, passMark: event.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button variant="outline" onClick={() => setEditingExam(null)}>Cancel</Button>
                <Button disabled={updateExam.isPending || !editForm.title.trim()} onClick={() => updateExam.mutate()}>
                  {updateExam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body,
      ) : null}

      {deleteConfirmExam && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-lg">Delete Exam?</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                This will delete {deleteConfirmExam.title} and its questions.
              </p>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmExam(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteExam.isPending}
                onClick={() => deleteExam.mutate(deleteConfirmExam.id)}
              >
                {deleteExam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </Button>
            </CardContent>
          </Card>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
