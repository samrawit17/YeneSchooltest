'use client';

import { useState, useEffect } from 'react';
import { communicationsAPI, Communication, CommunicationStatus } from '@/lib/api';
import { format } from 'date-fns';

interface CommunicationListProps {
  studentId?: string;
  classId?: string;
  onViewDetail?: (communication: Communication) => void;
  onCreateNew?: () => void;
}

const statusColors: Record<CommunicationStatus, string> = {
  OPEN: 'bg-orange-100 text-orange-800',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-green-100 text-green-800',
};

export default function CommunicationList({
  studentId,
  classId,
  onViewDetail,
  onCreateNew,
}: CommunicationListProps) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '' as CommunicationStatus | '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (studentId) params.studentId = studentId;
      if (classId) params.classId = classId;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await communicationsAPI.getAll(params);
      setCommunications(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.meta?.total || 0,
        totalPages: response.data.meta?.totalPages || 0,
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch communications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, [studentId, classId, pagination.page, filters.status, filters.search]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCommunications();
  };

  if (loading && communications.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and create button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as CommunicationStatus | '' }))}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="CLOSED">Closed</option>
          </select>

          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search messages..."
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-l-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-48"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-500 text-white rounded-r-lg text-sm font-medium hover:bg-blue-600"
            >
              Search
            </button>
          </form>
        </div>

      </div>

      {/* Communication Feed */}
      {communications.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No communications yet</p>
          <p className="text-gray-400 text-sm mt-1">Start a conversation with parents</p>
        </div>
      ) : (
        <div className="space-y-4">
          {communications.map((comm, index) => (
            <div
              key={comm.id}
              onClick={() => onViewDetail?.(comm)}
              className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer p-5 ${
                comm.status === 'OPEN' ? 'border-l-4 border-l-orange-500' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {comm.createdBy?.name?.charAt(0) || '?'}
                  </div>
                  {comm.status === 'OPEN' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{comm.subject}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[comm.status]}`}>
                      {comm.status}
                    </span>
                  </div>
                  <p className="text-gray-600 line-clamp-2 mt-1">{comm.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="font-medium">{comm.createdBy?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{format(new Date(comm.createdAt), 'MMM d, h:mm a')}</span>
                    <span>•</span>
                    <span>{comm.student?.name || 'Unknown Student'}</span>
                  </div>
                </div>

                {/* Replies count */}
                <div className="text-right">
                  {(comm._count?.replies ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm font-medium">{comm._count?.replies}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
