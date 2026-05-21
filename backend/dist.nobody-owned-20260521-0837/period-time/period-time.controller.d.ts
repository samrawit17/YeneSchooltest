import { PeriodTimeService } from './period-time.service';
export declare class PeriodTimeController {
    private service;
    constructor(service: PeriodTimeService);
    findAll(req: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }[]>;
    create(req: any, data: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }>;
    update(req: any, id: string, data: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }>;
    delete(req: any, id: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }>;
}
