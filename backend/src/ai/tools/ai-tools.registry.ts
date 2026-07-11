export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export const AI_TOOLS: ToolDefinition[] = [
  {
    name: 'createLesson',
    description: 'Create a new lesson plan. Requires TEACHER or ADMIN role.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Lesson title' },
        lessonContent: { type: 'string', description: 'The lesson content / body' },
        subjectId: { type: 'string', description: 'Subject ID to assign the lesson to' },
        section: { type: 'string', description: 'Section name or ID' },
        grade: { type: 'string', description: 'Grade level (e.g. "9", "10")' },
        lessonDate: { type: 'string', description: 'ISO date string for the lesson date' },
        periodNumber: { type: 'string', description: 'Period number (1-12)' },
        academicYearId: { type: 'string', description: 'Active academic year ID' },
        objective: { type: 'string', description: 'Lesson objective' },
        topicName: { type: 'string', description: 'Topic name for Ethiopian curriculum' },
      },
      required: ['title', 'subjectId', 'section', 'grade', 'lessonDate', 'periodNumber', 'academicYearId'],
    },
  },
  {
    name: 'recordDiscipline',
    description: 'Record a discipline incident for a student. Requires ADMIN, IT_MANAGER, REGISTRAR, or TEACHER role.',
    parameters: {
      type: 'object',
      properties: {
        studentId: { type: 'string', description: 'Student ID' },
        title: { type: 'string', description: 'Incident title' },
        description: { type: 'string', description: 'Detailed description of the incident' },
        incidentDate: { type: 'string', description: 'ISO date of the incident' },
        severity: { type: 'string', description: 'Severity level', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        actionTaken: { type: 'string', description: 'Action taken' },
      },
      required: ['studentId', 'title', 'description', 'incidentDate'],
    },
  },
  {
    name: 'createAnnouncement',
    description: 'Create a school announcement. Requires ADMIN, IT_MANAGER, or REGISTRAR role.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Announcement title' },
        content: { type: 'string', description: 'Announcement body content' },
        visibleTo: { type: 'string', description: 'Comma-separated list of roles: TEACHER,STUDENT,PARENT' },
        startDate: { type: 'string', description: 'ISO date for when the announcement starts' },
        endDate: { type: 'string', description: 'ISO date for when the announcement ends' },
        priority: { type: 'string', description: 'Priority level', enum: ['HIGH', 'MEDIUM', 'LOW'] },
      },
      required: ['title', 'content', 'visibleTo', 'startDate'],
    },
  },
  {
    name: 'createEvent',
    description: 'Create a school calendar event. Requires ADMIN, IT_MANAGER, or REGISTRAR role.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        description: { type: 'string', description: 'Event description' },
        endDate: { type: 'string', description: 'ISO end date/time' },
        location: { type: 'string', description: 'Event location' },
        category: { type: 'string', description: 'Event category', enum: ['ACADEMIC', 'SPORTS', 'CULTURAL', 'HOLIDAY', 'OTHER'] },
      },
      required: ['title', 'startDate'],
    },
  },
  {
    name: 'sendCommunication',
    description: 'Send a message to a parent or teacher via Communication Book.',
    parameters: {
      type: 'object',
      properties: {
        studentId: { type: 'string', description: 'Student ID related to this communication' },
        subject: { type: 'string', description: 'Message subject (max 255 chars)' },
        message: { type: 'string', description: 'Message body (max 5000 chars)' },
        category: { type: 'string', description: 'Category', enum: ['ACADEMIC', 'ATTENDANCE', 'DISCIPLINE', 'HEALTH', 'GENERAL'] },
      },
      required: ['studentId', 'subject', 'message'],
    },
  },
];
