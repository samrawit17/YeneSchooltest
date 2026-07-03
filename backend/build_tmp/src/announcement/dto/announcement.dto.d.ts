export declare class CreateAnnouncementDto {
    title: string;
    content: string;
    visibleTo?: string[];
    isPublic?: boolean;
    startDate: string;
    endDate?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    location?: string;
    academicYearId?: string;
    isPinned?: boolean;
}
export declare class UpdateAnnouncementDto {
    title?: string;
    content?: string;
    visibleTo?: string[];
    isPublic?: boolean;
    startDate?: string;
    endDate?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    location?: string;
    academicYearId?: string;
    isPinned?: boolean;
}
