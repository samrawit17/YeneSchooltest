"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bot, X, ChevronRight, MessageSquare, AlertTriangle, FileText, Lightbulb } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AiFloatingButton() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isAuthenticated || !user) return null;

  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => setHovered(false), 300);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setHovered(false);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm" onClick={() => handleOpenChange(false)} />
      )}

      <div
        className="fixed bottom-6 right-0 z-[999] flex items-end flex-col"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="transition-transform duration-300 ease-out"
          style={{
            transform: open ? "translateX(0)" : hovered ? "translateX(0)" : "translateX(calc(100% - 10px))",
          }}
        >
          {open ? (
            <div
              className="w-80 overflow-hidden rounded-l-2xl rounded-r-none border border-r-0 border-gray-200 bg-white shadow-xl dark:border-[#2A2A2A] dark:bg-[#1A1A1A]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-color)] text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">YeneSchool AI</span>
                </div>
                <button
                  onClick={() => handleOpenChange(false)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#2A2A2A]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-0">
                <button
                  onClick={() => { handleOpenChange(false); router.push("/ai/assistant"); }}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white"
                >
                  <MessageSquare className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                  <span>Ask YeneSchool AI</span>
                  <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                </button>

                {(user.role === "ADMIN" || user.role === "TEACHER" || user.role === "SUPER_ADMIN") && (
                  <>
                    <button
                      onClick={() => { handleOpenChange(false); router.push("/ai/assistant?tab=alerts"); }}
                      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white"
                    >
                      <AlertTriangle className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                      <span>View Alerts</span>
                      <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                    </button>
                    <button
                      onClick={() => { handleOpenChange(false); router.push("/ai/assistant?tab=report"); }}
                      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white"
                    >
                      <FileText className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                      <span>Generate Report</span>
                      <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => { handleOpenChange(false); router.push("/ai/assistant?tab=recommend"); }}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white"
                >
                  <Lightbulb className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                  <span>Suggestions</span>
                  <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                </button>
              </div>

              <div className="border-t border-gray-100 px-4 py-2 dark:border-[#2A2A2A]">
                <p className="text-[10px] text-gray-400">
                  AI may produce inaccurate information. Verify important data.
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="flex h-14 w-14 items-center justify-center rounded-l-full rounded-r-none bg-[var(--brand-color)] text-white shadow-lg transition hover:shadow-xl active:scale-95"
              aria-label="AI Assistant"
            >
              <Bot className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
