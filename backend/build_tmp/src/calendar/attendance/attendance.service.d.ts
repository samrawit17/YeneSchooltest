import { PrismaService } from '../../prisma/prisma.service';
import { SchoolSettingsService } from '../../school-settings/school-settings.service';
import { OverrideAttendanceDto, AttendanceQueryDto } from './dto';
import { RequestUser, AttendanceRecordInput } from './interfaces/attendance.interfaces';
import { EventBusService } from '../../core/events/event-bus.service';
export declare class AttendanceService {
    private prisma;
    private schoolSettings;
    private eventBus;
    constructor(prisma: PrismaService, schoolSettings: SchoolSettingsService, eventBus: EventBusService);
    private isAdmin;
    private isWeekend;
    private isSameCalendarDay;
    private resolveParentChildStudentId;
    private resolveReadableStudentId;
    private getDateString;
    private parseDateOnlyAsLocalDay;
    private getLocalDayRange;
    private getDateInfo;
    private parseHomeroomSlotId;
    private findAcademicYearByDate;
    private getSchoolAttendanceCutoff;
    private enforceTeacherAttendanceWindow;
    getTodayTimetable(user: RequestUser, date?: string, academicYearId?: string): Promise<{
        dateInfo: {
            gregorian: string;
            ethiopian: string;
            ethiopianYear: number;
            ethiopianMonth: number;
            ethiopianDay: number;
            ethiopianMonthName: string;
        };
        slots: {
            session: ({
                attendanceRecords: ({
                    student: {
                        studentProfile: {
                            id: string;
                            phone: string | null;
                            schoolId: string;
                            createdAt: Date;
                            updatedAt: Date;
                            deletedAt: Date | null;
                            deletedById: string | null;
                            documents: string | null;
                            academicYear: string | null;
                            section: string | null;
                            address: string | null;
                            userId: string;
                            studentId: string;
                            stream: string | null;
                            studentCode: string;
                            faydaNumber: string | null;
                            enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                            className: string | null;
                            rollNumber: string | null;
                            gender: string | null;
                            motherName: string | null;
                            motherPhone: string | null;
                            emergencyContact: string | null;
                            medicalInfo: string | null;
                            nationality: string | null;
                        } | null;
                    } & {
                        id: string;
                        name: string;
                        role: import("@prisma/client").$Enums.Role;
                        email: string | null;
                        username: string | null;
                        password: string;
                        isActive: boolean;
                        phone: string | null;
                        avatarUrl: string | null;
                        theme: import("@prisma/client").$Enums.ThemePreference;
                        language: string;
                        lastLoginAt: Date | null;
                        schoolId: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        deletedAt: Date | null;
                        deletedById: string | null;
                        mustChangePassword: boolean;
                    };
                } & {
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    studentId: string;
                    status: import("@prisma/client").$Enums.AttendanceRecordStatus;
                    remark: string | null;
                    attendanceSessionId: string;
                    overriddenById: string | null;
                    overriddenAt: Date | null;
                    originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
                    overrideReason: string | null;
                })[];
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                classId: string | null;
                status: import("@prisma/client").$Enums.SessionStatus;
                date: Date;
                takenById: string;
                timetableSlotId: string | null;
                submittedAt: Date | null;
            }) | null;
            id: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: null;
            isHomeroom: boolean;
            class: {
                id: string;
                name: string;
                grade: number | null;
            };
            section: {
                id: string;
                name: string;
            };
            subject: {
                id: string;
                name: string;
                code: string;
            };
            teacher: {
                id: string;
                name: string;
            };
        }[];
    }>;
    getSession(sessionId: string, user?: RequestUser): Promise<{
        dateInfo: {
            gregorian: string;
            ethiopian: string;
            ethiopianYear: number;
            ethiopianMonth: number;
            ethiopianDay: number;
            ethiopianMonthName: string;
        };
        attendanceRecords: ({
            student: {
                studentProfile: {
                    id: string;
                    phone: string | null;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    deletedById: string | null;
                    documents: string | null;
                    academicYear: string | null;
                    section: string | null;
                    address: string | null;
                    userId: string;
                    studentId: string;
                    stream: string | null;
                    studentCode: string;
                    faydaNumber: string | null;
                    enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                    className: string | null;
                    rollNumber: string | null;
                    gender: string | null;
                    motherName: string | null;
                    motherPhone: string | null;
                    emergencyContact: string | null;
                    medicalInfo: string | null;
                    nationality: string | null;
                } | null;
            } & {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
                email: string | null;
                username: string | null;
                password: string;
                isActive: boolean;
                phone: string | null;
                avatarUrl: string | null;
                theme: import("@prisma/client").$Enums.ThemePreference;
                language: string;
                lastLoginAt: Date | null;
                schoolId: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                deletedById: string | null;
                mustChangePassword: boolean;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
        timetableSlot: ({
            class: {
                id: string;
                name: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                section: string;
                grade: number | null;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                stream: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                grade: number | null;
                code: string | null;
                academicYearId: string | null;
                credits: number | null;
                colorCode: string | null;
            };
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        date: Date;
        takenById: string;
        timetableSlotId: string | null;
        submittedAt: Date | null;
    }>;
    getStudentsForAttendance(user: RequestUser, className?: string, section?: string, date?: string, classId?: string, sectionId?: string, academicYearId?: string): Promise<{
        id: string;
        userId: string;
        name: string;
        gender: string;
        studentCode: string;
        rollNumber: string;
        className: string;
        section: string;
    }[]>;
    openAttendanceSession(user: RequestUser, slotId: string, date?: string): Promise<{
        dateInfo: {
            gregorian: string;
            ethiopian: string;
            ethiopianYear: number;
            ethiopianMonth: number;
            ethiopianDay: number;
            ethiopianMonthName: string;
        };
        attendanceRecords: ({
            student: {
                studentProfile: {
                    id: string;
                    phone: string | null;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    deletedById: string | null;
                    documents: string | null;
                    academicYear: string | null;
                    section: string | null;
                    address: string | null;
                    userId: string;
                    studentId: string;
                    stream: string | null;
                    studentCode: string;
                    faydaNumber: string | null;
                    enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                    className: string | null;
                    rollNumber: string | null;
                    gender: string | null;
                    motherName: string | null;
                    motherPhone: string | null;
                    emergencyContact: string | null;
                    medicalInfo: string | null;
                    nationality: string | null;
                } | null;
            } & {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
                email: string | null;
                username: string | null;
                password: string;
                isActive: boolean;
                phone: string | null;
                avatarUrl: string | null;
                theme: import("@prisma/client").$Enums.ThemePreference;
                language: string;
                lastLoginAt: Date | null;
                schoolId: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                deletedById: string | null;
                mustChangePassword: boolean;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
        timetableSlot: ({
            class: {
                id: string;
                name: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                section: string;
                grade: number | null;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                stream: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                grade: number | null;
                code: string | null;
                academicYearId: string | null;
                credits: number | null;
                colorCode: string | null;
            };
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        date: Date;
        takenById: string;
        timetableSlotId: string | null;
        submittedAt: Date | null;
    }>;
    getEligibleStudents(user: RequestUser, sessionId: string): Promise<{
        dateInfo: {
            gregorian: string;
            ethiopian: string;
            ethiopianYear: number;
            ethiopianMonth: number;
            ethiopianDay: number;
            ethiopianMonthName: string;
        };
        students: {
            studentId: any;
            studentName: any;
            studentCode: any;
            rollNumber: any;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            remark: string | null;
            recordId: string | null;
        }[];
    }>;
    private isHomeroomTeacher;
    bulkMarkAttendance(user: RequestUser, sessionId: string, records: AttendanceRecordInput[]): Promise<{
        success: boolean;
        message: string;
    }>;
    submitSession(user: RequestUser, sessionId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        date: Date;
        takenById: string;
        timetableSlotId: string | null;
        submittedAt: Date | null;
    }>;
    getTodayPendingSessions(user: RequestUser): Promise<({
        timetableSlot: ({
            class: {
                id: string;
                name: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                section: string;
                grade: number | null;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                stream: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                grade: number | null;
                code: string | null;
                academicYearId: string | null;
                credits: number | null;
                colorCode: string | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        date: Date;
        takenById: string;
        timetableSlotId: string | null;
        submittedAt: Date | null;
    })[]>;
    getMyAttendance(user: RequestUser, query: AttendanceQueryDto): Promise<({
        session: {
            timetableSlot: ({
                class: {
                    id: string;
                    name: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    section: string;
                    grade: number | null;
                    academicYearId: string;
                    gradeId: string | null;
                    homeroomTeacherId: string | null;
                };
                section: {
                    id: string;
                    name: string;
                    classId: string;
                    homeroomTeacherId: string | null;
                    stream: string | null;
                    capacity: number;
                    roomNumber: string | null;
                    isExamRoom: boolean;
                };
                subject: {
                    id: string;
                    name: string;
                    description: string | null;
                    isActive: boolean;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    grade: number | null;
                    code: string | null;
                    academicYearId: string | null;
                    credits: number | null;
                    colorCode: string | null;
                };
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                classId: string;
                sectionId: string;
                academicYearId: string | null;
                subjectId: string;
                teacherId: string | null;
                dayOfWeek: number;
                startTime: string;
                endTime: string;
                room: string | null;
            }) | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string | null;
            status: import("@prisma/client").$Enums.SessionStatus;
            date: Date;
            takenById: string;
            timetableSlotId: string | null;
            submittedAt: Date | null;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.AttendanceRecordStatus;
        remark: string | null;
        attendanceSessionId: string;
        overriddenById: string | null;
        overriddenAt: Date | null;
        originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
        overrideReason: string | null;
    })[]>;
    getStudentAttendanceSummary(user: RequestUser, studentId: string, startDate?: string, endDate?: string): Promise<{
        studentId: string;
        totalDays: number;
        presentDays: number;
        absentDays: number;
        lateDays: number;
        excusedDays: number;
        attendancePercentage: number;
    }>;
    getStudentAttendance(user: RequestUser, studentId: string, query: AttendanceQueryDto): Promise<{
        records: ({
            session: {
                timetableSlot: ({
                    class: {
                        id: string;
                        name: string;
                        schoolId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        section: string;
                        grade: number | null;
                        academicYearId: string;
                        gradeId: string | null;
                        homeroomTeacherId: string | null;
                    };
                    section: {
                        id: string;
                        name: string;
                        classId: string;
                        homeroomTeacherId: string | null;
                        stream: string | null;
                        capacity: number;
                        roomNumber: string | null;
                        isExamRoom: boolean;
                    };
                    subject: {
                        id: string;
                        name: string;
                        description: string | null;
                        isActive: boolean;
                        schoolId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        grade: number | null;
                        code: string | null;
                        academicYearId: string | null;
                        credits: number | null;
                        colorCode: string | null;
                    };
                    teacher: {
                        id: string;
                        name: string;
                    } | null;
                } & {
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    classId: string;
                    sectionId: string;
                    academicYearId: string | null;
                    subjectId: string;
                    teacherId: string | null;
                    dayOfWeek: number;
                    startTime: string;
                    endTime: string;
                    room: string | null;
                }) | null;
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                classId: string | null;
                status: import("@prisma/client").$Enums.SessionStatus;
                date: Date;
                takenById: string;
                timetableSlotId: string | null;
                submittedAt: Date | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
        student: {
            id: string;
            name: string;
            studentCode: any;
            className: any;
            section: any;
        } | null;
        summary: {
            totalDays: number;
            present: number;
            absent: number;
            late: number;
            excused: number;
            attendancePercentage: number;
        };
    }>;
    getAllSessions(user: RequestUser, query: AttendanceQueryDto): Promise<({
        attendanceRecords: ({
            student: {
                studentProfile: {
                    id: string;
                    phone: string | null;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    deletedById: string | null;
                    documents: string | null;
                    academicYear: string | null;
                    section: string | null;
                    address: string | null;
                    userId: string;
                    studentId: string;
                    stream: string | null;
                    studentCode: string;
                    faydaNumber: string | null;
                    enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                    className: string | null;
                    rollNumber: string | null;
                    gender: string | null;
                    motherName: string | null;
                    motherPhone: string | null;
                    emergencyContact: string | null;
                    medicalInfo: string | null;
                    nationality: string | null;
                } | null;
            } & {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
                email: string | null;
                username: string | null;
                password: string;
                isActive: boolean;
                phone: string | null;
                avatarUrl: string | null;
                theme: import("@prisma/client").$Enums.ThemePreference;
                language: string;
                lastLoginAt: Date | null;
                schoolId: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                deletedById: string | null;
                mustChangePassword: boolean;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
        class: ({} & {
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        }) | null;
        timetableSlot: ({
            class: {
                id: string;
                name: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                section: string;
                grade: number | null;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                stream: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                grade: number | null;
                code: string | null;
                academicYearId: string | null;
                credits: number | null;
                colorCode: string | null;
            };
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
        takenBy: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        date: Date;
        takenById: string;
        timetableSlotId: string | null;
        submittedAt: Date | null;
    })[]>;
    getSummary(user: RequestUser, query: AttendanceQueryDto): Promise<any[]>;
    getAttendanceReport(user: RequestUser, query: AttendanceQueryDto): Promise<({
        student: {
            studentProfile: {
                id: string;
                phone: string | null;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                deletedById: string | null;
                documents: string | null;
                academicYear: string | null;
                section: string | null;
                address: string | null;
                userId: string;
                studentId: string;
                stream: string | null;
                studentCode: string;
                faydaNumber: string | null;
                enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                className: string | null;
                rollNumber: string | null;
                gender: string | null;
                motherName: string | null;
                motherPhone: string | null;
                emergencyContact: string | null;
                medicalInfo: string | null;
                nationality: string | null;
            } | null;
        } & {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            password: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            language: string;
            lastLoginAt: Date | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
            mustChangePassword: boolean;
        };
        session: {
            timetableSlot: ({
                class: {
                    id: string;
                    name: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    section: string;
                    grade: number | null;
                    academicYearId: string;
                    gradeId: string | null;
                    homeroomTeacherId: string | null;
                };
                section: {
                    id: string;
                    name: string;
                    classId: string;
                    homeroomTeacherId: string | null;
                    stream: string | null;
                    capacity: number;
                    roomNumber: string | null;
                    isExamRoom: boolean;
                };
                subject: {
                    id: string;
                    name: string;
                    description: string | null;
                    isActive: boolean;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    grade: number | null;
                    code: string | null;
                    academicYearId: string | null;
                    credits: number | null;
                    colorCode: string | null;
                };
                teacher: {
                    id: string;
                    name: string;
                } | null;
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                classId: string;
                sectionId: string;
                academicYearId: string | null;
                subjectId: string;
                teacherId: string | null;
                dayOfWeek: number;
                startTime: string;
                endTime: string;
                room: string | null;
            }) | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string | null;
            status: import("@prisma/client").$Enums.SessionStatus;
            date: Date;
            takenById: string;
            timetableSlotId: string | null;
            submittedAt: Date | null;
        };
        overriddenBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.AttendanceRecordStatus;
        remark: string | null;
        attendanceSessionId: string;
        overriddenById: string | null;
        overriddenAt: Date | null;
        originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
        overrideReason: string | null;
    })[]>;
    overrideAttendance(user: RequestUser, recordId: string, dto: OverrideAttendanceDto): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.AttendanceRecordStatus;
        remark: string | null;
        attendanceSessionId: string;
        overriddenById: string | null;
        overriddenAt: Date | null;
        originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
        overrideReason: string | null;
    }>;
    getAttendanceByDate(user: RequestUser, date: string): Promise<({
        attendanceRecords: ({
            student: {
                studentProfile: {
                    id: string;
                    phone: string | null;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    deletedById: string | null;
                    documents: string | null;
                    academicYear: string | null;
                    section: string | null;
                    address: string | null;
                    userId: string;
                    studentId: string;
                    stream: string | null;
                    studentCode: string;
                    faydaNumber: string | null;
                    enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                    className: string | null;
                    rollNumber: string | null;
                    gender: string | null;
                    motherName: string | null;
                    motherPhone: string | null;
                    emergencyContact: string | null;
                    medicalInfo: string | null;
                    nationality: string | null;
                } | null;
            } & {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
                email: string | null;
                username: string | null;
                password: string;
                isActive: boolean;
                phone: string | null;
                avatarUrl: string | null;
                theme: import("@prisma/client").$Enums.ThemePreference;
                language: string;
                lastLoginAt: Date | null;
                schoolId: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                deletedById: string | null;
                mustChangePassword: boolean;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
        timetableSlot: ({
            class: {
                id: string;
                name: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                section: string;
                grade: number | null;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                stream: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                grade: number | null;
                code: string | null;
                academicYearId: string | null;
                credits: number | null;
                colorCode: string | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        date: Date;
        takenById: string;
        timetableSlotId: string | null;
        submittedAt: Date | null;
    })[]>;
    getTeacherDashboard(user: RequestUser, academicYearId?: string): Promise<{
        pendingSessions: {
            id: string;
            className: string;
            sectionName: string;
            subjectName: string;
            startTime: string;
            endTime: string;
        }[];
        todaySchedule: {
            id: string;
            className: string;
            sectionName: string;
            subjectName: string;
            startTime: string;
            endTime: string;
            room: string | null;
            isCompleted: boolean;
            isCurrent: boolean;
            canTakeAttendance: boolean;
        }[];
        completedSessions: number;
        notSubmittedSessions: number;
        weeklyStats: {
            date: string;
            percentage: number;
        }[];
    }>;
    getStudentDashboard(user: any): Promise<{
        attendancePercentage: number;
        totalDays: number;
        presentDays: number;
        absentDays: number;
        lateDays: number;
        recentAbsences: {
            date: Date;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            subject: string;
        }[];
    }>;
    getParentDashboard(user: any, studentId: string): Promise<{
        studentName: string | undefined;
        attendancePercentage: number;
        totalDays: number;
        presentDays: number;
        absentDays: number;
        needsAlert: boolean;
        recentAbsences: Date[];
    }>;
    private getMissingAttendanceEntries;
    getMissingClasses(user: any, date: string, grade?: string, section?: string): Promise<{
        id: string;
        name: string;
        grade: number | null;
        section: string;
    }[]>;
    notifyMissing(user: any, date: string, grade?: string, section?: string): Promise<{
        detected: number;
        classes: {
            id: string;
            name: string;
            grade: number | null;
            section: string;
            teacherId: string | null;
            teacherName: string | undefined;
        }[];
    }>;
    getAdminDashboard(user: any, date?: string, startDate?: string, endDate?: string, grade?: string, section?: string, range?: string, academicYearId?: string): Promise<{
        todayStats: {
            totalSessions: number;
            submittedSessions: number;
            notSubmittedSessions: number;
            attendanceRate: number;
            totalStudentsMarked: number;
            presentCount: number;
            absentCount: number;
            lateCount: number;
            excusedCount: number;
        };
        missingAttendance: {
            className: string;
            sectionName: string;
            subjectName: string;
            time: string;
            endTime: string;
        }[];
        recentAbsences: {
            studentName: string;
            studentCode: string | undefined;
            className: string;
            sectionName: string;
        }[];
        weeklyStats: {
            date: string;
            attendanceRate: number;
            presentCount: number;
            totalStudentsMarked: number;
        }[];
    }>;
}
