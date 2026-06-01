export declare enum CommunicationStatus {
    OPEN = "OPEN",
    ACKNOWLEDGED = "ACKNOWLEDGED",
    CLOSED = "CLOSED"
}
export declare enum CommunicationCategory {
    ACADEMIC = "ACADEMIC",
    ATTENDANCE = "ATTENDANCE",
    DISCIPLINE = "DISCIPLINE",
    HEALTH = "HEALTH",
    GENERAL = "GENERAL"
}
export declare class CreateCommunicationDto {
    studentId: string;
    classId?: string;
    subject: string;
    message: string;
    category?: CommunicationCategory;
}
export declare class CreateCommunicationReplyDto {
    message: string;
}
export declare class UpdateCommunicationStatusDto {
    status: CommunicationStatus;
    notes?: string;
}
export declare class CommunicationQueryDto {
    studentId?: string;
    classId?: string;
    status?: CommunicationStatus;
    category?: CommunicationCategory;
    search?: string;
    createdById?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'status';
    sortOrder?: 'asc' | 'desc';
}
