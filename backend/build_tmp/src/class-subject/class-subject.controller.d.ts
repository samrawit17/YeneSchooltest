import { ClassSubjectService } from './class-subject.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
export declare class ClassSubjectController {
    private readonly classSubjectService;
    constructor(classSubjectService: ClassSubjectService);
    create(data: CreateClassSubjectDto, req: any): Promise<{
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
    bulkAssign(data: BulkAssignDto, req: any): Promise<{
        success: boolean;
        count: number;
        message: string;
    }>;
    findAll(req: any, academicYearId?: string): Promise<({
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
    getMatrix(req: any, academicYearId: string): Promise<{
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
    findByClass(classId: string, req: any, sectionId?: string): Promise<({
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
    findByTeacher(teacherId: string, req: any, academicYearId?: string): Promise<{
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
    findOne(id: string, req: any): Promise<{
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
    update(id: string, data: UpdateClassSubjectDto, req: any): Promise<{
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
    delete(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string | null;
    }>;
}
