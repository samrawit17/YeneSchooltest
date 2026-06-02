"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Send, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Clock,
  RefreshCw,
  Trash2,
  MoreVertical,
  X,
  Loader2,
  BookOpen,
  AlertTriangle,
  ShieldAlert,
  Heart,
  Plus,
  Bell,
  Inbox,
  Star,
  Trash,
  Archive,
  Settings,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import {
  Communication,
  CommunicationReply,
  CommunicationStatus,
  CommunicationCategory,
  communicationsAPI,
} from "@/lib/api/communications";
import { useAuth } from "@/context/AuthContext";
import NewMessageModal from "@/components/communications/NewMessageModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "@/hooks/useTranslations";

type FilterOption = "all" | "unread" | "open" | "closed" | "today" | "this_week";
type ViewMode = "inbox" | "starred" | "archived" | "trash";

interface QuickReplyTemplate {
  id: string;
  label: string;
  message: string;
  icon: React.ReactNode;
}

const QUICK_REPLY_TEMPLATES: QuickReplyTemplate[] = [
  { id: "acknowledged", label: "Message Received", message: "Thank you for your message. I have received it and will review the matter. Please feel free to reach out if you have any further questions.", icon: <CheckCircle className="w-4 h-4" /> },
  { id: "meeting", label: "Request Meeting", message: "I would like to schedule a meeting to discuss this matter in detail. Please let me know your availability this week so we can arrange a convenient time.", icon: <Users className="w-4 h-4" /> },
  { id: "progress", label: "Student Progress", message: "I wanted to update you on your child's progress. They have been actively participating in class and showing improvement in their studies.", icon: <Star className="w-4 h-4" /> },
  { id: "concern", label: "Raise a Concern", message: "I wanted to bring to your attention a matter regarding your child that requires your attention. Please contact me at your earliest convenience to discuss.", icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "thanks", label: "Thank You", message: "Thank you for your continued support and collaboration. Your involvement in your child's education is greatly appreciated.", icon: <Heart className="w-4 h-4" /> },
  { id: "followup", label: "Follow Up", message: "I am following up on our previous conversation. Please let me know if you have any updates or if we need to discuss further.", icon: <RefreshCw className="w-4 h-4" /> },
];

