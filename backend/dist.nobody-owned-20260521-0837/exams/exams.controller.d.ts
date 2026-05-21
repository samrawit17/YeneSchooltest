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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        title: string;
        type: import("@prisma/client").$Enums.ExamType;
        description: string | null;
        subjectId: string;
        date: Date;
        maxMarks: number;
        weightage: number;
        published: boolean;
    }>;
    getExams(req: AuthRequest, query: GetExamsFilterDto): Promise<({
        class: {
            grade: number | null;
            name: string;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        title: string;
        type: import("@prisma/client").$Enums.ExamType;
        description: string | null;
        subjectId: string;
        date: Date;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        title: string;
        type: import("@prisma/client").$Enums.ExamType;
        description: string | null;
        subjectId: string;
        date: Date;
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
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string | null;
            title: string;
            type: import("@prisma/client").$Enums.ExamType;
            description: string | null;
            subjectId: string;
            date: Date;
            maxMarks: number;
            weightage: number;
            published: boolean;
        };
    } & {
        grade: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        title: string;
        type: import("@prisma/client").$Enums.ExamType;
        description: string | null;
        subjectId: string;
        date: Date;
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
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string | null;
            title: string;
            type: import("@prisma/client").$Enums.ExamType;
            description: string | null;
            subjectId: string;
            date: Date;
            maxMarks: number;
            weightage: number;
            published: boolean;
        };
    } & {
        grade: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        isAbsent: boolean;
        remarks: string | null;
        marks: number;
        examId: string;
    })[]>;
    getAssessmentFormData(req: AuthRequest, query: any): Promise<{
        classes: {
            section: string;
            grade: number | null;
            id: string;
            name: string;
        }[];
        subjects: {
            id: string;
            name: string;
            code: string | null;
        }[];
        sections: {
            class: {
                grade: number | null;
                name: string;
            };
            id: string;
            name: string;
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
    getExamById(req: AuthRequest, id: string): Promise<{
        class: {
            grade: number | null;
            name: string;
        };
        section: {
            name: string;
        } | null;
        subject: {
            name: string;
        };
        results: ({
            student: {
                studentProfile: {
                    rollNumber: string | null;
                } | null;
                id: string;
                name: string;
            };
        } & {
            grade: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            isAbsent: boolean;
            remarks: string | null;
            marks: number;
            examId: string;
        })[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        title: string;
        type: import("@prisma/client").$Enums.ExamType;
        description: string | null;
        subjectId: string;
        date: Date;
        maxMarks: number;
        weightage: number;
        published: boolean;
    }>;
    updateExam(req: AuthRequest, id: string, dto: UpdateExamDto): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        title: string;
        type: import("@prisma/client").$Enums.ExamType;
        description: string | null;
        subjectId: string;
        date: Date;
        maxMarks: number;
        weightage: number;
        published: boolean;
    }>;
    deleteExam(req: AuthRequest, id: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        title: string;
        type: import("@prisma/client").$Enums.ExamType;
        description: string | null;
        subjectId: string;
        date: Date;
        maxMarks: number;
        weightage: number;
        published: boolean;
    }>;
}
export {};
