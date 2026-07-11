"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { practiceExamsAPI, schoolSettingsAPI, type PracticeExam, type PracticeExamQuestion } from "@/lib/api";
import { getGradeNumbersFromSystem } from "@/lib/grade-system";

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

export default function AdminPracticeExamsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedExamId, setSelectedExamId] = useState("");
  const [examForm, setExamForm] = useState({
    title: "",
    grade: "",
    stream: "",
    accessCode: "",
    durationMinutes: "60",
    passMark: "50",
    status: "DRAFT",
  });
  const [questionForm, setQuestionForm] = useState<any>(emptyQuestion);
  const [csv, setCsv] = useState("");

  const examsQuery = useQuery({
    queryKey: ["practice-exams-admin"],
    queryFn: async () => (await practiceExamsAPI.listAdmin()).data,
  });
  const schoolSettingsQuery = useQuery({
    queryKey: ["school-settings", user?.schoolId, "online-exam-grades"],
    queryFn: async () => (await schoolSettingsAPI.getAll(user!.schoolId as string)).data,
    enabled: !!user?.schoolId,
  });
  const gradeOptions = useMemo(
    () => getGradeNumbersFromSystem(schoolSettingsQuery.data?.grade_system || "1-12"),
    [schoolSettingsQuery.data?.grade_system],
  );
  const streamRequired = ["11", "12"].includes(examForm.grade);

  useEffect(() => {
    if (!gradeOptions.length) return;
    if (!examForm.grade || !gradeOptions.includes(Number(examForm.grade))) {
      setExamForm((current) => ({
        ...current,
        grade: String(gradeOptions[0]),
        stream: [11, 12].includes(gradeOptions[0]) ? current.stream : "",
      }));
    }
  }, [examForm.grade, gradeOptions]);
  const selectedExam = useMemo(
    () => examsQuery.data?.find((exam) => exam.id === selectedExamId) || examsQuery.data?.[0],
    [examsQuery.data, selectedExamId],
  );
  const examDetailQuery = useQuery({
    queryKey: ["practice-exam-detail", selectedExam?.id],
    queryFn: async () => (await practiceExamsAPI.get(selectedExam!.id)).data,
    enabled: !!selectedExam?.id,
  });

  const createExam = useMutation({
    mutationFn: () => practiceExamsAPI.create({
      title: examForm.title,
      grade: Number(examForm.grade),
      stream: streamRequired ? examForm.stream : undefined,
      accessCode: examForm.accessCode,
      durationMinutes: Number(examForm.durationMinutes),
      passMark: Number(examForm.passMark),
      status: examForm.status as any,
    }),
    onSuccess: (res) => {
      toast.success("Practice exam created");
      setSelectedExamId(res.data.id);
      setExamForm({ title: "", grade: String(gradeOptions[0] || ""), stream: "", accessCode: "", durationMinutes: "60", passMark: "50", status: "DRAFT" });
      queryClient.invalidateQueries({ queryKey: ["practice-exams-admin"] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to create exam"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => practiceExamsAPI.update(id, { status: status as any }),
    onSuccess: () => {
      toast.success("Exam updated");
      queryClient.invalidateQueries({ queryKey: ["practice-exams-admin"] });
      queryClient.invalidateQueries({ queryKey: ["practice-exam-detail", selectedExam?.id] });
    },
  });

  const addQuestion = useMutation({
    mutationFn: () => practiceExamsAPI.addQuestion(selectedExam!.id, questionForm),
    onSuccess: () => {
      toast.success("Question added");
      setQuestionForm(emptyQuestion);
      queryClient.invalidateQueries({ queryKey: ["practice-exam-detail", selectedExam?.id] });
      queryClient.invalidateQueries({ queryKey: ["practice-exams-admin"] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to add question"),
  });

  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) => practiceExamsAPI.deleteQuestion(selectedExam!.id, questionId),
    onSuccess: () => {
      toast.success("Question deleted");
      queryClient.invalidateQueries({ queryKey: ["practice-exam-detail", selectedExam?.id] });
      queryClient.invalidateQueries({ queryKey: ["practice-exams-admin"] });
    },
  });

  const importQuestions = useMutation({
    mutationFn: () => practiceExamsAPI.importQuestions(selectedExam!.id, csv),
    onSuccess: (res) => {
      toast.success(`Imported ${res.data.createdCount} questions`);
      if (res.data.failedCount) toast.error(`${res.data.failedCount} rows failed`);
      setCsv("");
      queryClient.invalidateQueries({ queryKey: ["practice-exam-detail", selectedExam?.id] });
      queryClient.invalidateQueries({ queryKey: ["practice-exams-admin"] });
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

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Practice Exams</h1>
        <p className="text-sm text-gray-500">Independent MCQ online exams for assigned grades and streams.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card id="create-exams" className="scroll-mt-6">
            <CardHeader><CardTitle className="text-base">Create Exam</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="practice-exam-title">Exam title</Label>
                <Input id="practice-exam-title" placeholder="Grade 8 Mock Exam" value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="practice-exam-code">Exam code</Label>
                <Input id="practice-exam-code" placeholder="AUTO" value={examForm.accessCode} onChange={(e) => setExamForm({ ...examForm, accessCode: e.target.value.toUpperCase() })} className="uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Grade</Label>
                  <Select value={examForm.grade} onValueChange={(grade) => setExamForm({ ...examForm, grade, stream: ["11", "12"].includes(grade) ? examForm.stream : "" })}>
                    <SelectTrigger><SelectValue placeholder={schoolSettingsQuery.isLoading ? "Loading..." : "Grade"} /></SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((grade) => (
                        <SelectItem key={grade} value={String(grade)}>Grade {grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {streamRequired ? (
                  <div className="space-y-1.5">
                    <Label>Stream</Label>
                    <Select value={examForm.stream} onValueChange={(stream) => setExamForm({ ...examForm, stream })}>
                      <SelectTrigger><SelectValue placeholder="Stream" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NATURAL">Natural</SelectItem>
                        <SelectItem value="SOCIAL">Social</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="practice-exam-duration">Duration (minutes)</Label>
                  <Input id="practice-exam-duration" type="number" min="1" placeholder="60" value={examForm.durationMinutes} onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="practice-exam-pass-mark">Pass mark (%)</Label>
                  <Input id="practice-exam-pass-mark" type="number" min="0" max="100" placeholder="50" value={examForm.passMark} onChange={(e) => setExamForm({ ...examForm, passMark: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Question count is created by adding questions manually or importing a CSV after the exam is created.
              </p>
              <Button className="w-full bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg" style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }} disabled={createExam.isPending || !examForm.title.trim() || !examForm.grade || (streamRequired && !examForm.stream)} onClick={() => createExam.mutate()}>
                {createExam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </CardContent>
          </Card>

          <Card id="manage-exams" className="scroll-mt-6">
            <CardHeader><CardTitle className="text-base">Exam List</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(examsQuery.data || []).map((exam: PracticeExam) => (
                <button key={exam.id} onClick={() => setSelectedExamId(exam.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${selectedExam?.id === exam.id ? "border-[var(--brand-color,#e35336)] bg-red-50 dark:bg-red-950/20" : "border-gray-200 dark:border-[#2A2A2A]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{exam.title}</span>
                    <Badge variant="outline">{exam.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Grade {exam.grade}{exam.stream ? ` ${exam.stream}` : ""} - {exam._count?.questions || 0} questions</p>
                </button>
              ))}
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
                      <p className="text-sm text-gray-500">Grade {selectedExam.grade}{selectedExam.stream ? ` ${selectedExam.stream}` : ""} - {selectedExam.durationMinutes} minutes</p>
                    </div>
                    <Select value={selectedExam.status} onValueChange={(status) => updateStatus.mutate({ id: selectedExam.id, status })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="READY">Ready</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Add Question</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Subject" value={questionForm.subject} onChange={(e) => setQuestionForm({ ...questionForm, subject: e.target.value })} />
                  <Select
                    value={questionType}
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
                  <Textarea placeholder="Question" value={questionForm.questionText} onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} />
                  {questionType !== "SHORT_ANSWER" ? (
                    <>
                      <div className="grid gap-2 md:grid-cols-2">
                        {optionLabels.map((option) => (
                          <Input key={option} placeholder={questionType === "TRUE_FALSE" ? (option === "A" ? "True" : "False") : `Option ${option}`} disabled={questionType === "TRUE_FALSE"} value={questionForm[`option${option}`]} onChange={(e) => setQuestionForm({ ...questionForm, [`option${option}`]: e.target.value })} />
                        ))}
                      </div>
                      <Select value={questionForm.correctOption} onValueChange={(correctOption) => setQuestionForm({ ...questionForm, correctOption })}>
                        <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {optionLabels.map((option) => <SelectItem key={option} value={option}>{questionType === "TRUE_FALSE" ? (option === "A" ? "Correct True" : "Correct False") : `Correct ${option}`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <Input placeholder="Accepted answer or variants separated by |" value={questionForm.correctText} onChange={(e) => setQuestionForm({ ...questionForm, correctText: e.target.value })} />
                      <label className="flex items-center gap-2 rounded-md border px-3 text-sm dark:border-[#2A2A2A]">
                        <input type="checkbox" checked={!!questionForm.caseSensitive} onChange={(e) => setQuestionForm({ ...questionForm, caseSensitive: e.target.checked })} />
                        Case sensitive
                      </label>
                    </div>
                  )}
                  <div>
                    <Button className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg" style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }} disabled={addQuestion.isPending} onClick={() => addQuestion.mutate()}>
                      {addQuestion.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Save Question
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">CSV Import</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input type="file" accept=".csv,text/csv" onChange={(event) => handleCsvFile(event.target.files?.[0])} />
                  <Textarea
                    rows={6}
                    value={csv}
                    onChange={(e) => setCsv(e.target.value)}
                    placeholder={"subject,question_type,question,option_a,option_b,option_c,option_d,correct_answer,case_sensitive\nMathematics,MCQ,What is 5+7?,10,11,12,13,C,false\nCivics,TRUE_FALSE,The capital city of Ethiopia is Addis Ababa.,,,,,True,false\nEnglish,SHORT_ANSWER,Write a greeting.,,,,,Hello|Hi,false"}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Use question_type MCQ, TRUE_FALSE, or SHORT_ANSWER. Short answers can include accepted variants separated by |.
                  </p>
                  <Button variant="outline" disabled={importQuestions.isPending || !csv.trim()} onClick={() => importQuestions.mutate()}>
                    <FileText className="mr-2 h-4 w-4" />
                    Import Questions
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Questions ({questions.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {questions.map((question: PracticeExamQuestion, index) => (
                    <div key={question.id} className="rounded-lg border p-3 text-sm dark:border-[#2A2A2A]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{index + 1}. {question.questionText}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {question.subject} - {question.questionType === "SHORT_ANSWER"
                              ? `Short answer: ${question.correctText || "-"}`
                              : question.questionType === "TRUE_FALSE"
                                ? `True/false: ${question.correctOption === "A" ? "True" : "False"}`
                                : `Correct ${question.correctOption}`}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => deleteQuestion.mutate(question.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-16 text-center text-sm text-gray-500">Create an exam to add questions.</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
