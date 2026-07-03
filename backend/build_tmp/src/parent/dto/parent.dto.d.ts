export declare class CreateParentDto {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    schoolId?: string;
}
export declare class UpdateParentDto {
    email?: string;
    name?: string;
    phone?: string;
    address?: string;
    occupation?: string;
}
export declare class LinkParentToStudentDto {
    parentProfileId: string;
    studentProfileId: string;
    relation: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
}
export declare class CreateParentAndLinkDto {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    studentProfileId: string;
    relation: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
}
