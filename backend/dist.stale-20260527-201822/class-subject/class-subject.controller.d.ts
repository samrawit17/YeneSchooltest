import { ClassSubjectService } from './class-subject.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
export declare class ClassSubjectController {
    private readonly classSubjectService;
    constructor(classSubjectService: ClassSubjectService);
    create(data: CreateClassSubjectDto, req: any): Promise<{
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
    bulkAssign(data: BulkAssignDto, req: any): Promise<{
        success: boolean;
        count: number;
        message: string;
    }>;
    findAll(req: any, academicYearId?: string): Promise<({
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
    getMatrix(req: any, academicYearId: string): Promise<{
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
    findByClass(classId: string, req: any, sectionId?: string): Promise<({
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
    findByTeacher(teacherId: string, req: any, academicYearId?: string): Promise<{
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
    findOne(id: string, req: any): Promise<{
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
    update(id: string, data: UpdateClassSubjectDto, req: any): Promise<{
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
    delete(id: string, req: any): Promise<{
        academicYear: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }>;
}
