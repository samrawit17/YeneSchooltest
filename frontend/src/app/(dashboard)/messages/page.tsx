"use client";

import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import {
  messagingAPI,
  MessagingConversationListItem,
  MessagingMessage,
  MessagingParticipant,
} from "@/lib/api/communications";
import { syncService } from "@/lib/db/sync-service";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Search, Send } from "lucide-react";
import { useTranslations } from "@/hooks/useTranslations";
import { TranslatedText } from "@/components/translation/TranslatedText";

const STAFF_ROLES = new Set(["ADMIN", "REGISTRAR", "TEACHER", "FINANCE", "IT_MANAGER"]);

function getErrorStatus(error: unknown) {
  return (error as any)?.response?.status;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const message = (error as any)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message.trim() ? message : fallback;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { currentAcademicYear, isLoading: isAcademicYearLoading } = useAcademicYear();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { t } = useTranslations<any>("communications");

  const selectedConversationId = searchParams.get("conversationId");
  const recipientId = searchParams.get("recipientId");

  const [conversationSearch, setConversationSearch] = useState("");
  const [draft, setDraft] = useState("");

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoCreateHandledRef = useRef<string | null>(null);

  const isStaffUser = !!user?.role && STAFF_ROLES.has(user.role.toUpperCase());
  const academicYearId = currentAcademicYear?.id;

  useEffect(() => {
    syncService.startAutoSync();
    return () => syncService.stopAutoSync();
  }, []);

  const conversationsQueryKey = useMemo(
    () => queryKeys.messages.conversations(user?.id, user?.schoolId, academicYearId),
    [academicYearId, user?.id, user?.schoolId]
  );

  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: conversationsQueryKey,
    queryFn: async () => (await messagingAPI.listConversations({ academicYearId })).data,
    enabled: !!user?.id && !!user?.schoolId && isStaffUser && !isAcademicYearLoading,
    staleTime: 5_000,
    refetchInterval: 10_000,
    retry: 1,
  });

  const filteredConversations = useMemo(() => {
    const q = conversationSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c: MessagingConversationListItem) => {
      const subject = (c.subject || "").toLowerCase();
      const last = (c.lastMessage?.content || "").toLowerCase();
      const names = c.participants.map((p) => (p.name || "").toLowerCase()).join(" ");
      return subject.includes(q) || last.includes(q) || names.includes(q);
    });
  }, [conversations, conversationSearch]);

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    error: messagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: queryKeys.messages.conversationMessages(selectedConversationId, user?.id, academicYearId),
    queryFn: async () => (await messagingAPI.getMessages(selectedConversationId!, { academicYearId })).data,
    enabled: !!user?.id && !!user?.schoolId && !!selectedConversationId && isStaffUser && !isAcademicYearLoading,
    staleTime: 0,
    refetchInterval: (query) => (query.state.status === "error" ? false : 3_000),
    retry: false,
  });

  const {
    data: staff = [],
    isLoading: isLoadingStaff,
    isError: isStaffError,
    refetch: refetchStaff,
  } = useQuery({
    queryKey: queryKeys.messages.staff(user?.id, user?.schoolId, staffSearch, newDialogOpen),
    queryFn: async () => (await messagingAPI.listStaff({ search: staffSearch })).data,
    enabled: !!user?.id && !!user?.schoolId && isStaffUser && newDialogOpen,
    staleTime: 30_000,
    retry: 1,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (input: { participants: string[]; subject?: string }) =>
      messagingAPI.createConversation({
        subject: input.subject?.trim() ? input.subject.trim() : undefined,
        participants: input.participants,
      }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      setNewDialogOpen(false);
      setNewSubject("");
      setStaffSearch("");
      setSelectedStaffIds([]);
      const conversationId = res.data?.id;
      if (conversationId) {
        router.replace(`/messages?conversationId=${conversationId}`);
      }
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t.states.createConversationFailed));
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => messagingAPI.sendMessage(selectedConversationId!, { content }),
    onMutate: async (newContent: string) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.messages.conversationMessages(selectedConversationId, user?.id, academicYearId),
      });
      const previousMessages = queryClient.getQueryData(
        queryKeys.messages.conversationMessages(selectedConversationId, user?.id, academicYearId)
      );

      queryClient.setQueryData(
        queryKeys.messages.conversationMessages(selectedConversationId, user?.id, academicYearId),
        (old: any) => {
        const newMessage = {
          id: `temp-${Date.now()}`,
          content: newContent,
          createdAt: new Date().toISOString(),
          senderId: user?.id,
          sender: { id: user?.id, name: user?.name, avatarUrl: user?.avatarUrl },
          readAt: null,
          conversationId: selectedConversationId,
        };
        return old ? [...old, newMessage] : [newMessage];
      });

      return { previousMessages, newContent };
    },
    onError: async (err: any, newContent, context) => {
      if (context?.newContent) setDraft(context.newContent);
      if (context?.previousMessages) {
        queryClient.setQueryData(
          queryKeys.messages.conversationMessages(selectedConversationId, user?.id, academicYearId),
          context.previousMessages
        );
      }
      const isNetworkError = !navigator.onLine || !err?.response;
      if (isNetworkError && selectedConversationId && context?.newContent) {
        try {
          await syncService.saveMessageDraftOffline({
            localId: `message:${selectedConversationId}:${Date.now()}`,
            conversationId: selectedConversationId,
            content: context.newContent,
            userId: user?.id,
          });
          setDraft("");
          toast.success(t.states.savedOffline);
        } catch (offlineError) {
          toast.error(getApiErrorMessage(offlineError, t.states.sendFailed));
        }
        return;
      }
      toast.error(getApiErrorMessage(err, t.states.sendFailed));
    },
    onSuccess: () => {
      toast.success(t.states.messageSent);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversationMessages(selectedConversationId, user?.id, academicYearId),
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedConversationId]);

  useEffect(() => {
    if (!recipientId || !user?.id || !isStaffUser) {
      return;
    }

    if (selectedConversationId || createConversationMutation.isPending) {
      return;
    }

    if (autoCreateHandledRef.current === recipientId) {
      return;
    }

    if (isLoadingConversations) {
      return;
    }

    const existingConversation = (conversations as MessagingConversationListItem[]).find((conversation) => {
      const participantIds = conversation.participants.map((participant) => participant.id).sort();
      return participantIds.length === 2 && participantIds.includes(user.id) && participantIds.includes(recipientId);
    });

    if (existingConversation) {
      autoCreateHandledRef.current = recipientId;
      router.replace(`/messages?conversationId=${existingConversation.conversationId}`);
      return;
    }

    autoCreateHandledRef.current = recipientId;
    void createConversationMutation
      .mutateAsync({ participants: [recipientId] })
      .catch((error) => {
        console.error("Failed to open direct message thread", error);
        autoCreateHandledRef.current = null;
      });
  }, [
    conversations,
    createConversationMutation,
    isLoadingConversations,
    isStaffUser,
    recipientId,
    router,
    selectedConversationId,
    user?.id,
  ]);

  useEffect(() => {
    if (!user?.id) return;
    if (!selectedConversationId) return;
    if (!messages?.length) return;

    const unreadIds = (messages as MessagingMessage[])
      .filter((m) => m.sender?.id !== user.id && !m.readAt)
      .map((m) => m.id)
      .slice(0, 50);

    if (unreadIds.length === 0) return;

    Promise.all(unreadIds.map((id) => messagingAPI.markRead(id)))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
        queryClient.invalidateQueries({
          queryKey: queryKeys.messages.conversationMessages(selectedConversationId, user?.id, academicYearId),
        });
      })
      .catch((error) => {
        console.warn("Failed to mark messages as read", error);
      });
  }, [academicYearId, messages, selectedConversationId, user?.id, queryClient, conversationsQueryKey]);

  const getConversationTitle = (c: MessagingConversationListItem) => {
    if (c.subject) return c.subject;
    const others = c.participants.filter((p) => p.id !== user?.id);
    if (others.length === 1) return others[0].name;
    if (others.length > 1) return `${others[0].name} +${others.length - 1}`;
    return t.states.selectConversation;
  };

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return (conversations as MessagingConversationListItem[]).find((c) => c.conversationId === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  const isSelectedConversationNotFound = isMessagesError && getErrorStatus(messagesError) === 404;
  const canUseComposer =
    !!selectedConversationId &&
    !!selectedConversation &&
    !isMessagesError &&
    !isLoadingMessages &&
    !sendMessageMutation.isPending;

  const toggleStaff = (staffUser: MessagingParticipant) => {
    setSelectedStaffIds((prev) => {
      if (prev.includes(staffUser.id)) return prev.filter((id) => id !== staffUser.id);
      return [...prev, staffUser.id];
    });
  };

  const handleSend = () => {
    const contentToSend = draft.trim();
    if (!contentToSend || !canUseComposer) return;
    setDraft("");
    sendMessageMutation.mutate(contentToSend);
  };

  if (!isStaffUser) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.title.messages}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            {t.states.staffOnly}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 h-full overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-3 md:mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">{t.title.messages}</h1>
          <p className="text-xs md:text-sm text-gray-500 hidden sm:block">{t.subtitle.internal}</p>
        </div>

        <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg" style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}>
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t.actions.newConversation}</span>
              <span className="sm:hidden">{t.actions.new}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.actions.newConversation}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.fields.subjectOptional}</label>
                <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder={t.placeholders.subjectExample} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.fields.addParticipants}</label>
                <div className="flex items-center gap-2 mt-2">
                  <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder={t.placeholders.searchStaff}
                  />
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-md dark:border-[#334155]">
                <div className="p-2">
                  {isLoadingStaff ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.states.loadingStaff}
                    </div>
                  ) : isStaffError ? (
                    <div className="space-y-2 p-2">
                      <div className="text-sm text-red-600">{t.states.loadStaffFailed}</div>
                      <Button size="sm" variant="outline" onClick={() => refetchStaff()}>
                        {t.actions.tryAgain}
                      </Button>
                    </div>
                  ) : staff.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2">{t.states.noStaff}</div>
                  ) : (
                    staff.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStaff(s)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-[#2A2A2A] text-left"
                      >
                        <Checkbox checked={selectedStaffIds.includes(s.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {s.role}
                            </Badge>
                          </div>
                          {s.email && <p className="text-xs text-gray-500 truncate">{s.email}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>

              {selectedStaffIds.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400">{t.states.selected}: {selectedStaffIds.length} staff</div>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={() =>
                  createConversationMutation.mutate({
                    participants: selectedStaffIds,
                    subject: newSubject,
                  })
                }
                disabled={selectedStaffIds.length === 0 || createConversationMutation.isPending}
                className="border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.12)] text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.18)]"
              >
                {createConversationMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {t.actions.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[280px_1fr] xl:grid-cols-[360px_1fr] gap-3 md:gap-4">
        {/* Conversations */}
        <Card className="h-[calc(100vh-180px)] flex flex-col order-2 md:order-1 md:h-[calc(100vh-220px)]">
          <CardHeader className="pb-2 md:pb-3 shrink-0">
            <CardTitle className="text-base">{t.states.inbox}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                placeholder={t.placeholders.search}
                className="h-8 md:h-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            <ScrollArea className="h-full">
              {isLoadingConversations ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.states.loadingConversations}
                </div>
              ) : isConversationsError ? (
                <div className="space-y-2 p-4">
                  <div className="text-sm text-red-600">{t.states.loadConversationsFailed}</div>
                  <Button size="sm" variant="outline" onClick={() => refetchConversations()}>
                    {t.actions.tryAgain}
                  </Button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-sm text-gray-500 p-4">{t.states.noConversations}</div>
              ) : (
                filteredConversations.map((c) => {
                  const active = c.conversationId === selectedConversationId;
                  return (
                    <button
                      key={c.conversationId}
                      type="button"
                      onClick={() => router.push(`/messages?conversationId=${c.conversationId}`)}
                      className={`w-full p-2 md:p-4 border-b text-left hover:bg-gray-50 transition-colors ${
                        active ? "bg-[rgba(var(--brand-color-rgb),0.06)] dark:bg-[rgba(var(--brand-color-rgb),0.12)]" : "bg-white dark:bg-[#111111]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{getConversationTitle(c)}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5 md:mt-1">
                            {c.lastMessage ? c.lastMessage.content : t.states.noMessagesPreview}
                          </p>
                        </div>
                        {c.unreadCount > 0 && (
                          <span className="border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.12)] text-[var(--brand-color,#e35336)] text-[10px] md:text-[11px] font-bold min-w-[18px] md:min-w-[20px] h-[18px] md:h-[20px] rounded-md flex items-center justify-center px-0.5 md:px-1 flex-shrink-0">
                            {c.unreadCount > 99 ? "99+" : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Thread */}
        <Card className="h-[calc(100vh-180px)] flex flex-col order-1 md:order-2 md:h-[calc(100vh-220px)]">
          <CardHeader className="pb-2 md:pb-3 flex-shrink-0">
            <CardTitle className="text-base truncate">
              {selectedConversation ? getConversationTitle(selectedConversation) : t.states.selectConversation}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 p-0 min-h-0">
            {!selectedConversationId ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 p-4 text-center">
                {t.states.chooseConversation}
              </div>
            ) : isMessagesError ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-gray-600 p-4 text-center">
                <div className="text-red-600">
                  {isSelectedConversationNotFound ? t.states.conversationNotFound : t.states.loadMessagesFailed}
                </div>
                <div className="flex items-center gap-2">
                  {isSelectedConversationNotFound ? (
                    <Button variant="outline" size="sm" onClick={() => router.replace("/messages")}>
                      {t.states.selectConversation}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => refetchMessages()}>
                      {t.actions.tryAgain}
                    </Button>
                  )}
                </div>
              </div>
            ) : isLoadingMessages ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.states.loadingMessages}
              </div>
            ) : (
              <ScrollArea className="h-full px-2 md:px-4">
                <div className="py-2 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-sm text-gray-500 py-6">{t.states.noMessages}</div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender?.id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-lg border px-3 py-2 text-sm ${
                              mine
                                ? "border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.10)] text-[var(--brand-color,#e35336)] dark:border-[rgba(var(--brand-color-rgb),0.24)] dark:bg-[rgba(var(--brand-color-rgb),0.12)] dark:text-white/90"
                                : "border-gray-200 bg-gray-100 text-gray-900 dark:border-[#2A2A2A] dark:bg-[#2A2A2A] dark:text-white"
                            }`}
                          >
                            {!mine && (
                              <p className="text-[11px] font-semibold text-gray-600 mb-1">
                                {m.sender?.name}
                              </p>
                            )}
                            <TranslatedText text={m.content} />
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}
          </CardContent>

          {/* Composer */}
          <div className="border-t p-2 md:p-3 flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.placeholders.typeMessage}
              disabled={!canUseComposer}
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
              disabled={!canUseComposer || !draft.trim()}
              className="h-9 w-9 border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.12)] text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.18)] md:h-9 md:w-9"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
