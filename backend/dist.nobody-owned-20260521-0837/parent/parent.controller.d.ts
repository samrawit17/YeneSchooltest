import { ParentService } from './parent.service';
import { CreateParentDto, UpdateParentDto, LinkParentToStudentDto, CreateParentAndLinkDto } from './dto/parent.dto';
export declare class ParentController {
    private readonly parentService;
    constructor(parentService: ParentService);
    getMyProfile(req: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
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
    getParents(req: any, search?: string, page?: string, limit?: string): Promise<{
        total: number;
        data: ({
            user: {
                id: string;
                name: string;
                username: string | null;
                email: string | null;
                phone: string | null;
                isActive: boolean;
                avatarUrl: string | null;
            };
            children: ({
                student: {
                    user: {
                        name: string;
                    };
                    section: string | null;
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
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            address: string | null;
            userId: string;
            occupation: string | null;
        })[];
        page: number;
        limit: number;
    }>;
    getParentById(parentId: string, req: any): Promise<{
        user: {
            id: string;
            name: string;
            username: string | null;
            email: string | null;
            phone: string | null;
            isActive: boolean;
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
                academicYear: string | null;
                section: string | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                phone: string | null;
                address: string | null;
                documents: string | null;
                userId: string;
                studentId: string;
                studentCode: string;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    updateParent(parentId: string, updateDto: UpdateParentDto, req: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
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
