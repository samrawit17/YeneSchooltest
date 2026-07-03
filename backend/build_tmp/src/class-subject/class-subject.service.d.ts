import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
export declare class ClassSubjectService {
    private prisma;
    private eventBus;
    constructor(prisma: PrismaService, eventBus: EventBusService);
    private normalizeTeacherId;
    private getNextSectionName;
    private ensureAssignmentSection;
    private syncTeacherSubjectAssignment;
    create(data: CreateClassSubjectDto, schoolId: string): Promise<{
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
            email: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }>;
    findAll(schoolId: string, academicYearId?: string): Promise<({
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
            email: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
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
            email: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
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
        academicYearRelation: {
            id: string;
            name: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            calendarType: import("@prisma/client").$Enums.CalendarType;
            startDate: Date;
            endDate: Date;
            ethiopianYear: number | null;
            curriculumType: import("@prisma/client").$Enums.CurriculumType;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }[]>;
    findOne(id: string, schoolId: string): Promise<{
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
            email: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }>;
    update(id: string, data: UpdateClassSubjectDto, schoolId: string): Promise<{
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
            email: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }>;
    delete(id: string, schoolId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
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
            homeroomTeacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
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
            classId: string;
            capacity: number;
            roomNumber: null;
            homeroomTeacher: null;
            isVirtual: boolean;
        })[];
        subjects: {
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
        }[];
        assignments: ({
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            academicYear: string;
            classId: string;
            sectionId: string;
            subjectId: string;
            teacherId: string | null;
        })[];
    }>;
}
