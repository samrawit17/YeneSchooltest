"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle, FileText, ListChecks, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { gradingAPI, practiceExamsAPI, schoolSettingsAPI, type PracticeExam, type PracticeExamQuestion } from "@/lib/api";
import { getGradeNumbersFromSystem } from "@/lib/grade-system";

interface TeacherAssignment {
  id: string;
  subject: { id: string; name: string };
  class: { id: string; name: string };
  section: { id: string; name: string; stream?: string | null };
}

const emptyQuestion = {
  subject: "",
  questionType: "MCQ",
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  correctText: "",
  caseSensitive: false,
};

const normalizeAssignments = (payload: any): TeacherAssignment[] => {
  const root = payload?.data ?? payload;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.subjectAssignments)) return root.subjectAssignments;
  if (Array.isArray(root?.assignments)) return root.assignments;
  if (Array.isArray(root?.data)) return root.data;
  return [];
};

const extractGrade = (value?: string | null) => {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : undefined;
};

export default function TeacherOnlineExamsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentAcademicYear } = useAcademicYear();
  const searchParams = useSearchParams();
  const examIdFromUrl = searchParams.get("examId") || "";
  const [selectedExamId, setSelectedExamId] = useState("");
  const [examForm, setExamForm] = useState({
    assignmentId: "",
    title: "",
    accessCode: "",
    durationMinutes: "60",
    passMark: "50",
    status: "DRAFT",
  });
  const [questionForm, setQuestionForm] = useState<any>(emptyQuestion);
  const [editForm, setEditForm] = useState({
    title: "",
    accessCode: "",
    durationMinutes: "60",
    passMark: "50",
    status: "DRAFT",
  });
  const [csv, setCsv] = useState("");

  const assignmentsQuery = useQuery({
    queryKey: ["teacher-online-exam-assignments", currentAcademicYear?.id],
    queryFn: async () =>
      normalizeAssignments(
        (await gradingAPI.getTeacherAssignments({ academicYear: currentAcademicYear?.id })).data,
      ),
    enabled: !!currentAcademicYear?.id,
  });
  const schoolSettingsQuery = useQuery({
    queryKey: ["school-settings", user?.schoolId, "teacher-online-exam-grades"],
    queryFn: async () => (await schoolSettingsAPI.getAll(user!.schoolId as string)).data,
    enabled: !!user?.schoolId,
  });

  const examsQuery = useQuery({
    queryKey: ["teacher-online-exams"],
    queryFn: async () => (await practiceExamsAPI.listAdmin()).data,
  });

  const gradeOptions = useMemo(
    () => getGradeNumbersFromSystem(schoolSettingsQuery.data?.grade_system || "1-12"),
    [schoolSettingsQuery.data?.grade_system],
  );
  const assignments = useMemo(
    () => (assignmentsQuery.data || []).filter((assignment) => {
      const grade = extractGrade(assignment.class.name);
      return !!grade && gradeOptions.includes(grade);
    }),
    [assignmentsQuery.data, gradeOptions],
  );
  const selectedAssignment = assignments.find((assignment) => assignment.id === examForm.assignmentId);
  const selectedExam = useMemo(
    () => examsQuery.data?.find((exam) => exam.id === selectedExamId) || examsQuery.data?.[0],
    [examsQuery.data, selectedExamId],
  );

  const examDetailQuery = useQuery({
    queryKey: ["teacher-online-exam-detail", selectedExam?.id],
    queryFn: async () => (await practiceExamsAPI.get(selectedExam!.id)).data,
    enabled: !!selectedExam?.id,
  });

  useEffect(() => {
    if (examIdFromUrl) setSelectedExamId(examIdFromUrl);
  }, [examIdFromUrl]);

  useEffect(() => {
    if (!selectedExam) return;
    setEditForm({
      title: selectedExam.title,
      accessCode: selectedExam.accessCode || "",
      durationMinutes: String(selectedExam.durationMinutes),
      passMark: String(selectedExam.passMark),
      status: selectedExam.status,
    });
  }, [selectedExam?.id, selectedExam?.title, selectedExam?.accessCode, selectedExam?.durationMinutes, selectedExam?.passMark, selectedExam?.status]);

  const createExam = useMutation({
    mutationFn: () => {
      if (!selectedAssignment) throw new Error("Select an assigned class and subject");
      const grade = extractGrade(selectedAssignment.class.name);
      if (!grade) throw new Error("Could not detect the grade for this assignment");
      return practiceExamsAPI.create({
        title: examForm.title,
        grade,
        classId: selectedAssignment.class.id,
        sectionId: selectedAssignment.section.id,
        subjectId: selectedAssignment.subject.id,
        accessCode: examForm.accessCode,
        durationMinutes: Number(examForm.durationMinutes),
        passMark: Number(examForm.passMark),
        status: examForm.status as any,
      });
    },
    onSuccess: (res) => {
      toast.success("Online exam created");
      setSelectedExamId(res.data.id);
      setExamForm({ assignmentId: "", title: "", accessCode: "", durationMinutes: "60", passMark: "50", status: "DRAFT" });
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exams"] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.message || "Failed to create exam"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => practiceExamsAPI.update(id, { status: status as any }),
    onSuccess: () => {
      toast.success("Exam updated");
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exams"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exam-detail", selectedExam?.id] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to update exam"),
  });

  const updateExam = useMutation({
    mutationFn: () =>
      practiceExamsAPI.update(selectedExam!.id, {
        title: editForm.title,
        accessCode: editForm.accessCode,
        durationMinutes: Number(editForm.durationMinutes),
        passMark: Number(editForm.passMark),
        status: editForm.status as any,
      }),
    onSuccess: () => {
      toast.success("Exam saved");
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exams"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exam-detail", selectedExam?.id] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to save exam"),
  });

  const addQuestion = useMutation({
    mutationFn: () => practiceExamsAPI.addQuestion(selectedExam!.id, questionForm),
    onSuccess: () => {
      toast.success("Question added");
      setQuestionForm(emptyQuestion);
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exam-detail", selectedExam?.id] });
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exams"] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to add question"),
  });

  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) => practiceExamsAPI.deleteQuestion(selectedExam!.id, questionId),
    onSuccess: () => {
      toast.success("Question deleted");
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exam-detail", selectedExam?.id] });
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exams"] });
    },
  });

  const importQuestions = useMutation({
    mutationFn: () => practiceExamsAPI.importQuestions(selectedExam!.id, csv),
    onSuccess: (res) => {
      toast.success(`Imported ${res.data.createdCount} questions`);
      if (res.data.failedCount) toast.error(`${res.data.failedCount} rows failed`);
      setCsv("");
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exam-detail", selectedExam?.id] });
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exams"] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Import failed"),
  });

  const handleCsvFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    setCsv(await file.text());
  };

  const questions = examDetailQuery.data?.questions || [];
  const questionType = questionForm.questionType || "MCQ";
  const optionLabels = questionType === "TRUE_FALSE" ? (["A", "B"] as const) : (["A", "B", "C", "D"] as const);
  const selectedExamAttemptCount = selectedExam?._count?.attempts ?? 0;
  const setupLocked = Boolean(selectedExam && (selectedExam.status === "ACTIVE" || selectedExamAttemptCount > 0));
  const questionBankLocked = setupLocked;
  const lockReason =
    selectedExamAttemptCount > 0
      ? "Students have already started this exam, so setup and question changes are locked."
      : selectedExam?.status === "ACTIVE"
        ? "This exam is active, so setup and question changes are locked."
        : "";

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Online Exams</h1>
        <p className="text-sm text-gray-500">Create exams for your assigned class, section, and subject.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card id="create-exams" className="scroll-mt-6">
            <CardHeader><CardTitle className="text-base">Create Exam</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Assignment</Label>
                <Select value={examForm.assignmentId} onValueChange={(assignmentId) => setExamForm({ ...examForm, assignmentId })}>
                  <SelectTrigger><SelectValue placeholder={assignmentsQuery.isLoading ? "Loading..." : "Class / section / subject"} /></SelectTrigger>
                  <SelectContent>
                    {assignments.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {assignment.class.name} {assignment.section.name} - {assignment.subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!assignmentsQuery.isLoading && assignments.length === 0 ? (
                  <p className="text-xs text-gray-500">No assigned classes match this school's configured grade levels.</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="online-exam-title">Exam title</Label>
                <Input id="online-exam-title" value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} placeholder="Chapter 1 Quiz" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="online-exam-code">Exam code</Label>
                <Input id="online-exam-code" value={examForm.accessCode} onChange={(e) => setExamForm({ ...examForm, accessCode: e.target.value.toUpperCase() })} placeholder="AUTO" className="uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="online-exam-duration">Duration</Label>
                  <Input id="online-exam-duration" type="number" min="1" value={examForm.durationMinutes} onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="online-exam-pass">Pass mark</Label>
                  <Input id="online-exam-pass" type="number" min="0" max="100" value={examForm.passMark} onChange={(e) => setExamForm({ ...examForm, passMark: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={examForm.status} onValueChange={(status) => setExamForm({ ...examForm, status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="READY">Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={createExam.isPending || !examForm.title.trim() || !examForm.assignmentId} onClick={() => createExam.mutate()}>
                {createExam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">My Exams</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/teacher/online-exams/manage">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Manage
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {examsQuery.isLoading ? (
                <div className="flex items-center py-8 text-sm text-gray-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading exams...</div>
              ) : (examsQuery.data || []).length === 0 ? (
                <div className="py-8 text-sm text-gray-500">No online exams created yet.</div>
              ) : (
                (examsQuery.data || []).map((exam: PracticeExam) => (
                  <button key={exam.id} onClick={() => setSelectedExamId(exam.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${selectedExam?.id === exam.id ? "border-[var(--brand-color,#e35336)] bg-red-50 dark:bg-red-950/20" : "border-gray-200 dark:border-[#2A2A2A]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{exam.title}</span>
                      <Badge variant="outline">{exam.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Grade {exam.grade}{exam.stream ? ` ${exam.stream}` : ""} - {exam._count?.questions || 0} questions</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedExam ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>{selectedExam.title}</CardTitle>
                      <p className="text-sm text-gray-500">Grade {selectedExam.grade}{selectedExam.stream ? ` ${selectedExam.stream}` : ""} - {selectedExam.durationMinutes} minutes - Code {selectedExam.accessCode}</p>
                  </div>
                    <Select value={selectedExam.status} onValueChange={(status) => updateStatus.mutate({ id: selectedExam.id, status })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="READY">Ready</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Edit Exam</CardTitle></CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {setupLocked ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 md:col-span-2">
                      {lockReason}
                    </div>
                  ) : null}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="edit-online-exam-title">Exam title</Label>
                    <Input id="edit-online-exam-title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-online-exam-code">Exam code</Label>
                    <Input id="edit-online-exam-code" value={editForm.accessCode} disabled={setupLocked} onChange={(e) => setEditForm({ ...editForm, accessCode: e.target.value.toUpperCase() })} className="uppercase" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-online-exam-duration">Duration</Label>
                    <Input id="edit-online-exam-duration" type="number" min="1" value={editForm.durationMinutes} disabled={setupLocked} onChange={(e) => setEditForm({ ...editForm, durationMinutes: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-online-exam-pass">Pass mark</Label>
                    <Input id="edit-online-exam-pass" type="number" min="0" max="100" value={editForm.passMark} disabled={setupLocked} onChange={(e) => setEditForm({ ...editForm, passMark: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={editForm.status} onValueChange={(status) => setEditForm({ ...editForm, status })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="READY">Ready</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button disabled={updateExam.isPending || !editForm.title.trim() || setupLocked} onClick={() => updateExam.mutate()}>
                      {updateExam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Add Question</CardTitle></CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {questionBankLocked ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 md:col-span-2">
                      {lockReason}
                    </div>
                  ) : null}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="online-question-subject">Subject label</Label>
                    <Input id="online-question-subject" value={questionForm.subject} disabled={questionBankLocked} onChange={(e) => setQuestionForm({ ...questionForm, subject: e.target.value })} placeholder="Mathematics" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Question type</Label>
                    <Select
                      value={questionType}
                      disabled={questionBankLocked}
                      onValueChange={(nextType) =>
                        setQuestionForm({
                          ...questionForm,
                          questionType: nextType,
                          optionA: nextType === "TRUE_FALSE" ? "True" : nextType === "SHORT_ANSWER" ? "" : questionForm.optionA,
                          optionB: nextType === "TRUE_FALSE" ? "False" : nextType === "SHORT_ANSWER" ? "" : questionForm.optionB,
                          optionC: nextType === "SHORT_ANSWER" || nextType === "TRUE_FALSE" ? "" : questionForm.optionC,
                          optionD: nextType === "SHORT_ANSWER" || nextType === "TRUE_FALSE" ? "" : questionForm.optionD,
                          correctOption: nextType === "TRUE_FALSE" ? "A" : questionForm.correctOption || "A",
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MCQ">Multiple choice</SelectItem>
                        <SelectItem value="TRUE_FALSE">True or false</SelectItem>
                        <SelectItem value="SHORT_ANSWER">Short answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="online-question-text">Question</Label>
                    <Textarea id="online-question-text" value={questionForm.questionText} disabled={questionBankLocked} onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} />
                  </div>
                  {questionType !== "SHORT_ANSWER" ? (
                    <>
                      {optionLabels.map((option) => (
                        <div key={option} className="space-y-1.5">
                          <Label htmlFor={`online-option-${option}`}>{questionType === "TRUE_FALSE" ? (option === "A" ? "True label" : "False label") : `Option ${option}`}</Label>
                          <Input id={`online-option-${option}`} value={questionForm[`option${option}`]} disabled={questionBankLocked || questionType === "TRUE_FALSE"} onChange={(e) => setQuestionForm({ ...questionForm, [`option${option}`]: e.target.value })} />
                        </div>
                      ))}
                      <div className="space-y-1.5">
                        <Label>{questionType === "TRUE_FALSE" ? "Correct answer" : "Correct option"}</Label>
                        <Select value={questionForm.correctOption} disabled={questionBankLocked} onValueChange={(correctOption) => setQuestionForm({ ...questionForm, correctOption })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {optionLabels.map((option) => <SelectItem key={option} value={option}>{questionType === "TRUE_FALSE" ? (option === "A" ? "True" : "False") : option}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="online-short-answer">Accepted answer</Label>
                        <Input id="online-short-answer" value={questionForm.correctText} disabled={questionBankLocked} onChange={(e) => setQuestionForm({ ...questionForm, correctText: e.target.value })} placeholder="Exact answer or variants separated by |" />
                      </div>
                      <label className="flex items-end gap-2 pb-2 text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={!!questionForm.caseSensitive} disabled={questionBankLocked} onChange={(e) => setQuestionForm({ ...questionForm, caseSensitive: e.target.checked })} />
                        Case sensitive
                      </label>
                    </>
                  )}
                  <div className="flex items-end">
                    <Button disabled={addQuestion.isPending || !selectedExam || questionBankLocked} onClick={() => addQuestion.mutate()}>
                      {addQuestion.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Add Question
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">CSV Import</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input type="file" accept=".csv" onChange={(event) => handleCsvFile(event.target.files?.[0])} />
                  <Textarea
                    rows={6}
                    placeholder={"subject,question_type,question,option_a,option_b,option_c,option_d,correct_answer,case_sensitive\nMathematics,MCQ,What is 5+7?,10,11,12,13,C,false\nCivics,TRUE_FALSE,The capital city of Ethiopia is Addis Ababa.,,,,,True,false\nEnglish,SHORT_ANSWER,Write a greeting.,,,,,Hello|Hi,false"}
                    value={csv}
                    disabled={questionBankLocked}
                    onChange={(event) => setCsv(event.target.value)}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Use question_type MCQ, TRUE_FALSE, or SHORT_ANSWER. Short answers can include accepted variants separated by |.
                  </p>
                  <Button variant="outline" disabled={importQuestions.isPending || !csv.trim() || questionBankLocked} onClick={() => importQuestions.mutate()}>
                    {importQuestions.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Import Questions
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Questions ({questions.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {examDetailQuery.isLoading ? (
                    <div className="flex items-center py-8 text-sm text-gray-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading questions...</div>
                  ) : questions.length === 0 ? (
                    <div className="py-8 text-sm text-gray-500">No questions added yet.</div>
                  ) : (
                    questions.map((question: PracticeExamQuestion, index: number) => (
                      <div key={question.id} className="rounded-lg border border-gray-200 p-4 dark:border-[#2A2A2A]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">Question {index + 1}</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{question.questionText}</p>
                            <p className="mt-2 text-xs text-gray-500">
                              {question.questionType === "SHORT_ANSWER"
                                ? `Short answer: ${question.correctText || "-"}`
                                : question.questionType === "TRUE_FALSE"
                                  ? `True/false: ${question.correctOption === "A" ? "True" : "False"}`
                                  : `Answer: ${question.correctOption}`}
                            </p>
                          </div>
                          <Button variant="outline" size="icon" disabled={questionBankLocked || deleteQuestion.isPending} onClick={() => deleteQuestion.mutate(question.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex min-h-80 flex-col items-center justify-center text-center text-sm text-gray-500">
                <BookOpen className="mb-3 h-10 w-10 text-gray-300" />
                Create or select an online exam.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
