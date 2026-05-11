"use client";

import { useMemo, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type AssistantRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "IT_MANAGER"
  | "TEACHER"
  | "STUDENT"
  | "PARENT"
  | "REGISTRAR"
  | "FINANCE"
  | string
  | undefined;

const suggestionsByRole: Record<string, string[]> = {
  TEACHER: [
    "Draft a parent update",
    "Summarize today's attendance",
    "Highlight students needing support",
  ],
  PARENT: [
    "Explain my child's attendance",
    "Explain recent grades simply",
    "Draft a message to the teacher",
  ],
};

export default function FloatingAiAssistant({ role }: { role?: AssistantRole }) {
  const [prompt, setPrompt] = useState("");

  const normalizedRole = (role || "").toUpperCase();
  const suggestions = useMemo(
    () =>
      suggestionsByRole[normalizedRole] || [
        "Ask about attendance",
        "Ask about grades",
        "Draft a school message",
      ],
    [normalizedRole]
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full border border-[rgba(var(--brand-color-rgb),0.24)] bg-[var(--brand-color,#e35336)] text-white shadow-xl shadow-[var(--brand-color,#e35336)]/25 hover:opacity-95"
          aria-label="Open AI assistant"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[92vw] max-w-md border-l border-[rgba(var(--brand-color-rgb),0.18)] bg-white p-0 dark:bg-slate-950"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(var(--brand-color-rgb),0.14),rgba(var(--brand-color-rgb),0.04))] px-6 py-5 dark:border-slate-800">
            <SheetTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-color,#e35336)] text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              AI Assistant
            </SheetTitle>
            <SheetDescription className="text-left text-slate-600 dark:text-slate-400">
              Small placeholder for the teacher and parent assistant flow.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 px-6 py-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Try these
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setPrompt(suggestion)}
                    className="rounded-full border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.1)] px-3 py-1.5 text-xs font-medium text-[var(--brand-color,#e35336)] transition-colors hover:bg-[rgba(var(--brand-color-rgb),0.16)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="ai-assistant-prompt"
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Prompt
              </label>
              <Textarea
                id="ai-assistant-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask for a message draft, attendance summary, or grade explanation."
                className="min-h-[130px] resize-none border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="rounded-2xl border border-dashed border-[rgba(var(--brand-color-rgb),0.24)] bg-[rgba(var(--brand-color-rgb),0.07)] p-4 text-sm text-slate-600 dark:text-slate-300">
              AI response is not wired yet. This entry point is only the floating UI shell for now.
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
