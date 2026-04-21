'use client';

import { useState, useEffect, useRef } from 'react';
import { communicationsAPI, Communication, CommunicationStatus } from '@/lib/api';
import { format } from 'date-fns';

interface CommunicationDetailProps {
  communicationId: string;
  onBack?: () => void;
  onStatusChange?: (communication: Communication) => void;
}

const statusColors: Record<CommunicationStatus, string> = {
  OPEN: 'bg-orange-100 text-orange-800',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-green-100 text-green-800',
};

export default function CommunicationDetail({
  communicationId,
  onBack,
  onStatusChange,
}: CommunicationDetailProps) {
  const [communication, setCommunication] = useState<Communication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchCommunication = async () => {
    try {
      setLoading(true);
      const response = await communicationsAPI.getById(communicationId);
      setCommunication(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch communication');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunication();
  }, [communicationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [communication?.replies]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || submitting) return;

    try {
      setSubmitting(true);
      await communicationsAPI.addReply(communicationId, { message: replyMessage.trim() });
      setReplyMessage('');
      await fetchCommunication();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: CommunicationStatus) => {
    try {
      setStatusUpdating(true);
      const response = await communicationsAPI.updateStatus(communicationId, { status: newStatus });
      setCommunication(response.data);
      onStatusChange?.(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !communication) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error || 'Communication not found'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{communication.subject}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColors[communication.status]}`}>
                  {communication.status === 'OPEN' ? '🟢 Open' : communication.status === 'ACKNOWLEDGED' ? '🔵 Acknowledged' : '🟢 Closed'}
                </span>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          {(communication.status === 'OPEN' || communication.status === 'ACKNOWLEDGED') && (
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={statusUpdating}
              className="px-5 py-2.5 bg-white text-green-600 font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg"
            >
              {statusUpdating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              Mark as Resolved
            </button>
          )}
        </div>
      </div>

      {/* Meta info cards */}
      <div className="p-6 bg-gray-50 border-b">
        <div className="flex flex-wrap gap-4">
          {/* Creator */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {communication.createdBy?.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-xs text-gray-500">Created by</p>
              <p className="font-bold text-gray-900">{communication.createdBy?.name || 'Unknown'}</p>
            </div>
          </div>

          {/* Student */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 font-bold">
              {communication.student?.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-xs text-gray-500">For Student</p>
              <p className="font-bold text-gray-900">{communication.student?.name || 'Unknown'}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="font-bold text-gray-900">{format(new Date(communication.createdAt), 'MMM d, yyyy')}</p>
            </div>
          </div>

          {/* Class */}
          {communication.class && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Class</p>
                <p className="font-bold text-gray-900">{communication.class.name} • {communication.class.section}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main message */}
      <div className="p-6 border-b">
        <div className="bg-gray-50 rounded-3xl p-6">
          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-lg">{communication.message}</p>
        </div>
      </div>

      {/* Replies Thread - Social Media Style */}
      <div className="p-6 bg-gray-50">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          💬 Conversation 
          <span className="text-sm font-normal text-gray-500">({communication.replies?.length || 0} replies)</span>
        </h4>

        <div className="space-y-4 max-h-80 overflow-y-auto mb-4 pr-2">
          {communication.replies && communication.replies.length > 0 ? (
            communication.replies.map((reply, index) => (
              <div 
                key={reply.id} 
                className={`flex gap-3 ${index % 2 === 0 ? '' : 'flex-row-reverse'}`}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold shadow-md">
                    {reply.sender?.avatarUrl ? (
                      <img src={reply.sender.avatarUrl} alt="" className="w-10 h-10 rounded-2xl object-cover" />
                    ) : (
                      reply.sender?.name?.charAt(0) || '?'
                    )}
                  </div>
                </div>
                <div className={`flex-1 ${index % 2 === 0 ? '' : 'text-right'}`}>
                  <div className={`inline-block bg-white rounded-2xl p-4 shadow-md ${
                    index % 2 === 0 ? 'rounded-tl-none' : 'rounded-tr-none'
                  }`}>
                    <div className={`flex items-center gap-2 mb-1 ${index % 2 === 0 ? '' : 'justify-end'}`}>
                      <span className="text-sm font-bold text-gray-900">
                        {reply.sender?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(reply.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500">No replies yet. Start the conversation!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Form */}
        <form onSubmit={handleReply} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="w-full px-5 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all resize-none"
              disabled={submitting}
            />
          </div>
          <button
            type="submit"
            disabled={!replyMessage.trim() || submitting}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
