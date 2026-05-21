export declare class CreateTimetableSlotDto {
    schoolId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
    teacherId?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
    academicYearId?: string;
}
