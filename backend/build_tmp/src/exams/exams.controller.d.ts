import { ExamsService } from './exams.service';
import { CreateExamDto, UpdateExamDto, BulkExamResultDto, GetExamsFilterDto } from './dto/exams.dto';
interface AuthRequest {
    user: {
        id: string;
        role: string;
        schoolId: string;
    };
}
export declare class ExamsController {
    private readonly examsService;
    constructor(examsService: ExamsService);
    createExam(req: AuthRequest, dto: CreateExamDto): Promise<{
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
    getExams(req: AuthRequest, query: GetExamsFilterDto): Promise<({
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
    getTeacherExams(req: AuthRequest, academicYearId?: string, termId?: string): Promise<{
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
    getMyUpcomingExams(req: AuthRequest): Promise<({
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
    getMyResults(req: AuthRequest): Promise<({
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
    getChildUpcomingExams(req: AuthRequest, childId: string): Promise<({
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
    getChildResults(req: AuthRequest, childId: string): Promise<({
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
    getAssessmentFormData(req: AuthRequest, query: any): Promise<{
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
    publishTermResults(req: AuthRequest, body: {
        academicYear: string;
        termId: string;
        classId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    enterExamResults(req: AuthRequest, examId: string, dto: BulkExamResultDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getExamById(req: AuthRequest, id: string): Promise<({
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
    updateExam(req: AuthRequest, id: string, dto: UpdateExamDto): Promise<{
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
    deleteExam(req: AuthRequest, id: string): Promise<{
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
}
export {};
