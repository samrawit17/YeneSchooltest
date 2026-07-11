"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { aiAPI } from "@/lib/api/ai";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Send,
  Loader2,
  AlertTriangle,
  FileText,
  Lightbulb,
  MessageSquare,
  Info,
} from "lucide-react";

type Tab = "chat" | "report" | "alerts" | "recommend";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function AiAssistantPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const initialTab: Tab = tabParam && ["chat", "report", "alerts", "recommend"].includes(tabParam)
    ? tabParam
    : "chat";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: user?.role === "PARENT"
        ? "Hello! I can help you track your child's academic progress, attendance, and fees. What would you like to know?"
        : user?.role === "TEACHER"
          ? "Hello! I can help with student performance insights, class reports, and early warnings. Ask me anything!"
          : "Hello! I can help with school-wide analytics, reports, and student welfare monitoring. How can I assist you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [reportResult, setReportResult] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: statusData } = useQuery({
    queryKey: ["ai-status"],
    queryFn: async () => {
      const res = await aiAPI.getStatus();
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["ai-alerts", studentId],
    queryFn: async () => {
      const res = await aiAPI.getAlerts(studentId || undefined);
      return res.data;
    },
    enabled: activeTab === "alerts",
  });

  const { data: recommendationsData, isLoading: recsLoading } = useQuery({
    queryKey: ["ai-recommendations", studentId],
    queryFn: async () => {
      const res = await aiAPI.getRecommendations(studentId || undefined);
      return res.data;
    },
    enabled: activeTab === "recommend",
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await aiAPI.chat(input, studentId || undefined);
      const data = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          sources: data.sources,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err.response?.data?.message || "Failed to get response. Check your connection.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!studentId.trim()) return;
    setReportLoading(true);
    setReportResult(null);
    try {
      const res = await aiAPI.generateReport(studentId);
      setReportResult(res.data);
    } catch (err: any) {
      setReportResult({ error: err.response?.data?.message || "Failed to generate report" });
    } finally {
      setReportLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Assistant</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {statusData?.configured
              ? "AI-powered assistant is active"
              : "Running in offline mode — connect an LLM provider for full functionality"}
          </p>
        </div>
        {statusData && (
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              statusData.configured
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                statusData.configured ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {statusData.configured ? "Connected" : "Offline"}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="min-w-0 max-w-full">
        <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
          <TabsTrigger value="chat" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color)] data-[state=active]:text-[var(--brand-color)] rounded-none md:gap-2 md:px-4 md:text-sm">
            <MessageSquare className="mr-1.5 h-4 w-4" /> Chat
          </TabsTrigger>
          <TabsTrigger value="report" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color)] data-[state=active]:text-[var(--brand-color)] rounded-none md:gap-2 md:px-4 md:text-sm">
            <FileText className="mr-1.5 h-4 w-4" /> Report
          </TabsTrigger>
          <TabsTrigger value="alerts" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color)] data-[state=active]:text-[var(--brand-color)] rounded-none md:gap-2 md:px-4 md:text-sm">
            <AlertTriangle className="mr-1.5 h-4 w-4" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="recommend" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color)] data-[state=active]:text-[var(--brand-color)] rounded-none md:gap-2 md:px-4 md:text-sm">
            <Lightbulb className="mr-1.5 h-4 w-4" /> Suggestions
          </TabsTrigger>
        </TabsList>

      <TabsContent value="chat" className="mt-6">
        <div className="flex flex-col gap-4">
          <div className="flex max-h-[500px] min-h-[300px] flex-col gap-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)] text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-[var(--brand-color)] text-white"
                      : "bg-gray-100 text-gray-800 dark:bg-[#2A2A2A] dark:text-gray-200"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.sources.map((s, j) => (
                        <span
                          key={j}
                          className="rounded bg-white/20 px-2 py-0.5 text-[10px] dark:bg-black/20"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 dark:bg-[#2A2A2A]">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)] disabled:opacity-50 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white"
            />
            {user?.role !== "PARENT" && (
              <input
                type="text"
                placeholder="Student ID (optional)"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-40 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--brand-color)] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white"
              />
            )}
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex items-center gap-2 rounded-xl bg-[var(--brand-color)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="report" className="mt-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Generate Student Report</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand-color)] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white"
            />
            <button
              onClick={handleGenerateReport}
              disabled={!studentId.trim() || reportLoading}
              className="flex items-center gap-2 rounded-xl bg-[var(--brand-color)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {reportLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><FileText className="h-4 w-4" /> Generate</>
              )}
            </button>
          </div>

          {reportResult && (
            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-[#2A2A2A] dark:bg-[#222]">
              {reportResult.error ? (
                <p className="text-sm text-red-500">{reportResult.error}</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Academic Summary</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{reportResult.academicSummary}</p>
                  </div>
                  {reportResult.strengths?.length > 0 && (
                    <div>
                      <h3 className="mb-1 text-sm font-semibold text-green-700 dark:text-green-400">Strengths</h3>
                      <ul className="list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                        {reportResult.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {reportResult.improvements?.length > 0 && (
                    <div>
                      <h3 className="mb-1 text-sm font-semibold text-amber-700 dark:text-amber-400">Areas for Improvement</h3>
                      <ul className="list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                        {reportResult.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Teacher Remark</h3>
                    <p className="text-sm italic text-gray-600 dark:text-gray-400">{reportResult.teacherRemark}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="alerts" className="mt-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Early Warning Alerts</h2>
            {user?.role !== "PARENT" && (
              <input
                type="text"
                placeholder="Student ID (optional)"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-48 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-color)] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white"
              />
            )}
          </div>

          {alertsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : alertsData?.alerts?.length > 0 ? (
            <div className="space-y-3">
              {alertsData.schoolSummary && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                  <Info className="mr-1.5 inline h-4 w-4" />
                  {alertsData.schoolSummary}
                </div>
              )}
              {alertsData.alerts.map((alert: any, i: number) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    alert.riskLevel === "CRITICAL"
                      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                      : alert.riskLevel === "HIGH"
                        ? "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20"
                        : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{alert.studentName}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        alert.riskLevel === "CRITICAL"
                          ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : alert.riskLevel === "HIGH"
                            ? "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                            : "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      }`}
                    >
                      {alert.riskLevel}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {alert.reasons.map((r: string, j: number) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-500">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              No alerts found. All students are within normal ranges.
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="recommend" className="mt-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recommendations</h2>
            {user?.role !== "PARENT" && (
              <input
                type="text"
                placeholder="Student ID (optional)"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-48 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-color)] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white"
              />
            )}
          </div>

          {recsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : recommendationsData?.recommendations?.length > 0 ? (
            <div className="space-y-3">
              {recommendationsData.recommendations.map((rec: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-xl border border-gray-100 p-4 dark:border-[#2A2A2A]"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      rec.priority === "HIGH"
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : rec.priority === "MEDIUM"
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">{rec.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          rec.priority === "HIGH"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : rec.priority === "MEDIUM"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-500">
              <Lightbulb className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              No recommendations yet. Try adding a student ID above.
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
}
