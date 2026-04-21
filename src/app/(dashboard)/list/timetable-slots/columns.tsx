import React from 'react';

export interface TimetableSlot {
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
  teacher?: { id: string; name: string; email?: string };
}

export interface TableColumn {
  key: keyof TimetableSlot | 'className' | 'subjectName' | 'teacherName';
  label: string;
  render?: (row: TimetableSlot) => React.ReactNode;
}

export const timetableSlotColumns: TableColumn[] = [
  {
    key: 'dayOfWeek',
    label: 'Day',
    render: (row) => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return days[row.dayOfWeek - 1] || 'Unknown';
    },
  },
  {
    key: 'startTime',
    label: 'Start Time',
  },
  {
    key: 'endTime',
    label: 'End Time',
  },
  {
    key: 'className',
    label: 'Class',
    render: (row) => {
      return row.class ? `${row.class.name} - ${row.class.section}` : 'N/A';
    },
  },
  {
    key: 'subjectName',
    label: 'Subject',
    render: (row) => {
      return row.subject?.name || 'N/A';
    },
  },
  {
    key: 'teacherName',
    label: 'Teacher',
    render: (row) => {
      return row.teacher?.name || 'N/A';
    },
  },
  {
    key: 'room',
    label: 'Room',
  },
];
