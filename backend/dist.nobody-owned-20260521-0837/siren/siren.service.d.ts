import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
export declare class SirenService {
    private prisma;
    private notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    evaluateSchedules(): Promise<void>;
    private evaluateDynamicSirens;
    private evaluateStaticSchedules;
    getSchedules(schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        type: string;
        ringTime: string;
        daysOfWeek: number[];
    }[]>;
    createSchedule(schoolId: string, data: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        type: string;
        ringTime: string;
        daysOfWeek: number[];
    }>;
    updateSchedule(schoolId: string, id: string, data: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        type: string;
        ringTime: string;
        daysOfWeek: number[];
    }>;
    deleteSchedule(schoolId: string, id: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        type: string;
        ringTime: string;
        daysOfWeek: number[];
    }>;
    getEvents(schoolId: string, limit: number): Promise<{
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
    getHardwareConfig(schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        webhookUrl: string;
        isEnabled: boolean;
        timeout: number;
    } | null>;
    saveHardwareConfig(schoolId: string, data: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        webhookUrl: string;
        isEnabled: boolean;
        timeout: number;
    }>;
    updateHardwareConfig(schoolId: string, id: string, data: any): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        webhookUrl: string;
        isEnabled: boolean;
        timeout: number;
    }>;
    manualTrigger(schoolId: string, type: string): Promise<{
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
    testWebhook(webhookUrl: string, timeout: number): Promise<{
        success: boolean;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
    }>;
    private fireSiren;
    private triggerHardware;
    private toHHMM;
}
