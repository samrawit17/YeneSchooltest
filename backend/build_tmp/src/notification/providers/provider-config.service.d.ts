import { PrismaService } from '../../prisma/prisma.service';
import { PlatformSettingsService } from '../../platform-settings/platform-settings.service';
export interface EmailProviderConfig {
    provider: 'smtp' | 'sendgrid' | 'ses' | 'dummy';
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    apiKey?: string;
    fromName?: string;
    fromEmail?: string;
}
export interface SMSProviderConfig {
    provider: 'twilio' | 'africastalking' | 'termii' | 'dummy';
    accountSid?: string;
    authToken?: string;
    apiKey?: string;
    fromNumber?: string;
    senderId?: string;
}
export declare class ProviderConfigService {
    private readonly platformSettings;
    private readonly prisma;
    private readonly logger;
    constructor(platformSettings: PlatformSettingsService, prisma: PrismaService);
    getEmailConfig(schoolId?: string): Promise<EmailProviderConfig>;
    getSMSConfig(schoolId?: string): Promise<SMSProviderConfig>;
    isInAppEnabled(schoolId: string): Promise<boolean>;
    setSchoolInAppEnabled(schoolId: string, enabled: boolean): Promise<void>;
    setSchoolEmailEnabled(schoolId: string, enabled: boolean): Promise<void>;
    setSchoolSMSEnabled(schoolId: string, enabled: boolean): Promise<void>;
    private getSchoolSettingRaw;
}
