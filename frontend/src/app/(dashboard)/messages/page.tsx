"use client";

import { useAuth } from "@/context/AuthContext";
import {
  messagingAPI,
  MessagingConversationListItem,
  MessagingMessage,
  MessagingParticipant,
} from "@/lib/api/communications";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Search, Send } from "lucide-react";

const STAFF_ROLES = new Set(["ADMIN", "REGISTRAR", "TEACHER", "FINANCE"]);

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

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

  const conversationsQueryKey = useMemo(
    () => queryKeys.messages.conversations(user?.id, user?.schoolId),
    [user?.id, user?.schoolId]
  );

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: conversationsQueryKey,
    queryFn: async () => (await messagingAPI.listConversations()).data,
    enabled: !!user?.id && !!user?.schoolId && isStaffUser,
    staleTime: 5_000,
    refetchInterval: 10_000,
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

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: queryKeys.messages.conversationMessages(selectedConversationId, user?.id),
    queryFn: async () => (await messagingAPI.getMessages(selectedConversationId!)).data,
    enabled: !!user?.id && !!user?.schoolId && !!selectedConversationId && isStaffUser,
    staleTime: 0,
    refetchInterval: 3_000,
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: queryKeys.messages.staff(user?.id, user?.schoolId, staffSearch, newDialogOpen),
    queryFn: async () => (await messagingAPI.listStaff({ search: staffSearch })).data,
    enabled: !!user?.id && !!user?.schoolId && isStaffUser && newDialogOpen,
    staleTime: 30_000,
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
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => messagingAPI.sendMessage(selectedConversationId!, { content }),
    onMutate: async (newContent: string) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.messages.conversationMessages(selectedConversationId, user?.id),
      });
      const previousMessages = queryClient.getQueryData(
        queryKeys.messages.conversationMessages(selectedConversationId, user?.id)
      );

      queryClient.setQueryData(
        queryKeys.messages.conversationMessages(selectedConversationId, user?.id),
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
    onError: (err, newContent, context) => {
      if (context?.newContent) setDraft(context.newContent);
      if (context?.previousMessages) {
        queryClient.setQueryData(
          queryKeys.messages.conversationMessages(selectedConversationId, user?.id),
          context.previousMessages
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversationMessages(selectedConversationId, user?.id),
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

    Promise.all(unreadIds.map((id) => messagingAPI.markRead(id))).then(() => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversationMessages(selectedConversationId, user?.id),
      });
    });
  }, [messages, selectedConversationId, user?.id, queryClient, conversationsQueryKey]);

  const getConversationTitle = (c: MessagingConversationListItem) => {
    if (c.subject) return c.subject;
    const others = c.participants.filter((p) => p.id !== user?.id);
    if (others.length === 1) return others[0].name;
    if (others.length > 1) return `${others[0].name} +${others.length - 1}`;
    return "Conversation";
  };

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return (conversations as MessagingConversationListItem[]).find((c) => c.conversationId === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  const toggleStaff = (staffUser: MessagingParticipant) => {
    setSelectedStaffIds((prev) => {
      if (prev.includes(staffUser.id)) return prev.filter((id) => id !== staffUser.id);
      return [...prev, staffUser.id];
    });
  };

  if (!isStaffUser) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Messaging is available to staff users only.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-3 md:mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Messages</h1>
          <p className="text-xs md:text-sm text-gray-500 hidden sm:block">Internal staff messaging</p>
        </div>

        <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#e35336] hover:bg-[#e35336] text-sm">
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">New conversation</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New conversation</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Subject (optional)</label>
                <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="e.g. Grade 10 Meeting" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Add participants</label>
                <div className="flex items-center gap-2 mt-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search staff by name/email"
                  />
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-md">
                <div className="p-2">
                  {isLoadingStaff ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading staff…
                    </div>
                  ) : staff.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2">No staff found.</div>
                  ) : (
                    staff.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStaff(s)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-left"
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
                <div className="text-xs text-gray-600">Selected: {selectedStaffIds.length} staff</div>
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
                className="bg-[#1E3A8A] hover:bg-[#162f6b]"
              >
                {createConversationMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[280px_1fr] xl:grid-cols-[360px_1fr] gap-3 md:gap-4">
        {/* Conversations */}
        <Card className="h-[calc(100vh-180px)] md:h-[calc(100vh-220px)] order-2 md:order-1">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-base">Inbox</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                placeholder="Search"
                className="h-8 md:h-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-60px)]">
              {isLoadingConversations ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading conversations…
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-sm text-gray-500 p-4">No conversations yet.</div>
              ) : (
                filteredConversations.map((c) => {
                  const active = c.conversationId === selectedConversationId;
                  return (
                    <button
                      key={c.conversationId}
                      type="button"
                      onClick={() => router.push(`/messages?conversationId=${c.conversationId}`)}
                      className={`w-full p-2 md:p-4 border-b text-left hover:bg-gray-50 transition-colors ${
                        active ? "bg-blue-50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{getConversationTitle(c)}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5 md:mt-1">
                            {c.lastMessage ? c.lastMessage.content : "No messages"}
                          </p>
                        </div>
                        {c.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] md:text-[11px] font-bold min-w-[18px] md:min-w-[20px] h-[18px] md:h-[20px] rounded-md flex items-center justify-center px-0.5 md:px-1 flex-shrink-0">
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
        <Card className="h-[calc(100vh-180px)] md:h-[calc(100vh-220px)] flex flex-col order-1 md:order-2">
          <CardHeader className="pb-2 md:pb-3 flex-shrink-0">
            <CardTitle className="text-base truncate">
              {selectedConversation ? getConversationTitle(selectedConversation) : "Select a conversation"}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 p-0 min-h-0">
            {!selectedConversationId ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 p-4 text-center">
                Choose a conversation to view messages.
              </div>
            ) : isLoadingMessages ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading messages…
              </div>
            ) : (
              <ScrollArea className="h-full px-2 md:px-4">
                <div className="py-2 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-sm text-gray-500 py-6">No messages yet.</div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender?.id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                              mine ? "bg-[#1E3A8A] text-white" : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            {!mine && (
                              <p className="text-[11px] font-semibold text-gray-600 mb-1">
                                {m.sender?.name}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
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
              placeholder="Type a message…"
              disabled={!selectedConversationId || sendMessageMutation.isPending}
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!draft.trim() || !selectedConversationId) return;
                  const contentToSend = draft;
                  setDraft("");
                  sendMessageMutation.mutate(contentToSend);
                }
              }}
            />
            <Button
              onClick={() => {
                const contentToSend = draft;
                setDraft("");
                sendMessageMutation.mutate(contentToSend);
              }}
              disabled={!selectedConversationId || !draft.trim() || sendMessageMutation.isPending}
              className="bg-[#e35336] hover:bg-[#162f6b] h-9 md:h-9 w-9 md:w-9"
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
