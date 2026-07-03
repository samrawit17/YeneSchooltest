export declare class CreateEventDto {
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    audience?: string[];
    category?: 'ACADEMIC' | 'SPORTS' | 'CULTURAL' | 'HOLIDAY' | 'OTHER';
    color?: string;
}
export declare class UpdateEventDto {
    title?: string;
    description?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    audience?: string[];
    category?: 'ACADEMIC' | 'SPORTS' | 'CULTURAL' | 'HOLIDAY' | 'OTHER';
    color?: string;
}
