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
  CommunicationStatus,
  CommunicationCategory,
  communicationsAPI,
} from "@/lib/api/communications";
import { useAuth } from "@/context/AuthContext";
import NewMessageModal from "@/components/communications/NewMessageModal";

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

function getConversationClassLabel(conversation: ConversationWithParent | Communication) {
  const className = conversation.class?.name || conversation.student?.studentProfile?.className;
  const section = conversation.class?.section || conversation.student?.studentProfile?.section;

  if (className && section) return `${className} - Section ${section}`;
  if (className) return className;
  if (section) return `Section ${section}`;
  return null;
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
        <div className={`rounded-2xl p-3 ${isMe ? "bg-[var(--brand-color,#e35336)] text-white rounded-br-sm" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-sm shadow-sm"}`}>
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

function ConversationList({ conversations, loading, error, selectedId, onSelect, onRefresh, searchQuery }: {
  conversations: ConversationWithParent[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (conv: ConversationWithParent) => void;
  onRefresh: () => void;
  searchQuery: string;
}) {
  const filtered = conversations.filter(conv => {
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
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <XCircle className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button onClick={onRefresh} className="text-sm text-[var(--brand-color,#e35336)] hover:underline">Try again</button>
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
              className={`w-full border-b border-slate-100 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${selectedId === conv.id ? "border-l-4 border-l-[var(--brand-color,#e35336)] bg-[rgba(var(--brand-color-rgb),0.08)] dark:bg-[rgba(var(--brand-color-rgb),0.14)]" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-color,#e35336)] text-base font-semibold text-white">
                    {conv.student?.name?.charAt(0) || "S"}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[var(--brand-color,#e35336)] px-1 text-[10px] font-bold text-white">
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
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={conv.status} compact />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ChatPanel({ conversation, isAdmin, isTeacher, currentUserId, onSendMessage, onReopen, onDeleteReply, onDelete }: {
  conversation: ConversationWithParent | null;
  isAdmin: boolean;
  isTeacher: boolean;
  currentUserId: string;
  onSendMessage: (msg: string) => void;
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
      <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-color,#e35336)] text-lg font-bold text-white shadow-lg shadow-[var(--brand-color,#e35336)]/20">
              {conversation.student?.name?.charAt(0) || "S"}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{conversation.student?.name || "Unknown Student"}</h2>
              {getConversationClassLabel(conversation) && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getConversationClassLabel(conversation)}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-1.5">
              <CategoryBadge category={conversation.category} />
              <StatusBadge status={conversation.status} />
            </div>
            {conversation.status === "CLOSED" && isAdmin && (
              <button onClick={onReopen} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40">
                <RefreshCw className="h-3.5 w-3.5" />
                Reopen
              </button>
            )}
            {isAdmin && (
              <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <Trash className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
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
        <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-end gap-2">
            <div className="relative">
              <button
                onClick={() => setShowQuickReplies(!showQuickReplies)}
                className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[var(--brand-color,#e35336)] dark:hover:bg-slate-700"
                title="Quick replies"
              >
                <Zap className="h-4.5 w-4.5" />
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
                        <span className="mt-0.5 text-[var(--brand-color,#e35336)]">{tpl.icon}</span>
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
                className="w-full resize-none rounded-lg border-0 bg-slate-100 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)]/40 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!messageInput.trim() || isSending}
              className="flex items-center gap-2 rounded-lg bg-[var(--brand-color,#e35336)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      )}

      {conversation.status === "CLOSED" && (
        <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800/50 dark:bg-emerald-900/20">
          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">This conversation has been resolved</span>
          </div>
        </div>
      )}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const autoMarkedConversationRef = useRef<string | null>(null);

  const isAdmin = ((user?.role === 'ADMIN' || user?.role === 'IT_MANAGER') || user?.role === 'IT_MANAGER') || user?.role === 'SUPER_ADMIN';
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
      await communicationsAPI.create({ studentId, subject, message });
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
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
    
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Communication Book</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage communications with parents and guardians</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-[280px] max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border-0 bg-slate-100 py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)]/40 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--brand-color,#e35336)] px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20"
            >
              <Plus className="h-4.5 w-4.5" />
              New Message
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[320px] flex-shrink-0 overflow-hidden border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <ConversationList
            conversations={conversations}
            loading={loading}
            error={error}
            selectedId={selectedConversation?.id || null}
            onSelect={setSelectedConversation}
            onRefresh={() => fetchCommunications(1)}
            searchQuery={searchQuery}
          />
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel
            conversation={selectedConversation}
            isAdmin={isAdmin}
            isTeacher={isTeacher || false}
            currentUserId={user?.id || ""}
            onSendMessage={handleSendMessage}
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
        <Loader2 className="h-10 w-10 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    }>
      <CommunicationsContent />
    </Suspense>
  );
}
