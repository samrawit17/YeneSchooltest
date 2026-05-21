export declare class CreateAnnouncementDto {
    title: string;
    content: string;
    visibleTo?: string[];
    startDate: string;
    endDate?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}
export declare class UpdateAnnouncementDto {
    title?: string;
    content?: string;
    visibleTo?: string[];
    startDate?: string;
    endDate?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}
