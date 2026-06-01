import { PrismaService } from '../prisma/prisma.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
export declare class ClassSubjectService {
    private prisma;
    constructor(prisma: PrismaService);
    private normalizeTeacherId;
    private getNextSectionName;
    private ensureAssignmentSection;
    private syncTeacherSubjectAssignment;
    create(data: CreateClassSubjectDto, schoolId: string): Promise<{
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        academicYear: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }>;
    findAll(schoolId: string, academicYearId?: string): Promise<({
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        academicYear: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    })[]>;
    findByClass(classId: string, schoolId: string, sectionId?: string): Promise<({
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        academicYear: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    })[]>;
    findByTeacher(teacherId: string, schoolId: string, academicYearId?: string): Promise<{
        _count: {
            students: number;
        };
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        academicYearRelation: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            startDate: Date;
            endDate: Date;
            ethiopianYear: number | null;
            curriculumType: import("@prisma/client").$Enums.CurriculumType;
            calendarType: import("@prisma/client").$Enums.CalendarType;
        };
        academicYear: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }[]>;
    findOne(id: string, schoolId: string): Promise<{
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        academicYear: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }>;
    update(id: string, data: UpdateClassSubjectDto, schoolId: string): Promise<{
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        academicYear: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }>;
    delete(id: string, schoolId: string): Promise<{
        academicYear: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }>;
    bulkAssign(data: BulkAssignDto, schoolId: string): Promise<{
        success: boolean;
        count: number;
        message: string;
    }>;
    getMatrixData(schoolId: string, academicYearId: string): Promise<{
        sections: (({
            class: {
                section: string;
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            homeroomTeacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        }) | {
            id: string;
            name: string;
            class: {
                homeroomTeacher: {
                    id: string;
                    name: string;
                } | null;
            } & {
                section: string;
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            classId: string;
            capacity: number;
            roomNumber: null;
            homeroomTeacher: null;
            isVirtual: boolean;
        })[];
        subjects: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        }[];
        assignments: ({
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            academicYear: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            subjectId: string;
            teacherId: string | null;
        })[];
    }>;
}
