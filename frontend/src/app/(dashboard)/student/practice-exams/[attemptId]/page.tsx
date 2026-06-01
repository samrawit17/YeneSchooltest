"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Flag, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { practiceExamsAPI, type PracticeExamOption, type PracticeExamQuestion } from "@/lib/api";
import { useBreadcrumb } from "@/context/BreadcrumbContext";

type AnswerState = Record<string, { selectedOption: PracticeExamOption | null; textAnswer: string; isFlagged: boolean }>;

const options: PracticeExamOption[] = ["A", "B", "C", "D"];

function formatSeconds(seconds: number) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function PracticeExamAttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setItems: setBreadcrumbItems } = useBreadcrumb();
  const attemptId = params.attemptId;
  const localDraftKey = `practice-exam-draft:${attemptId}`;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [showReview, setShowReview] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const submittedRef = useRef(false);
  const answerPayloadRef = useRef<{ questionId: string; selectedOption?: PracticeExamOption | null; textAnswer?: string | null; isFlagged?: boolean }[]>([]);

  const attemptQuery = useQuery({
    queryKey: ["practice-exam-attempt", attemptId],
    queryFn: async () => (await practiceExamsAPI.attempt(attemptId)).data,
    refetchOnWindowFocus: false,
  });

  const attempt = attemptQuery.data;
  const questions = attempt?.questions || [];
  const isOpen = attempt?.status === "IN_PROGRESS";
  const currentQuestion = questions[currentIndex];
  const examSubjectLabel = useMemo(() => {
    if (attempt?.exam.subject?.name) return attempt.exam.subject.name;
    return attempt?.exam.title || "Online Exam";
  }, [attempt?.exam.subject?.name, attempt?.exam.title]);

  useEffect(() => {
    if (!attempt) return;
    setBreadcrumbItems([
      { label: "Student Portal", href: "/student" },
      { label: "Online Exam", href: "/student/practice-exams" },
      { label: examSubjectLabel, isCurrent: true },
    ]);
    return () => setBreadcrumbItems(null);
  }, [attempt, examSubjectLabel, setBreadcrumbItems]);

  useEffect(() => {
    if (!attempt) return;
    const next: AnswerState = {};
    for (const question of attempt.questions || []) {
      next[question.id] = {
        selectedOption: question.selectedOption || null,
        textAnswer: question.textAnswer || "",
        isFlagged: Boolean(question.isFlagged),
      };
    }
    try {
      const rawDraft = window.localStorage.getItem(localDraftKey);
      if (rawDraft && attempt.status === "IN_PROGRESS") {
        const draft = JSON.parse(rawDraft) as { answers?: AnswerState; currentIndex?: number };
        const merged = { ...next };
        for (const question of attempt.questions || []) {
          const draftAnswer = draft.answers?.[question.id];
          if (draftAnswer) {
            merged[question.id] = {
              selectedOption: draftAnswer.selectedOption || next[question.id]?.selectedOption || null,
              textAnswer: draftAnswer.textAnswer ?? next[question.id]?.textAnswer ?? "",
              isFlagged: Boolean(draftAnswer.isFlagged || next[question.id]?.isFlagged),
            };
          }
        }
        setAnswers(merged);
        if (Number.isInteger(draft.currentIndex)) {
          setCurrentIndex(Math.min(Math.max(0, draft.currentIndex || 0), Math.max(0, questions.length - 1)));
        }
        return;
      }
    } catch {
      window.localStorage.removeItem(localDraftKey);
    }
    setAnswers(next);
  }, [attempt]);

  const answerPayload = useMemo(
    () =>
      Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        selectedOption: value.selectedOption,
        textAnswer: value.textAnswer,
        isFlagged: value.isFlagged,
      })),
    [answers],
  );

  useEffect(() => {
    answerPayloadRef.current = answerPayload;
  }, [answerPayload]);

  useEffect(() => {
    if (!isOpen || !questions.length) return;
    window.localStorage.setItem(
      localDraftKey,
      JSON.stringify({ answers, currentIndex, updatedAt: new Date().toISOString() }),
    );
  }, [answers, currentIndex, isOpen, localDraftKey, questions.length]);

  useEffect(() => {
    if (!isOpen || !questions.length || !Object.keys(answers).length) return;
    const timer = window.setTimeout(() => autosave.mutate(), 1200);
    return () => window.clearTimeout(timer);
  }, [answers, isOpen, questions.length]);

  const autosave = useMutation({
    mutationFn: () => practiceExamsAPI.autosave(attemptId, answerPayloadRef.current),
    onError: () => toast.error("Autosave failed. Check your connection before submitting."),
  });

  const submitAttempt = useMutation({
    mutationFn: () => practiceExamsAPI.submit(attemptId, answerPayloadRef.current),
    onSuccess: () => {
      submittedRef.current = true;
      window.localStorage.removeItem(localDraftKey);
      toast.success("Online exam submitted");
      queryClient.invalidateQueries({ queryKey: ["practice-exam-attempt", attemptId] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to submit exam"),
  });

  useEffect(() => {
    if (!attempt?.expiresAt || !isOpen) return;
    const tick = () => {
      const next = Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, next));
      if (next <= 0 && !submittedRef.current && !submitAttempt.isPending) {
        submittedRef.current = true;
        submitAttempt.mutate();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.expiresAt, isOpen, submitAttempt]);

  useEffect(() => {
    if (!isOpen || !questions.length) return;
    const interval = window.setInterval(() => autosave.mutate(), 20000);
    return () => window.clearInterval(interval);
  }, [isOpen, questions.length, autosave]);

  const answeredQuestionCount = questions.filter((question) =>
    question.questionType === "SHORT_ANSWER"
      ? Boolean(answers[question.id]?.textAnswer?.trim() || question.textAnswer?.trim())
      : Boolean(answers[question.id]?.selectedOption || question.selectedOption),
  ).length;
  const flaggedCount = Object.values(answers).filter((answer) => answer.isFlagged).length;
  const timerClass = remainingSeconds <= 300 ? "text-red-600" : remainingSeconds <= 600 ? "text-amber-600" : "text-slate-950 dark:text-white";
  const submitConfirmOverlay =
    showSubmitConfirm && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-[1px]">
            <div className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              <div className="space-y-2">
                <p className="text-base font-semibold">Submit exam?</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You cannot change your answers after final submission.
                </p>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={submitAttempt.isPending}
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    submitAttempt.mutate();
                  }}
                >
                  {submitAttempt.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Submit
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const setSelectedOption = (questionId: string, selectedOption: PracticeExamOption) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selectedOption, textAnswer: prev[questionId]?.textAnswer || "", isFlagged: prev[questionId]?.isFlagged || false },
    }));
  };

  const setTextAnswer = (questionId: string, textAnswer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selectedOption: prev[questionId]?.selectedOption || null, textAnswer, isFlagged: prev[questionId]?.isFlagged || false },
    }));
  };

  const toggleFlag = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOption: prev[questionId]?.selectedOption || null,
        textAnswer: prev[questionId]?.textAnswer || "",
        isFlagged: !prev[questionId]?.isFlagged,
      },
    }));
  };

  const openReview = () => {
    autosave.mutate();
    setShowReview(true);
  };

  const confirmFinalSubmit = () => {
    setShowSubmitConfirm(true);
  };

  const renderAnsweredQuestionReview = (question: PracticeExamQuestion, index: number, showCorrectAnswer = false) => {
    const isShortAnswer = question.questionType === "SHORT_ANSWER";
    const selectedOption = showCorrectAnswer
      ? question.selectedOption || null
      : answers[question.id]?.selectedOption || question.selectedOption || null;
    const textAnswer = showCorrectAnswer
      ? question.textAnswer || ""
      : answers[question.id]?.textAnswer || question.textAnswer || "";
    const isSkipped = isShortAnswer ? !textAnswer.trim() : !selectedOption;
    const isCorrect = showCorrectAnswer ? question.isCorrect === true : false;
    const statusClass = showCorrectAnswer
      ? isSkipped
        ? "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
        : isCorrect
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
      : isSkipped
        ? "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
        : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200";

    return (
      <div key={question.id} className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="outline">{question.subject}</Badge>
            <p className="mt-3 font-semibold text-slate-950 dark:text-white">
              {index + 1}. {question.questionText}
            </p>
          </div>
          <Badge variant="outline" className={statusClass}>
            {showCorrectAnswer ? (isSkipped ? "Skipped" : isCorrect ? "Correct" : "Wrong") : isSkipped ? "Not answered" : "Answered"}
          </Badge>
        </div>

        {isShortAnswer ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-500">Your answer</p>
            <p className="mt-1 whitespace-pre-wrap">{textAnswer || "Not answered"}</p>
            {showCorrectAnswer ? (
              <p className="mt-3 text-xs text-slate-500">Accepted answer: {question.correctText || "-"}</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 grid gap-2">
          {(question.questionType === "TRUE_FALSE" ? ["A", "B"] : options).map((option) => {
            const optionText = question[`option${option}` as keyof PracticeExamQuestion] as string;
            const selected = selectedOption === option;
            const correct = showCorrectAnswer && question.correctOption === option;
            const optionClass = correct
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
              : selected
                ? showCorrectAnswer && !correct
                  ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100"
                  : "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100"
                : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200";

            return (
              <div key={option} className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 ${optionClass}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                  {option}
                </span>
                <span className="flex-1">{optionText}</span>
                {selected ? (
                  <Badge variant="outline" className="shrink-0">Your answer</Badge>
                ) : null}
                {correct ? (
                  <Badge variant="outline" className="shrink-0 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200">Correct</Badge>
                ) : null}
              </div>
            );
          })}
          </div>
        )}
      </div>
    );
  };

  if (attemptQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
  }

  if (!attempt) {
    return <div className="p-6"><Card><CardContent className="py-12 text-center text-sm text-slate-500">Online exam attempt not found.</CardContent></Card></div>;
  }

  if (!isOpen) {
    const percentage = Math.round(attempt.percentage || 0);
    const passed = percentage >= attempt.exam.passMark;

    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{attempt.exam.title}</h1>
            <p className="text-sm text-slate-500">Online exam result for Grade {attempt.exam.grade}</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/student/practice-exams")}>Back to Online Exam</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-5"><div className="text-sm text-slate-500">Score</div><div className="mt-2 text-3xl font-bold">{percentage}%</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-slate-500">Correct</div><div className="mt-2 text-3xl font-bold text-emerald-600">{attempt.correctCount}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-slate-500">Wrong</div><div className="mt-2 text-3xl font-bold text-red-600">{attempt.wrongCount}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-slate-500">Skipped</div><div className="mt-2 text-3xl font-bold text-slate-600">{attempt.skippedCount}</div></CardContent></Card>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Question Review</CardTitle>
              <Badge className={passed ? "bg-emerald-600" : "bg-red-600"}>{passed ? "Passed" : "Needs Practice"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((question, index) => renderAnsweredQuestionReview(question, index, true))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="space-y-6 bg-slate-50 p-6 dark:bg-slate-950">
        {submitConfirmOverlay}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Review Answers</h1>
            <p className="text-sm text-slate-500">
              {attempt.exam.title} - {answeredQuestionCount} answered, {questions.length - answeredQuestionCount} not answered
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowReview(false)}>
              Back to Exam
            </Button>
            <Button disabled={submitAttempt.isPending} onClick={confirmFinalSubmit}>
              {submitAttempt.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((question, index) => renderAnsweredQuestionReview(question, index))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen gap-6 bg-slate-50 p-6 dark:bg-slate-950 xl:grid-cols-[1fr_280px]">
      <main className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{attempt.exam.title}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Question {currentIndex + 1} of {questions.length}</p>
              </div>
              <div className={`inline-flex items-center gap-2 text-xl font-bold ${timerClass}`}>
                <Clock className="h-5 w-5" /> {formatSeconds(remainingSeconds)}
              </div>
            </div>
          </CardHeader>
        </Card>

        {currentQuestion ? (
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="outline">{currentQuestion.subject}</Badge>
                  <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">{currentQuestion.questionText}</h2>
                </div>
                <Button variant={answers[currentQuestion.id]?.isFlagged ? "default" : "outline"} onClick={() => toggleFlag(currentQuestion.id)}>
                  <Flag className="mr-2 h-4 w-4" /> Flag
                </Button>
              </div>
              <div className="grid gap-3">
                {currentQuestion.questionType === "SHORT_ANSWER" ? (
                  <Textarea
                    value={answers[currentQuestion.id]?.textAnswer || ""}
                    onChange={(event) => setTextAnswer(currentQuestion.id, event.target.value)}
                    rows={6}
                    placeholder="Type your answer here"
                    className="resize-y bg-white dark:bg-slate-900"
                  />
                ) : (currentQuestion.questionType === "TRUE_FALSE" ? (["A", "B"] as PracticeExamOption[]) : options).map((option) => {
                  const selected = answers[currentQuestion.id]?.selectedOption === option;
                  const text = currentQuestion[`option${option}` as keyof PracticeExamQuestion] as string;
                  return (
                    <button
                      key={option}
                      onClick={() => setSelectedOption(currentQuestion.id, option)}
                      className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                        selected
                          ? "border-blue-500 bg-blue-50 text-slate-950 ring-2 ring-blue-200 dark:border-blue-400 dark:bg-blue-950/30 dark:text-white dark:ring-blue-900"
                          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                        selected ? "border-blue-500 bg-blue-600 text-white dark:border-blue-400" : ""
                      }`}>
                        {option}
                      </span>
                      <span>{text}</span>
                      {selected ? (
                        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Selected
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}>Previous</Button>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={autosave.isPending} onClick={() => autosave.mutate()}>
                    {autosave.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Save
                  </Button>
                  {currentIndex < questions.length - 1 ? (
                    <Button onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}>Next</Button>
                  ) : (
                    <Button onClick={openReview}>
                      <Send className="mr-2 h-4 w-4" /> Submit
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="py-12 text-center text-sm text-slate-500">No questions are available.</CardContent></Card>
        )}
      </main>
      <aside className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-white p-3 dark:bg-slate-900"><div className="font-bold">{answeredQuestionCount}</div><div className="text-xs text-slate-500">Answered</div></div>
              <div className="rounded-lg bg-white p-3 dark:bg-slate-900"><div className="font-bold">{questions.length - answeredQuestionCount}</div><div className="text-xs text-slate-500">Left</div></div>
              <div className="rounded-lg bg-white p-3 dark:bg-slate-900"><div className="font-bold">{flaggedCount}</div><div className="text-xs text-slate-500">Flagged</div></div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const state = answers[question.id];
                const active = currentIndex === index;
                const answered = question.questionType === "SHORT_ANSWER" ? Boolean(state?.textAnswer?.trim()) : Boolean(state?.selectedOption);
                const flagged = Boolean(state?.isFlagged);
                return (
                  <button key={question.id} onClick={() => setCurrentIndex(index)} className={`relative h-10 rounded-md border text-sm font-semibold ${active ? "border-blue-600 bg-blue-600 text-white" : answered ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}>
                    {index + 1}
                    {flagged ? <AlertTriangle className="absolute -right-1 -top-1 h-3 w-3 text-amber-500" /> : null}
                  </button>
                );
              })}
            </div>
            <Button className="w-full" onClick={openReview}>Submit Exam</Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
