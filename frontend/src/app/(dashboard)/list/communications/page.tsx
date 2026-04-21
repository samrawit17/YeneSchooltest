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
import { Communication, CommunicationStatus, CommunicationCategory, communicationsAPI, studentsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type FilterOption = "all" | "unread" | "open" | "closed" | "today" | "this_week";
type CategoryFilter = CommunicationCategory | "all";
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

function StatusBadge({ status, compact = false }: { status: CommunicationStatus; compact?: boolean }) {
  const config = STATUS_CONFIG[status];
  if (compact) {
    return <span className={`w-2 h-2 rounded-full ${config.dot}`} />;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: CommunicationCategory }) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

interface ConversationWithParent extends Communication {
  parentName: string;
  parentAvatar?: string;
  unreadCount: number;
  lastMessage: string;
}

interface RecipientOption {
  id: string;
  name: string;
  className?: string;
  section?: string;
  childName?: string;
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
        <div className={`rounded-2xl p-4 ${isMe ? "bg-gradient-to-br from-[#e35336] to-[#c94429] text-white rounded-br-sm" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-sm shadow-sm"}`}>
          {!isMe && (
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-semibold text-sm ${isMe ? "text-white/90" : "text-slate-900 dark:text-white"}`}>
                {senderName}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${isMe ? "bg-white/20 text-white/80" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                {senderRole}
              </span>
            </div>
          )}
          <p className={`text-sm leading-relaxed ${isMe ? "text-white/95" : "text-slate-700 dark:text-slate-200"}`}>{message}</p>
          <div className={`flex items-center gap-1 mt-2 ${isMe ? "justify-end" : "justify-start"}`}>
            <span className={`text-xs ${isMe ? "text-white/60" : "text-slate-400 dark:text-slate-500"}`}>
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
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationList({ conversations, loading, error, selectedId, onSelect, onRefresh }: {
  conversations: ConversationWithParent[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (conv: ConversationWithParent) => void;
  onRefresh: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const filtered = conversations.filter(conv => {
    if (categoryFilter !== "all" && conv.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        conv.student?.name?.toLowerCase().includes(q) ||
        conv.parentName?.toLowerCase().includes(q) ||
        conv.subject?.toLowerCase().includes(q) ||
        conv.message?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e35336]/50"
          />
        </div>
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${categoryFilter === "all" ? "bg-[#e35336] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
            All
          </button>
          {(["ACADEMIC", "ATTENDANCE", "DISCIPLINE", "HEALTH", "GENERAL"] as CommunicationCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${categoryFilter === cat ? `${CATEGORY_CONFIG[cat].bg} ${CATEGORY_CONFIG[cat].text}` : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
            >
              {CATEGORY_CONFIG[cat].icon}
              {CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <Loader2 className="w-8 h-8 text-[#e35336] animate-spin mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <XCircle className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button onClick={onRefresh} className="text-[#e35336] text-sm hover:underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <Inbox className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No conversations found</p>
          </div>
        ) : (
          filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full p-4 border-b border-slate-100 dark:border-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedId === conv.id ? "bg-slate-100 dark:bg-slate-800 border-l-4 border-l-[#e35336]" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e35336] to-[#c94429] flex items-center justify-center text-white font-semibold text-lg">
                    {conv.student?.name?.charAt(0) || "S"}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#e35336] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {conv.student?.name || "Unknown Student"}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                      {new Date(conv.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 truncate">
                    {conv.subject}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {conv.lastMessage || conv.message}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <CategoryBadge category={conv.category} />
                <StatusBadge status={conv.status} compact />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ChatPanel({ conversation, isAdmin, isTeacher, currentUserId, onSendMessage, onAcknowledge, onClose, onReopen, onDeleteReply, onDelete }: {
  conversation: ConversationWithParent | null;
  isAdmin: boolean;
  isTeacher: boolean;
  currentUserId: string;
  onSendMessage: (msg: string) => void;
  onAcknowledge: () => void;
  onClose: () => void;
  onReopen: () => void;
  onDeleteReply: (id: string) => void;
  onDelete: () => void;
}) {
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.replies]);

  const handleSend = async () => {
    if (!messageInput.trim() || isSending) return;
    setIsSending(true);
    await onSendMessage(messageInput);
    setMessageInput("");
    setIsSending(false);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Select a conversation</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Choose a conversation from the list to view messages and reply
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#e35336] to-[#c94429] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#e35336]/20">
              {conversation.student?.name?.charAt(0) || "S"}
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{conversation.student?.name || "Unknown Student"}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {conversation.class?.name} - Section {conversation.class?.section}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CategoryBadge category={conversation.category} />
              <StatusBadge status={conversation.status} />
            </div>
            {isAdmin && (
              <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <Trash className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          {conversation.status === "OPEN" && (
            <button onClick={onAcknowledge} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors">
              <CheckCircle className="w-4 h-4" />
              Mark as Read
            </button>
          )}
          {conversation.status !== "CLOSED" && (
            <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors">
              <XCircle className="w-4 h-4" />
              Resolve
            </button>
          )}
          {conversation.status === "CLOSED" && isAdmin && (
            <button onClick={onReopen} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
              Reopen
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <MessageCard
          message={conversation.message}
          senderName={conversation.createdBy?.name || "Teacher"}
          senderRole={conversation.createdBy?.role || "Teacher"}
          timestamp={conversation.createdAt}
          isMe={conversation.createdById === currentUserId || conversation.createdBy?.id === currentUserId}
        />
        {conversation.replies?.map(reply => (
          <MessageCard
            key={reply.id}
            message={reply.message}
            senderName={reply.sender?.name || "Sender"}
            senderRole={reply.sender?.role || "Parent"}
            timestamp={reply.createdAt}
            isMe={reply.sender?.id === currentUserId}
            onDelete={() => onDeleteReply(reply.id)}
            canDelete={isAdmin || reply.sender?.id === currentUserId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {(conversation.status !== "CLOSED" || isAdmin) && (
        <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-end gap-3">
            <div className="relative">
              <button
                onClick={() => setShowQuickReplies(!showQuickReplies)}
                className="p-3 text-slate-400 hover:text-[#e35336] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                title="Quick replies"
              >
                <Zap className="w-5 h-5" />
              </button>
              {showQuickReplies && (isAdmin || isTeacher) && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Replies</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {QUICK_REPLY_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => { setMessageInput(tpl.message); setShowQuickReplies(false); }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-start gap-3 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0"
                      >
                        <span className="text-[#e35336] mt-0.5">{tpl.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{tpl.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{tpl.message}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your message..."
                rows={1}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e35336]/50 resize-none"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!messageInput.trim() || isSending}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#e35336] to-[#c94429] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#e35336]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      )}

      {conversation.status === "CLOSED" && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-100 dark:border-emerald-800/50 px-6 py-3">
          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">This conversation has been resolved</span>
          </div>
        </div>
      )}
    </div>
  );
}

function NewMessageModal({ isOpen, onClose, onSubmit, isSending, preselectedStudentId, isParent, isTeacher }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (studentId: string, subject: string, message: string) => void;
  isSending: boolean;
  preselectedStudentId?: string | null;
  isParent?: boolean;
  isTeacher?: boolean;
}) {
  const [studentId, setStudentId] = useState(preselectedStudentId || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState<RecipientOption[]>([]);
  const [allStudents, setAllStudents] = useState<RecipientOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      if (isParent) {
        const response = await studentsAPI.getChildren();
        const children = response.data?.children || response.data || [];
        const teacherMap = new Map<string, RecipientOption>();
        for (const child of children) {
          const teacher = child.homeroomTeacher;
          if (!teacher?.id || !teacher?.name) continue;
          const existing = teacherMap.get(teacher.id);
          if (existing) {
            if (child.name && !existing.childName?.includes(child.name)) {
              existing.childName = existing.childName ? `${existing.childName}, ${child.name}` : child.name;
            }
            continue;
          }
          teacherMap.set(teacher.id, { id: teacher.id, name: teacher.name, childName: child.name });
        }
        const query = searchQuery.trim().toLowerCase();
        const filtered = Array.from(teacherMap.values()).filter(t => !query || t.name.toLowerCase().includes(query) || t.childName?.toLowerCase().includes(query));
        setAllStudents(Array.from(teacherMap.values()));
        setStudents(filtered);
      } else if (isTeacher) {
        const response = await studentsAPI.getHomeroomStudents();
        const data = response.data?.data || [];
        const fetched = data.map((s: any) => ({ 
          id: s.id, 
          name: s.name, 
          className: s.className, 
          section: s.section 
        }));
        setAllStudents(fetched);
        setStudents(fetched);
        setShowDropdown(true);
      } else {
        const response = await studentsAPI.getAll({ search: searchQuery, limit: '50', status: 'ACTIVE' });
        const data = response.data?.data || response.data || [];
        const mapped = data.map((s: any) => ({ id: s.id, name: s.name, className: s.class?.name, section: s.class?.section }));
        setAllStudents(mapped);
        setStudents(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const filterStudents = (query: string) => {
    if (!query.trim()) {
      setStudents(allStudents);
      return;
    }
    const q = query.toLowerCase();
    setStudents(allStudents.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.className?.toLowerCase().includes(q)
    ));
  };

  useEffect(() => {
    if (isOpen) {
      if (preselectedStudentId) {
        setStudentId(preselectedStudentId);
      } else {
        setStudentId("");
        setSubject("");
        setMessage("");
        setSearchQuery("");
        setStudents([]);
        setAllStudents([]);
        if (isTeacher) {
          fetchStudents();
        }
      }
    }
  }, [isOpen, preselectedStudentId, isTeacher]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (!studentId.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields and select a student");
      return;
    }
    onSubmit(studentId, subject, message);
  };

  const selectedStudent = students.find(s => s.id === studentId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e35336] to-[#c94429] flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Message</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isParent ? 'Send a message to your child\'s teacher' : isTeacher ? 'Send a message about a student to their parent' : 'Send a message to a parent'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div ref={dropdownRef} className="mb-5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {isParent ? 'Select Teacher' : isTeacher ? 'Select Student' : 'Select Student'} <span className="text-red-500">*</span>
            </label>
            {preselectedStudentId ? (
              <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400">
                Student selected
              </div>
            ) : (
              <div 
                className="relative cursor-pointer" 
                onMouseEnter={() => { if (isTeacher && allStudents.length > 0) setShowDropdown(true); }} 
                onMouseLeave={() => { if (isTeacher) setShowDropdown(false); }}
              >
                <input
                  type="text"
                  placeholder={
                    isParent ? "Search for your child's teacher..." : 
                    isTeacher ? (allStudents.length > 0 ? `Search in ${allStudents.length} assigned students...` : "Click or hover to see students from your assigned classes...") : 
                    "Search for a student..."
                  }
                  value={searchQuery}
                  onChange={(e) => { 
                    const value = e.target.value;
                    setSearchQuery(value);
                    setShowDropdown(true);
                    if (isTeacher && allStudents.length > 0) {
                      filterStudents(value);
                    }
                  }}
                  onFocus={() => { 
                    setShowDropdown(true); 
                    if (allStudents.length === 0) {
                      fetchStudents();
                    } else if (isTeacher) {
                      setStudents(allStudents);
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e35336]/50 cursor-pointer"
                />
                {loadingStudents && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-slate-400" />
                )}
                {!loadingStudents && isTeacher && allStudents.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                    {allStudents.length} students
                  </span>
                )}
                {showDropdown && students.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-10 max-h-64 overflow-y-auto">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {isTeacher ? 'Your Assigned Students' : 'Search Results'}
                      </p>
                    </div>
                    {students.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setStudentId(s.id); setSearchQuery(s.name); setShowDropdown(false); }}
                        className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between ${studentId === s.id ? "bg-[#e35336]/5" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e35336] to-[#c94429] flex items-center justify-center text-white text-sm font-medium">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900 dark:text-white block">{s.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {s.className} - Section {s.section}
                            </span>
                          </div>
                        </div>
                        {studentId === s.id && (
                          <CheckCircle className="w-5 h-5 text-[#e35336]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {!loadingStudents && students.length === 0 && allStudents.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-10">
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                      No matches found
                    </p>
                  </div>
                )}
                {!loadingStudents && isTeacher && allStudents.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-10">
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                      You don't have any students in your assigned classes
                    </p>
                  </div>
                )}
              </div>
            )}
            {selectedStudent && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Selected: {selectedStudent.name}
              </p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter message subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e35336]/50"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Write your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e35336]/50 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSending || !studentId || !subject.trim() || !message.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#e35336] to-[#c94429] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#e35336]/30 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommunicationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedStudentId = searchParams ? searchParams.get("studentId") : null;
  const conversationId = searchParams ? searchParams.get("conversationId") : null;
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<ConversationWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithParent | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isTeacher = user?.role === 'TEACHER';

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
      const response = await communicationsAPI.getAll({ page, limit: 20 });
      const data = response.data.data || [];
      const meta = response.data.meta || { totalPages: 1, page: 1 };
      setTotalPages(meta.totalPages);
      
      const transformed: ConversationWithParent[] = data.map((comm: Communication) => {
        const lastReply = comm.replies && comm.replies.length > 0 ? comm.replies[comm.replies.length - 1] : null;
        const parentReply = comm.replies?.find(r => r.sender?.role === 'PARENT');
        return {
          ...comm,
          parentName: parentReply?.sender?.name || (comm.createdBy?.role === 'PARENT' ? comm.createdBy?.name : 'Parent'),
          unreadCount: 0,
          lastMessage: lastReply?.message || comm.message,
        };
      });

      setConversations(transformed);
      if (!selectedConversation && transformed.length > 0) {
        if (conversationId) {
          const found = transformed.find(c => c.id === conversationId);
          if (found) setSelectedConversation(found);
        } else {
          setSelectedConversation(transformed[0]);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load communications');
    } finally {
      setLoading(false);
    }
  }, [conversationId, selectedConversation]);

  useEffect(() => { fetchCommunications(); }, [fetchCommunications]);

  const handleSendMessage = async (msg: string) => {
    if (!selectedConversation) return;
    try {
      const response = await communicationsAPI.addReply(selectedConversation.id, { message: msg });
      const updatedReplies = [...(selectedConversation.replies || []), response.data];
      const updatedConv = { ...selectedConversation, replies: updatedReplies, lastMessage: msg, updatedAt: new Date().toISOString() };
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? updatedConv : c));
      setSelectedConversation(updatedConv);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedConversation) return;
    try {
      const response = await communicationsAPI.updateStatus(selectedConversation.id, { status: 'ACKNOWLEDGED' });
      const updated = { ...selectedConversation, status: response.data.status as CommunicationStatus };
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? updated : c));
      setSelectedConversation(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to acknowledge');
    }
  };

  const handleClose = async () => {
    if (!selectedConversation) return;
    try {
      const response = await communicationsAPI.updateStatus(selectedConversation.id, { status: 'CLOSED' });
      const updated = { ...selectedConversation, status: response.data.status as CommunicationStatus };
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? updated : c));
      setSelectedConversation(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to close');
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
      toast.error(err.response?.data?.message || 'Failed to reopen');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!selectedConversation || !confirm("Delete this message?")) return;
    try {
      await communicationsAPI.deleteReply(replyId);
      const updated = { ...selectedConversation, replies: selectedConversation.replies?.filter(r => r.id !== replyId) || [] };
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? updated : c));
      setSelectedConversation(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleDeleteThread = async () => {
    if (!selectedConversation || !isAdmin || !confirm("Delete this conversation?")) return;
    try {
      await communicationsAPI.delete(selectedConversation.id);
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      setSelectedConversation(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleSendNewMessage = async (studentId: string, subject: string, message: string) => {
    setIsSending(true);
    try {
      await communicationsAPI.create({ studentId, subject, message, category });
      toast.success("Message sent");
      setShowNewMessageModal(false);
      router.replace('/list/communications');
      fetchCommunications(1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
    
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Communication Book</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage communications with parents and guardians</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewMessageModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#e35336] to-[#c94429] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#e35336]/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Message
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden">
          <ConversationList
            conversations={conversations}
            loading={loading}
            error={error}
            selectedId={selectedConversation?.id || null}
            onSelect={setSelectedConversation}
            onRefresh={() => fetchCommunications(1)}
          />
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel
            conversation={selectedConversation}
            isAdmin={isAdmin}
            isTeacher={isTeacher || false}
            currentUserId={user?.id || ""}
            onSendMessage={handleSendMessage}
            onAcknowledge={handleAcknowledge}
            onClose={handleClose}
            onReopen={handleReopen}
            onDeleteReply={handleDeleteReply}
            onDelete={handleDeleteThread}
          />
        </main>
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
        <Loader2 className="w-10 h-10 text-[#e35336] animate-spin" />
      </div>
    }>
      <CommunicationsContent />
    </Suspense>
  );
}
