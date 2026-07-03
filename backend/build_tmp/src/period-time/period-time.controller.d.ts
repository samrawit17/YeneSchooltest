import { PeriodTimeService } from './period-time.service';
import { CreatePeriodTimeDto, UpdatePeriodTimeDto } from './dto/period-time.dto';
export declare class PeriodTimeController {
    private service;
    constructor(service: PeriodTimeService);
    findAll(req: any): Promise<{
        timetableSlotCount: number;
        canDelete: boolean;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }[]>;
    create(req: any, data: CreatePeriodTimeDto): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string;
        endTime: string;
        periodNumber: number;
    }>;
    update(req: any, id: string, data: UpdatePeriodTimeDto): Promise<{
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
