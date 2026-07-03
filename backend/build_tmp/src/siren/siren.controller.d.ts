import { SirenService } from './siren.service';
export declare class SirenController {
    private readonly sirenService;
    constructor(sirenService: SirenService);
    getSchedules(req: any): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        ringTime: string;
        daysOfWeek: number[];
    }[]>;
    createSchedule(req: any, data: any): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        ringTime: string;
        daysOfWeek: number[];
    }>;
    updateSchedule(req: any, id: string, data: any): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        ringTime: string;
        daysOfWeek: number[];
    }>;
    deleteSchedule(req: any, id: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        ringTime: string;
        daysOfWeek: number[];
    }>;
    getEvents(req: any, limit?: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        type: string;
        periodNumber: number | null;
        triggerType: string;
        scheduleId: string | null;
        firedAt: Date;
        webhookSent: boolean;
        pushSent: boolean;
    }[]>;
    getHardwareConfig(req: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        webhookUrl: string;
        isEnabled: boolean;
        timeout: number;
    } | null>;
    saveHardwareConfig(req: any, data: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        webhookUrl: string;
        isEnabled: boolean;
        timeout: number;
    }>;
    updateHardwareConfig(req: any, id: string, data: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        webhookUrl: string;
        isEnabled: boolean;
        timeout: number;
    }>;
    testHardware(data: {
        webhookUrl: string;
        timeout: number;
    }): Promise<{
        success: boolean;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
    }>;
    manualTrigger(req: any, data: {
        type: string;
    }): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        type: string;
        periodNumber: number | null;
        triggerType: string;
        scheduleId: string | null;
        firedAt: Date;
        webhookSent: boolean;
        pushSent: boolean;
    }>;
}
