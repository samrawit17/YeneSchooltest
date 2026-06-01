"use client";

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { timetableSlotsAPI, classesAPI, subjectsAPI } from '@/lib/api';
import { TimePicker } from "@/components/ui/TimePicker";

interface TimetableSlot {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  academicYearId?: string;
  class?: { id: string; name: string; section: string };
  subject?: { id: string; name: string };
  teacher?: { id: string; name: string };
}

interface Class {
  id: string;
  name: string;
  section: string;
}

interface Subject {
  id: string;
  name: string;
}

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export default function TimetableSlotsPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [formData, setFormData] = useState({
    schoolId: '',
    classId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: 1,
    startTime: '',
    endTime: '',
    room: '',
  });

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    fetchSlots();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll();
      setClasses(response.data);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await subjectsAPI.getAll();
      setSubjects(response.data);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedClass) params.classId = selectedClass;
      if (selectedDay) params.dayOfWeek = parseInt(selectedDay);
      
      const response = await timetableSlotsAPI.getAll(params);
      setSlots(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch timetable slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSlot) {
        await timetableSlotsAPI.update(editingSlot.id, formData);
      } else {
        await timetableSlotsAPI.create(formData);
      }
      setShowForm(false);
      setEditingSlot(null);
      resetForm();
      fetchSlots();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save timetable slot');
    }
  };

  const handleEdit = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setFormData({
      schoolId: '',
      classId: slot.classId,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable slot?')) return;
    try {
      await timetableSlotsAPI.delete(id);
      fetchSlots();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete timetable slot');
    }
  };

  const resetForm = () => {
    // Get schoolId from localStorage
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const schoolId = userStr ? JSON.parse(userStr).schoolId || '' : '';
    
    setFormData({
      schoolId,
      classId: '',
      subjectId: '',
      teacherId: '',
      dayOfWeek: 1,
      startTime: '',
      endTime: '',
      room: '',
    });
  };

  const getDayLabel = (day: number) => {
    return DAYS.find(d => d.value === day)?.label || '';
  };

  const filteredSlots = slots.filter(slot => {
    if (selectedClass && slot.classId !== selectedClass) return false;
    if (selectedDay && slot.dayOfWeek !== parseInt(selectedDay)) return false;
    return true;
  });

  // Group slots by day for display
  const slotsByDay = DAYS.reduce((acc, day) => {
    acc[day.value] = filteredSlots
      .filter(slot => slot.dayOfWeek === day.value)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<number, TimetableSlot[]>);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Timetable Management</h1>
        <button
          onClick={() => {
            setEditingSlot(null);
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Timetable Slot
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-row flex-wrap items-center gap-2 mb-6">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border rounded px-3 py-2 w-full sm:w-auto"
        >
          <option value="">All Classes</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.name} - {cls.section}
            </option>
          ))}
        </select>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="border rounded px-3 py-2 w-full sm:w-auto"
        >
          <option value="">All Days</option>
          {DAYS.map(day => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
        <button
          onClick={fetchSlots}
          className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200 w-full sm:w-auto"
        >
          Filter
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingSlot ? 'Edit Timetable Slot' : 'Add Timetable Slot'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Class</label>
                  <select
                    required
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} - {cls.section}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <select
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Teacher ID</label>
                  <input
                    type="text"
                    required
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter teacher user ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Day</label>
                  <select
                    required
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {DAYS.map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <TimePicker value={formData.startTime} onChange={(time) => setFormData({ ...formData, startTime: time })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <TimePicker value={formData.endTime} onChange={(time) => setFormData({ ...formData, endTime: time })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Room</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Room number"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSlot(null);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingSlot ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timetable View - Week View */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-2">
          {DAYS.map(day => (
            <div key={day.value} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-2 font-medium text-center">
                {day.label}
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {slotsByDay[day.value]?.map(slot => (
                  <div
                    key={slot.id}
                    className="bg-blue-50 border border-blue-200 rounded p-2 text-sm"
                  >
                    <div className="font-medium">{slot.subject?.name || 'Subject'}</div>
                    <div className="text-gray-600 text-xs">
                      {slot.startTime} - {slot.endTime}
                    </div>
                    {slot.room && (
                      <div className="text-gray-500 text-xs">Room: {slot.room}</div>
                    )}
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => handleEdit(slot)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {(!slotsByDay[day.value] || slotsByDay[day.value].length === 0) && (
                  <div className="text-gray-400 text-sm text-center py-4">
                    No classes
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
