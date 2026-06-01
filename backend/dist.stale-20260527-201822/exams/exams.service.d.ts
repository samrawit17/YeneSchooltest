import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto, UpdateExamDto, BulkExamResultDto, GetExamsFilterDto } from './dto/exams.dto';
export declare class ExamsService {
    private prisma;
    constructor(prisma: PrismaService);
    createExam(schoolId: string, dto: CreateExamDto): Promise<{
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
    getExams(schoolId: string, query: GetExamsFilterDto): Promise<({
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
    getExamById(schoolId: string, examId: string): Promise<{
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
            remarks: string | null;
            isAbsent: boolean;
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
    updateExam(schoolId: string, examId: string, dto: UpdateExamDto): Promise<{
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
    deleteExam(schoolId: string, examId: string): Promise<{
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
    getStudentResults(studentId: string, schoolId: string): Promise<({
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
        remarks: string | null;
        isAbsent: boolean;
        marks: number;
        examId: string;
    })[]>;
    getFormData(schoolId: string, academicYearId?: string): Promise<{
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
