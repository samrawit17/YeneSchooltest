import { ParentService } from './parent.service';
import { CreateParentDto, UpdateParentDto, LinkParentToStudentDto, CreateParentAndLinkDto } from './dto/parent.dto';
export declare class ParentController {
    private readonly parentService;
    constructor(parentService: ParentService);
    private requireSchoolId;
    getMyProfile(req: any): Promise<{
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    getMyChildren(req: any): Promise<{
        children: any[];
    }>;
    getMyRelatedTeachers(req: any): Promise<{
        teachers: {
            teacherId: string;
            teacherName: string;
            teacherEmail: string | null;
            teacherPhone: string | null;
            studentId: string;
            childName: string;
            className: string | null;
            section: string | null;
            relationType: "HOMEROOM" | "TEACHING";
            subjects: string[];
        }[];
    }>;
    getMyChildById(childId: string, req: any): Promise<any>;
    getParents(req: any, search?: string, page?: string, limit?: string, status?: string, children?: string): Promise<{
        total: number;
        data: ({
            user: {
                id: string;
                name: string;
                email: string | null;
                username: string | null;
                isActive: boolean;
                phone: string | null;
                avatarUrl: string | null;
            };
            children: ({
                student: {
                    user: {
                        id: string;
                        name: string;
                    };
                    section: string | null;
                    studentCode: string;
                    className: string | null;
                };
            } & {
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
            })[];
        } & {
            id: string;
            phone: string | null;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            userId: string;
            occupation: string | null;
        })[];
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getParentById(parentId: string, req: any): Promise<{
        user: {
            id: string;
            name: string;
            email: string | null;
            username: string | null;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            lastLoginAt: Date | null;
        };
        children: ({
            student: {
                user: {
                    id: string;
                    name: string;
                };
            } & {
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
            };
        } & {
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
        })[];
    } & {
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    updateParent(parentId: string, updateDto: UpdateParentDto, req: any): Promise<{
        user: {
            id: string;
            name: string;
            email: string | null;
            username: string | null;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            lastLoginAt: Date | null;
        };
        children: ({
            student: {
                user: {
                    id: string;
                    name: string;
                };
            } & {
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
            };
        } & {
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
        })[];
    } & {
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    createParent(createParentDto: CreateParentDto, req: any): Promise<{
        credentials: {
            username: string;
            temporaryPassword: string;
        };
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    createParentAndLink(createParentAndLinkDto: CreateParentAndLinkDto, req: any): Promise<{
        credentials: {
            username: string;
            temporaryPassword: string;
        };
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    linkParentToStudent(linkDto: LinkParentToStudentDto, req: any): Promise<{
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
    unlinkParentFromStudent(parentId: string, studentId: string, req: any): Promise<{
        success: boolean;
    }>;
}