const CATEGORY_CONFIG: Record<CommunicationCategory, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  ACADEMIC: { label: 'Academic', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ATTENDANCE: { label: 'Attendance', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', icon: <Clock className="w-3.5 h-3.5" /> },
  DISCIPLINE: { label: 'Discipline', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  HEALTH: { label: 'Health', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', icon: <Heart className="w-3.5 h-3.5" /> },
  GENERAL: { label: 'General', bg: 'bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/20', icon: <MessageSquare className="w-3.5 h-3.5" /> },
};

const STATUS_CONFIG: Record<CommunicationStatus, { label: string; bg: string; text: string; dot: string }> = {
  OPEN: { label: 'Open', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  ACKNOWLEDGED: { label: 'Acknowledged', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  CLOSED: { label: 'Closed', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const message = (error as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message.trim() ? message : fallback;
}

function toConversationWithParent(comm: Communication): ConversationWithParent {
  const lastReply = comm.replies?.at(-1) ?? null;
  return {
    ...comm,
    parentName: getParentDisplayName(comm),
    teacherName: getTeacherDisplayName(comm),
    unreadCount: 0,
    lastMessage: lastReply?.message || comm.message,
  };
}

function StatusBadge({ status, compact = false }: { status: CommunicationStatus; compact?: boolean }) {
  const { t } = useTranslations<any>("communications");
  const config = STATUS_CONFIG[status];
  if (compact) {
    return <span className={`w-2 h-2 rounded-full ${config.dot}`} />;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {t.status[config.label] ?? config.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: CommunicationCategory }) {
  const { t } = useTranslations<any>("communications");
  const config = CATEGORY_CONFIG[category];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.icon}
      {t.categories[config.label] ?? config.label}
    </span>
  );
}

interface ConversationWithParent extends Communication {
  parentName: string;
  teacherName: string;
  parentAvatar?: string;
  unreadCount: number;
  lastMessage: string;
}

function getTeacherDisplayName(conversation: Communication) {
  const teacherReply = conversation.replies?.find((reply) => reply.sender?.role === "TEACHER");
  if (teacherReply?.sender?.name) return teacherReply.sender.name;
  if (conversation.createdBy?.role === "TEACHER" && conversation.createdBy?.name) {
    return conversation.createdBy.name;
  }
  return "";
}

function getParentDisplayName(conversation: Communication) {
  const parentReply = conversation.replies?.find((reply) => reply.sender?.role === "PARENT");
  if (parentReply?.sender?.name) return parentReply.sender.name;
  if (conversation.createdBy?.role === "PARENT" && conversation.createdBy?.name) {
    return conversation.createdBy.name;
  }
  return "";
}

function getConversationClassLabel(conversation: ConversationWithParent | Communication) {
  const className = conversation.class?.name || conversation.student?.studentProfile?.className;
  const section = conversation.class?.section || conversation.student?.studentProfile?.section;

  if (className && section) return `${className} - Section ${section}`;
  if (className) return className;
  if (section) return `Section ${section}`;
  return null;
}

function getConversationTitle(conversation: ConversationWithParent, viewerRole?: string) {
  if (viewerRole === "PARENT") {
    return conversation.teacherName || conversation.subject || conversation.student?.name || "Conversation";
  }
  if (viewerRole === "TEACHER") {
    return conversation.parentName || conversation.student?.name || conversation.subject || "Conversation";
  }
  return conversation.student?.name || conversation.parentName || conversation.teacherName || "Unknown Contact";
}

function getConversationSubtitle(conversation: ConversationWithParent, viewerRole?: string) {
  const studentName = conversation.student?.name;
  const classLabel = getConversationClassLabel(conversation);

  if (viewerRole === "PARENT") {
    if (conversation.teacherName && conversation.subject) return `${conversation.teacherName} • ${conversation.subject}`;
    if (studentName && classLabel) return `${studentName} • ${classLabel}`;
    return conversation.subject || studentName || classLabel || "";
  }

  if (viewerRole === "TEACHER") {
    if (studentName && classLabel) return `${studentName} • ${classLabel}`;
    if (conversation.parentName && conversation.subject) return `${conversation.parentName} • ${conversation.subject}`;
    return studentName || conversation.subject || classLabel || "";
  }

  return classLabel || conversation.subject;
}

function getInitialMessageSenderName(conversation: ConversationWithParent, viewerRole?: string) {
  if (conversation.createdBy?.name) return conversation.createdBy.name;
  if (viewerRole === "PARENT") return conversation.teacherName || conversation.subject || "Conversation";
  if (viewerRole === "TEACHER") return conversation.parentName || conversation.student?.name || conversation.subject || "Conversation";
  return getConversationTitle(conversation, viewerRole);
}

function getInitialMessageSenderRole(conversation: ConversationWithParent) {
  if (conversation.createdBy?.role) return conversation.createdBy.role;
  if (conversation.teacherName) return "TEACHER";
  if (conversation.parentName) return "PARENT";
  return "CONTACT";
}

function getReplySenderName(reply: CommunicationReply | undefined, conversation: ConversationWithParent, viewerRole?: string) {
  if (reply?.sender?.name) return reply.sender.name;
  if (reply?.sender?.role === "TEACHER") return conversation.teacherName || conversation.subject || "Conversation";
  if (reply?.sender?.role === "PARENT") return conversation.parentName || conversation.student?.name || conversation.subject || "Conversation";
  return getConversationTitle(conversation, viewerRole);
}

function getReplySenderRole(reply: CommunicationReply | undefined, conversation: ConversationWithParent) {
  if (reply?.sender?.role) return reply.sender.role;
  if (conversation.teacherName) return "TEACHER";
  if (conversation.parentName) return "PARENT";
  return "CONTACT";
}

function MessageCard({ message, senderName, senderRole, timestamp, isMe, onDelete, canDelete }: {
  message: string;
  senderName: string;
  senderRole: string;
  timestamp: string;
  isMe: boolean;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const { t } = useTranslations<any>("communications");
  const [showMenu, setShowMenu] = useState(false);
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", hour12: true });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] group relative ${isMe ? "order-2" : "order-1"}`}>
        <div className={`rounded-lg border px-3 py-2 text-sm ${isMe ? "border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.10)] text-[var(--brand-color,#e35336)] dark:border-[rgba(var(--brand-color-rgb),0.24)] dark:bg-[rgba(var(--brand-color-rgb),0.12)]" : "border-gray-200 bg-gray-100 text-gray-900 dark:border-slate-700 dark:bg-slate-700 dark:text-white"}`}>
          <p className={`whitespace-pre-wrap break-words ${isMe ? "text-[var(--brand-color,#e35336)] dark:text-white/90" : "text-gray-900 dark:text-white"}`}>{message}</p>
          <div className={`mt-2 flex items-center gap-1 ${isMe ? "justify-end" : "justify-start"}`}>
            <span className={`text-xs ${isMe ? "text-[rgba(var(--brand-color-rgb),0.75)] dark:text-white/60" : "text-slate-400 dark:text-slate-500"}`}>
              {formatTime(timestamp)}
            </span>
          </div>
        </div>
        {canDelete && (
          <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "-left-12" : "-right-12"} opacity-0 group-hover:opacity-100 transition-opacity`}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`p-1.5 rounded-full ${isMe ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500"}`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className={`absolute top-full mt-1 ${isMe ? "right-0" : "left-0"} bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[100px] z-20`}>
                <button
                  onClick={() => { onDelete?.(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash className="w-4 h-4" />
                  {t.actions.delete}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationList({ conversations, loading, error, selectedId, onSelect, onRefresh, searchQuery, viewerRole }: {
  conversations: ConversationWithParent[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (conv: ConversationWithParent) => void;
  onRefresh: () => void;
  searchQuery: string;
  viewerRole?: string;
}) {
  const { t } = useTranslations<any>("communications");
  const filtered = conversations.filter(conv => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        getConversationTitle(conv, viewerRole).toLowerCase().includes(q) ||
        conv.student?.name?.toLowerCase().includes(q) ||
        conv.parentName?.toLowerCase().includes(q) ||
        conv.teacherName?.toLowerCase().includes(q) ||
        conv.subject?.toLowerCase().includes(q) ||
        conv.message?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="h-full">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.states.loadingConversations}
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-500">
            <p>{error}</p>
            <button onClick={onRefresh} className="mt-2 text-sm text-[var(--brand-color,#e35336)] hover:underline">{t.actions.tryAgain}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">{t.states.noConversations}</div>
        ) : (
          filtered.map((conv) => {
            const active = selectedId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full border-b p-2 text-left transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/40 md:p-4 ${
                  active ? "bg-[rgba(var(--brand-color-rgb),0.06)] dark:bg-[rgba(var(--brand-color-rgb),0.12)]" : "bg-white dark:bg-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {getConversationTitle(conv, viewerRole)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {getConversationSubtitle(conv, viewerRole) || conv.subject}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">
                      {conv.lastMessage || conv.message}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                      {new Date(conv.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-md border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.12)] px-1 text-[10px] font-bold text-[var(--brand-color,#e35336)] md:h-[20px] md:min-w-[20px] md:text-[11px]">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}

function ChatPanel({ conversation, isAdmin, isTeacher, currentUserId, onSendMessage, onReopen, onDeleteReply, onDelete, viewerRole }: {
  conversation: ConversationWithParent | null;
  isAdmin: boolean;
  isTeacher: boolean;
  currentUserId: string;
  onSendMessage: (msg: string) => Promise<void>;
  onReopen: () => void;
  onDeleteReply: (id: string) => void;
  onDelete: () => void;
  viewerRole?: string;
}) {
  const { t } = useTranslations<any>("communications");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.replies]);

  const handleSend = async () => {
    const messageToSend = messageInput.trim();
    if (!messageToSend || isSending) return;
    setIsSending(true);
    try {
      await onSendMessage(messageToSend);
      setMessageInput("");
    } catch {
      // The action handler owns the toast; keep the draft for retry.
    } finally {
      setIsSending(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-500">
        {t.states.chooseConversation}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full px-2 md:px-4">
          <div className="space-y-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-2 px-1 text-xs text-gray-500 dark:text-gray-400">
                  {getConversationSubtitle(conversation, viewerRole) || conversation.subject}
                </p>
                <MessageCard
                  message={conversation.message}
                  senderName={getInitialMessageSenderName(conversation, viewerRole)}
                  senderRole={getInitialMessageSenderRole(conversation)}
                  timestamp={conversation.createdAt}
                  isMe={conversation.createdById === currentUserId || conversation.createdBy?.id === currentUserId}
                />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {conversation.status === "CLOSED" && isAdmin && (
                  <Button onClick={onReopen} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    {t.actions.reopen}
                  </Button>
                )}
                {isAdmin && (
                  <button onClick={onDelete} className="rounded p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                    <Trash className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {conversation.replies?.length === 0 ? (
              <div className="py-6 text-sm text-gray-500">{t.states.noMessages}</div>
            ) : (
              conversation.replies?.map((reply) => (
                <MessageCard
                  key={reply.id}
                  message={reply.message}
                  senderName={getReplySenderName(reply, conversation, viewerRole)}
                  senderRole={getReplySenderRole(reply, conversation)}
                  timestamp={reply.createdAt}
                  isMe={reply.sender?.id === currentUserId}
                  onDelete={() => onDeleteReply(reply.id)}
                  canDelete={isAdmin || reply.sender?.id === currentUserId}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {(conversation.status !== "CLOSED" || isAdmin) && (
        <div className="border-t p-2 md:p-3">
          <div className="flex items-end gap-2">
            <div className="relative">
              <button
                onClick={() => setShowQuickReplies(!showQuickReplies)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-gray-100 hover:text-[var(--brand-color,#e35336)] dark:hover:bg-slate-700"
                title={t.quick.title}
              >
                <Zap className="h-4.5 w-4.5" />
              </button>
              {showQuickReplies && (isAdmin || isTeacher) && (
                <div className="absolute bottom-full left-0 z-20 mb-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.quick.title}</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {QUICK_REPLY_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => { setMessageInput(tpl.message); setShowQuickReplies(false); }}
                        className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/50 last:border-b-0"
                      >
                        <span className="mt-0.5 text-[var(--brand-color,#e35336)]">{tpl.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{tpl.label}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{tpl.message}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={t.placeholders.typeMessage}
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!messageInput.trim() || isSending}
              className="h-9 w-9 border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.12)] text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.18)] md:h-9 md:w-9"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {conversation.status === "CLOSED" && (
        <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800/50 dark:bg-emerald-900/20">
          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{t.states.resolved}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CommunicationsContent() {
  const { t } = useTranslations<any>("communications");
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedStudentId = searchParams ? searchParams.get("studentId") : null;
  const conversationId = searchParams ? searchParams.get("conversationId") : null;
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<ConversationWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithParent | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const autoMarkedConversationRef = useRef<string | null>(null);
  const selectedConversationRef = useRef<ConversationWithParent | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'IT_MANAGER' || user?.role === 'SUPER_ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const viewerRole = user?.role;

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Auto-open new message modal when studentId is passed via URL
  useEffect(() => {
    if (preselectedStudentId && !showNewMessageModal) {
      setShowNewMessageModal(true);
    }
  }, [preselectedStudentId]);

  const fetchCommunications = useCallback(async (page: number = 1) => {
    try {
      setLoading(page === 1);
      setError(null);
      setSelectionError(null);
      const response = await communicationsAPI.getAll({ page, limit: 20 });
      const data = response.data.data || [];
      const meta = response.data.meta || { totalPages: 1, page: 1 };
      setTotalPages(meta.totalPages);
      
      let transformed: ConversationWithParent[] = data.map(toConversationWithParent);

      if (conversationId) {
        const found = transformed.find((conversation) => conversation.id === conversationId);
        if (found) {
          setSelectedConversation(found);
        } else {
          try {
            const selectedResponse = await communicationsAPI.getById(conversationId);
            const selected = toConversationWithParent(selectedResponse.data);
            transformed = [selected, ...transformed.filter((conversation) => conversation.id !== selected.id)];
            setSelectedConversation(selected);
          } catch (selectionError) {
            setSelectedConversation(null);
            setSelectionError(getApiErrorMessage(selectionError, "This conversation was not found or you no longer have access."));
          }
        }
      } else {
        const currentSelectedId = selectedConversationRef.current?.id;
        const refreshedSelected = currentSelectedId
          ? transformed.find((conversation) => conversation.id === currentSelectedId)
          : null;
        if (refreshedSelected) {
          setSelectedConversation(refreshedSelected);
        } else {
          setSelectedConversation(transformed[0] || null);
        }
      }

      setConversations(transformed);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to load communications'));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { fetchCommunications(); }, [fetchCommunications]);

  const handleSendMessage = async (msg: string) => {
    if (!selectedConversation) return;
    const message = msg.trim();
    if (!message) return;
    try {
      const response = await communicationsAPI.addReply(selectedConversation.id, { message });
      const updatedReplies = [...(selectedConversation.replies || []), response.data];
      const updatedConv = { ...selectedConversation, replies: updatedReplies, lastMessage: message, updatedAt: new Date().toISOString() };
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? updatedConv : c));
      setSelectedConversation(updatedConv);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to send message'));
      throw err;
    }
  };

  const handleReopen = async () => {
    if (!selectedConversation || !isAdmin) return;
    try {
      const response = await communicationsAPI.updateStatus(selectedConversation.id, { status: 'OPEN' });
      const updated = { ...selectedConversation, status: response.data.status as CommunicationStatus };
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? updated : c));
      setSelectedConversation(updated);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to reopen'));
    }
  };

  useEffect(() => {
    if (!selectedConversation || selectedConversation.status !== 'OPEN') return;
    if (autoMarkedConversationRef.current === selectedConversation.id) return;

    autoMarkedConversationRef.current = selectedConversation.id;

    const acknowledgeOpenedConversation = async () => {
      try {
        const response = await communicationsAPI.updateStatus(selectedConversation.id, { status: 'ACKNOWLEDGED' });
        const updated = { ...selectedConversation, status: response.data.status as CommunicationStatus };
        setConversations(prev => prev.map(c => c.id === selectedConversation.id ? updated : c));
        setSelectedConversation(updated);
      } catch {
        autoMarkedConversationRef.current = null;
      }
    };

    acknowledgeOpenedConversation();
  }, [selectedConversation]);

  const handleDeleteReply = async (replyId: string) => {
    if (!selectedConversation || !confirm("Delete this message?")) return;
    try {
      await communicationsAPI.deleteReply(replyId);
      const updated = { ...selectedConversation, replies: selectedConversation.replies?.filter(r => r.id !== replyId) || [] };
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? updated : c));
      setSelectedConversation(updated);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to delete'));
    }
  };

  const handleDeleteThread = async () => {
    if (!selectedConversation || !isAdmin) return;
    const deletedConversationId = selectedConversation.id;

    toast.warning("Delete this conversation?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await communicationsAPI.delete(deletedConversationId);
            setConversations(prev => {
              const remaining = prev.filter(c => c.id !== deletedConversationId);
              setSelectedConversation(remaining[0] || null);
              return remaining;
            });
            if (conversationId === deletedConversationId) {
              router.replace('/list/communications');
            }
          } catch (err: any) {
            toast.error(getApiErrorMessage(err, 'Failed to delete'));
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => toast.dismiss(),
      },
      duration: 10000,
    });
  };

  const handleSendNewMessage = async (targetUserId: string, subject: string, message: string) => {
    setIsSending(true);
    try {
      await communicationsAPI.create({ studentId: targetUserId.trim(), subject: subject.trim(), message: message.trim() });
      toast.success(t.states.messageSent);
      setShowNewMessageModal(false);
      router.replace('/list/communications');
      await fetchCommunications(1);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to send message'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-3 md:p-6">
      <div className="mb-3 flex flex-col gap-3 md:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">{t.title.communicationBook}</h1>
          <p className="hidden text-xs text-gray-500 sm:block md:text-sm">{t.subtitle.book}</p>
        </div>
        <Button onClick={() => setShowNewMessageModal(true)} className="border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.12)] text-sm text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.18)]">
          <Plus className="mr-1 h-4 w-4 md:mr-2" />
          <span className="hidden sm:inline">{t.actions.newMessage}</span>
          <span className="sm:hidden">{t.actions.new}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-[280px_1fr] xl:grid-cols-[360px_1fr]">
        <Card className="order-1 h-[calc(100vh-180px)] flex flex-col md:order-1 md:h-[calc(100vh-220px)]">
          <CardHeader className="pb-2 md:pb-3 shrink-0">
            <CardTitle className="text-base">{t.states.inbox}</CardTitle>
            <div className="mt-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.placeholders.search}
                className="h-8 text-sm md:h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full">
              <ConversationList
                conversations={conversations}
                loading={loading}
                error={error}
                selectedId={selectedConversation?.id || null}
                onSelect={setSelectedConversation}
                onRefresh={() => fetchCommunications(1)}
                searchQuery={searchQuery}
                viewerRole={viewerRole}
              />
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="order-1 flex h-[calc(100vh-180px)] flex-col md:order-2 md:h-[calc(100vh-220px)]">
          <CardHeader className="shrink-0 pb-2 md:pb-3">
            <CardTitle className="truncate text-base">
              {selectedConversation ? getConversationTitle(selectedConversation, viewerRole) : t.states.selectConversation}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            {selectionError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-gray-600">
                <div className="text-red-600">{selectionError}</div>
                <Button variant="outline" size="sm" onClick={() => router.replace('/list/communications')}>
                  {t.states.selectConversation}
                </Button>
              </div>
            ) : (
              <ChatPanel
                conversation={selectedConversation}
                isAdmin={isAdmin}
                isTeacher={isTeacher || false}
                currentUserId={user?.id || ""}
                onSendMessage={handleSendMessage}
                onReopen={handleReopen}
                onDeleteReply={handleDeleteReply}
                onDelete={handleDeleteThread}
                viewerRole={viewerRole}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <NewMessageModal
        isOpen={showNewMessageModal}
        onClose={() => { setShowNewMessageModal(false); router.replace('/list/communications'); }}
        onSubmit={handleSendNewMessage}
        isSending={isSending}
        preselectedStudentId={preselectedStudentId}
        isParent={user?.role === 'PARENT'}
        isTeacher={user?.role === 'TEACHER'}
      />
    </div>
  );
}

export default function CommunicationBookPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    }>
      <CommunicationsContent />
    </Suspense>
  );
}
