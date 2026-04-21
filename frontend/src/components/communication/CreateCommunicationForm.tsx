'use client';

import { useState, useEffect } from 'react';
import { communicationsAPI, studentsAPI, authAPI, classesAPI, CreateCommunicationDto } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface TargetUser {
  id: string;
  name: string;
  role?: string;
  class?: { id: string; name: string; section: string } | null;
  avatar?: string;
  childName?: string; // For parents to know which child the teacher is for
}

interface CreateCommunicationFormProps {
  studentId?: string;
  classId?: string;
  onSuccess?: (communication: any) => void;
  onCancel?: () => void;
}

export default function CreateCommunicationForm({
  studentId: propStudentId,
  classId,
  onSuccess,
  onCancel,
}: CreateCommunicationFormProps) {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState(propStudentId || '');
  const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin';
  const isParent = user?.role?.toLowerCase() === 'parent';

  // Fetch users for selection if no studentId is provided
  useEffect(() => {
    if (!propStudentId) {
      fetchUsers();
    }
  }, [propStudentId, isAdmin, isParent]);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      
      // For admins, fetch all users (students, teachers, parents, staff)
      if (isAdmin) {
        const response = await authAPI.getUsers();
        const userData = response.data || [];
        
        // Transform the data to match our TargetUser interface
        const transformedUsers = userData.map((u: any) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          avatar: u.avatar || `/avatars/${Math.floor(Math.random() * 10)}.png`
        }));
        
        setTargetUsers(transformedUsers);
      } else if (isParent) {
        // For parents, fetch their children's homeroom teachers directly from getChildren
        const childrenResponse = await studentsAPI.getChildren();
        console.log('Parent children response:', childrenResponse);
        const children = childrenResponse.data?.children || childrenResponse.data || [];
        console.log('Parent children:', children);
        
        // Get unique homeroom teachers from all children
        const teacherMap = new Map();
        
        for (const child of children) {
          // Use homeroomTeacher directly from the response
          if (child.homeroomTeacher) {
            const teacher = child.homeroomTeacher;
            if (!teacherMap.has(teacher.id)) {
              teacherMap.set(teacher.id, {
                id: teacher.id,
                name: teacher.name,
                role: 'TEACHER',
                class: null,
                avatar: teacher.avatar || `/avatars/${Math.floor(Math.random() * 10)}.png`,
                childName: child.name // Store the child's name for display
              });
            }
          }
          // Fallback: if no homeroom teacher, check if child has classId or className
          else if (child.classId || child.className) {
            // We have a class but no homeroom teacher - could show class info
            console.log('Child has class but no homeroom teacher:', child.name, child.classId, child.className);
          }
        }
        
        console.log('Found teachers:', teacherMap.size);
        setTargetUsers(Array.from(teacherMap.values()));
      } else {
        // For teachers, only fetch students from their classes
        const params: any = { limit: '100' };
        const response = await studentsAPI.getAll(params);
        const studentData = response.data.data || [];
        
        // Transform the data to match our TargetUser interface
        const transformedStudents = studentData.map((s: any) => ({
          id: s.user?.id || s.userId,
          name: s.user?.name || s.name,
          role: 'STUDENT',
          class: s.class ? { id: s.class.id, name: s.class.name, section: s.class.section } : null,
          avatar: s.user?.avatar || `/avatars/${Math.floor(Math.random() * 10)}.png`
        }));
        
        setTargetUsers(transformedStudents);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setTargetUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudentId || !formData.subject.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data: CreateCommunicationDto = {
        studentId: selectedStudentId,
        classId,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      };

      const response = await communicationsAPI.create(data);
      onSuccess?.(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create communication');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = targetUsers.find(u => u.id === selectedStudentId);

  // Group users by role for admins
  const groupedUsers = isAdmin ? targetUsers.reduce((acc, user) => {
    const role = user.role || 'OTHER';
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {} as Record<string, TargetUser[]>) : {};

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'STUDENT': 'Students',
      'TEACHER': 'Teachers',
      'PARENT': 'Parents',
      'ADMIN': 'Admins',
      'SUPER_ADMIN': 'Super Admins',
      'REGISTRAR': 'Registrars',
      'OTHER': 'Others'
    };
    return labels[role] || role;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">New Communication Entry</h2>
            <p className="text-xs text-gray-500">{isParent ? 'Send message to your child\'s homeroom teacher' : 'Share updates with parents and students'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        {/* User Selection */}
        {!propStudentId ? (
          usersLoading ? (
            <div className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
              <div className="h-12 w-full bg-gray-200 rounded-xl"></div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {isAdmin ? 'Select a user' : isParent ? 'Select teacher' : 'Select a student'}
              </label>
              <div className="relative">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  required
                >
                  <option value="">{isAdmin ? 'Search for a user...' : isParent ? 'Search for a teacher...' : 'Search for a student...'}</option>
                  {isAdmin ? (
                    // For admins, show users grouped by role
                    Object.entries(groupedUsers).map(([role, users]) => (
                      <optgroup key={role} label={getRoleLabel(role)}>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} • {getRoleLabel(role).slice(0, -1)}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  ) : (
                    // For teachers, show only students
                    // For parents, show only homeroom teachers
                    targetUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} {user.childName ? `(Child: ${user.childName})` : user.class ? `• ${user.class.name} ${user.class.section}` : ''}
                      </option>
                    ))
                  )}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )
        ) : selectedUser && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
              {selectedUser.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-900">{selectedUser.name}</p>
              {selectedUser.childName && (
                <p className="text-xs text-orange-600">Homeroom teacher for {selectedUser.childName}</p>
              )}
              {selectedUser.class && !selectedUser.childName && (
                <p className="text-xs text-gray-500">
                  {selectedUser.class.name} {selectedUser.class.section}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Subject</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="What's this about?"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Message</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Write your message..."
            rows={6}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !selectedStudentId || !formData.subject.trim() || !formData.message.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
