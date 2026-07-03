import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto, UpdateExamDto, BulkExamResultDto, GetExamsFilterDto } from './dto/exams.dto';
import { EventBusService } from '../core/events/event-bus.service';
export declare class ExamsService {
    private prisma;
    private eventBus;
    constructor(prisma: PrismaService, eventBus: EventBusService);
    createExam(schoolId: string, dto: CreateExamDto): Promise<{
        id: string;
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        type: import("@prisma/client").$Enums.ExamType;
        title: string;
        date: Date;
        subjectId: string;
        maxMarks: number;
        weightage: number;
        published: boolean;
    }>;
    getExams(schoolId: string, query: GetExamsFilterDto): Promise<({
        class: {
            name: string;
            grade: number | null;
            academicYearId: string;
        };
        section: {
            name: string;
        } | null;
        subject: {
            name: string;
        };
    } & {
        id: string;
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        type: import("@prisma/client").$Enums.ExamType;
        title: string;
        date: Date;
        subjectId: string;
        maxMarks: number;
        weightage: number;
        published: boolean;
    })[]>;
    getExamById(schoolId: string, examId: string): Promise<({
        class: {
            name: string;
            grade: number | null;
        };
        section: {
            name: string;
        } | null;
        subject: {
            name: string;
        };
        results: ({
            student: {
                id: string;
                name: string;
                studentProfile: {
                    rollNumber: string | null;
                } | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            grade: string | null;
            studentId: string;
            isAbsent: boolean;
            remarks: string | null;
            marks: number;
            examId: string;
        })[];
    } & {
        id: string;
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        type: import("@prisma/client").$Enums.ExamType;
        title: string;
        date: Date;
        subjectId: string;
        maxMarks: number;
        weightage: number;
        published: boolean;
    }) | null>;
    updateExam(schoolId: string, examId: string, dto: UpdateExamDto): Promise<{
        id: string;
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        type: import("@prisma/client").$Enums.ExamType;
        title: string;
        date: Date;
        subjectId: string;
        maxMarks: number;
        weightage: number;
        published: boolean;
    }>;
    deleteExam(schoolId: string, examId: string): Promise<{
        id: string;
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        type: import("@prisma/client").$Enums.ExamType;
        title: string;
        date: Date;
        subjectId: string;
        maxMarks: number;
        weightage: number;
        published: boolean;
    }>;
    getTeacherExams(teacherId: string, schoolId: string, filters?: {
        academicYearId?: string;
        termId?: string;
    }): Promise<{
        id: string;
        title: string;
        subject: string;
        subjectId: string;
        classId: string;
        sectionId: string | null;
        academicYearId: string;
        className: string;
        sectionName: string | null;
        examDate: string;
        startTime: string;
        endTime: string;
        status: string;
        type: import("@prisma/client").$Enums.ExamType;
        totalMarks: number;
        description: string | null;
    }[]>;
    enterExamResults(userId: string, schoolId: string, examId: string, dto: BulkExamResultDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getStudentExams(studentId: string, schoolId: string): Promise<({
        subject: {
            name: string;
        };
    } & {
        id: string;
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        type: import("@prisma/client").$Enums.ExamType;
        title: string;
        date: Date;
        subjectId: string;
        maxMarks: number;
        weightage: number;
        published: boolean;
    })[]>;
    getStudentResults(studentId: string, schoolId: string): Promise<({
        exam: {
            subject: {
                name: string;
            };
        } & {
            id: string;
            description: string | null;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string | null;
            type: import("@prisma/client").$Enums.ExamType;
            title: string;
            date: Date;
            subjectId: string;
            maxMarks: number;
            weightage: number;
            published: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        grade: string | null;
        studentId: string;
        isAbsent: boolean;
        remarks: string | null;
        marks: number;
        examId: string;
    })[]>;
    getFormData(schoolId: string, academicYearId?: string): Promise<{
        classes: {
            id: string;
            name: string;
            section: string;
            grade: number | null;
        }[];
        subjects: {
            id: string;
            name: string;
            code: string | null;
        }[];
        sections: {
            id: string;
            name: string;
            class: {
                name: string;
                grade: number | null;
            };
            classId: string;
        }[];
    }>;
    publishTermResults(schoolId: string, body: {
        academicYear: string;
        termId: string;
        classId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyParentChild(parentId: string, childId: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        emergencyContact: boolean;
        parentId: string;
        relation: string;
        isVerified: boolean;
        isPrimary: boolean;
    }>;
}
