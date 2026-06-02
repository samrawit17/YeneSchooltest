import api from "./core";
import type { AxiosRequestConfig } from "axios";

export type CommunicationStatus = "OPEN" | "ACKNOWLEDGED" | "CLOSED";
export type CommunicationCategory =
  | "ACADEMIC"
  | "ATTENDANCE"
  | "DISCIPLINE"
  | "HEALTH"
  | "GENERAL";

export interface CommunicationReply {
  id: string;
  message: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

export interface Communication {
  id: string;
  schoolId: string;
  studentId: string;
  createdById: string;
  classId?: string;
  subject: string;
  message: string;
  status: CommunicationStatus;
  category: CommunicationCategory;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; role: string };
  student?: {
    id: string;
    name: string;
    studentProfile?: {
      className?: string | null;
      section?: string | null;
    } | null;
  };
  class?: { id: string; name: string; section: string };
  replies?: CommunicationReply[];
  _count?: { replies: number };
}

export interface CreateCommunicationDto {
  studentId: string;
  classId?: string;
  subject: string;
  message: string;
  category?: CommunicationCategory;
}

export interface CreateCommunicationReplyDto {
  message: string;
}

export interface UpdateCommunicationStatusDto {
  status: CommunicationStatus;
  notes?: string;
}

export interface CommunicationQueryParams {
  studentId?: string;
  classId?: string;
  status?: CommunicationStatus;
  category?: CommunicationCategory;
  search?: string;
  createdById?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "status";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const communicationsAPI = {
  create: (data: CreateCommunicationDto) => api.post("/communications", data),
  getAll: (params?: CommunicationQueryParams) =>
    api.get<{ data: Communication[]; meta: PaginatedResponse<Communication>["meta"] }>(
      "/communications",
      { params }
    ),
  getUnreadCount: (config?: AxiosRequestConfig) =>
    api.get<{ count: number }>("/communications/unread-count", config),
  getMyCount: (status?: string, config?: AxiosRequestConfig) =>
    api.get<{ count: number }>("/communications/my-count", {
      params: { status },
      ...config,
    }),
  getById: (id: string) => api.get<Communication>(`/communications/${id}`),
  updateStatus: (id: string, data: UpdateCommunicationStatusDto) =>
    api.put<Communication>(`/communications/${id}/status`, data),
  delete: (id: string) => api.delete(`/communications/${id}`),
  addReply: (communicationId: string, data: CreateCommunicationReplyDto) =>
    api.post<CommunicationReply>(`/communications/${communicationId}/replies`, data),
  deleteReply: (replyId: string) => api.delete(`/communications/replies/${replyId}`),
};

export interface MessagingParticipant {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface MessagingLastMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export interface MessagingConversationListItem {
  conversationId: string;
  subject?: string | null;
  participants: MessagingParticipant[];
  lastMessage: MessagingLastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessagingMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: MessagingParticipant;
  readAt: string | null;
}

export const messagingAPI = {
  listStaff: (params?: { search?: string }) => api.get<MessagingParticipant[]>("/messages/staff", { params }),
  createConversation: (data: { subject?: string; participants: string[] }) =>
    api.post("/messages/conversation", data),
  listConversations: () => api.get<MessagingConversationListItem[]>("/messages"),
  getMessages: (conversationId: string) => api.get<MessagingMessage[]>(`/messages/${conversationId}`),
  sendMessage: (conversationId: string, data: { content: string }) =>
    api.post(`/messages/${conversationId}`, data),
  markRead: (messageId: string) => api.patch(`/messages/read/${messageId}`),
};
