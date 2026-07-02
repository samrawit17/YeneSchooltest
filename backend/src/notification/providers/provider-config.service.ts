import { Injectable, Logger } from '@nestjs/common';
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

const PLATFORM_EMAIL_KEY = 'EMAIL_PROVIDER';
const PLATFORM_SMS_KEY = 'SMS_PROVIDER';
const SCHOOL_IN_APP_ENABLED_KEY = 'IN_APP_NOTIFICATIONS_ENABLED';
const SCHOOL_EMAIL_ENABLED_KEY = 'EMAIL_NOTIFICATIONS_ENABLED';
const SCHOOL_SMS_ENABLED_KEY = 'SMS_NOTIFICATIONS_ENABLED';

@Injectable()
export class ProviderConfigService {
  private readonly logger = new Logger(ProviderConfigService.name);

  constructor(
    private readonly platformSettings: PlatformSettingsService,
    private readonly prisma: PrismaService,
  ) {}

  async getEmailConfig(schoolId?: string): Promise<EmailProviderConfig> {
    const platform = await this.platformSettings.getSetting(PLATFORM_EMAIL_KEY) as EmailProviderConfig | null;

    if (schoolId) {
      const enabled = await this.getSchoolSettingRaw(schoolId, SCHOOL_EMAIL_ENABLED_KEY);
      if (!enabled || enabled === false || enabled === 'false') {
        return { provider: 'dummy' };
      }
    }

    return platform || { provider: 'dummy' };
  }

  async getSMSConfig(schoolId?: string): Promise<SMSProviderConfig> {
    const platform = await this.platformSettings.getSetting(PLATFORM_SMS_KEY) as SMSProviderConfig | null;

    if (schoolId) {
      const enabled = await this.getSchoolSettingRaw(schoolId, SCHOOL_SMS_ENABLED_KEY);
      if (!enabled || enabled === false || enabled === 'false') {
        return { provider: 'dummy' };
      }
    }

    return platform || { provider: 'dummy' };
  }

  async isInAppEnabled(schoolId: string): Promise<boolean> {
    const enabled = await this.getSchoolSettingRaw(schoolId, SCHOOL_IN_APP_ENABLED_KEY);
    return enabled === null || enabled === true || enabled === 'true';
  }

  async setSchoolInAppEnabled(schoolId: string, enabled: boolean): Promise<void> {
    await this.prisma.schoolSetting.upsert({
      where: { schoolId_key: { schoolId, key: SCHOOL_IN_APP_ENABLED_KEY } },
      update: { value: JSON.stringify(enabled) },
      create: { schoolId, key: SCHOOL_IN_APP_ENABLED_KEY, value: JSON.stringify(enabled) },
    });
  }

  async setSchoolEmailEnabled(schoolId: string, enabled: boolean): Promise<void> {
    await this.prisma.schoolSetting.upsert({
      where: { schoolId_key: { schoolId, key: SCHOOL_EMAIL_ENABLED_KEY } },
      update: { value: JSON.stringify(enabled) },
      create: { schoolId, key: SCHOOL_EMAIL_ENABLED_KEY, value: JSON.stringify(enabled) },
    });
  }

  async setSchoolSMSEnabled(schoolId: string, enabled: boolean): Promise<void> {
    await this.prisma.schoolSetting.upsert({
      where: { schoolId_key: { schoolId, key: SCHOOL_SMS_ENABLED_KEY } },
      update: { value: JSON.stringify(enabled) },
      create: { schoolId, key: SCHOOL_SMS_ENABLED_KEY, value: JSON.stringify(enabled) },
    });
  }

  private async getSchoolSettingRaw(schoolId: string, key: string): Promise<unknown> {
    const row = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key } },
    });
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }
}
