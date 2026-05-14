import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { DEFAULT_CACHE_TTL_SECONDS } from '../infrastructure/cache/cache.constants';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  private getSettingCacheKey(key: string) {
    return `platform-settings:key:${key}`;
  }

  private getAllSettingsCacheKey() {
    return 'platform-settings:all';
  }

  private async invalidateCache(...keys: string[]) {
    await this.cacheService.del(
      this.getAllSettingsCacheKey(),
      ...keys.map((key) => this.getSettingCacheKey(key)),
    );
  }

  // Get a single platform setting by key
  async getSetting(key: string) {
    return this.cacheService.getOrSet(
      this.getSettingCacheKey(key),
      DEFAULT_CACHE_TTL_SECONDS,
      async () => {
        const setting = await this.prisma.platformSetting.findUnique({
          where: { key },
        });
        return setting ? this.parseStoredValue(setting.value) : null;
      },
    );
  }

  // Get all platform settings
  async getAllSettings() {
    return this.cacheService.getOrSet(
      this.getAllSettingsCacheKey(),
      DEFAULT_CACHE_TTL_SECONDS,
      async () => {
        const settings = await this.prisma.platformSetting.findMany();
        const result: Record<string, any> = {};
        for (const setting of settings) {
          result[setting.key] = this.parseStoredValue(setting.value);
        }
        return result;
      },
    );
  }

  // Upsert a platform setting
  async setSetting(key: string, value: any) {
    const storedValue = this.serializeValue(value);
    const setting = await this.prisma.platformSetting.upsert({
      where: { key },
      update: { value: storedValue },
      create: { key, value: storedValue },
    });
    await this.invalidateCache(key);
    return {
      ...setting,
      value: this.parseStoredValue(setting.value),
    };
  }

  // Delete a platform setting
  async deleteSetting(key: string) {
    await this.prisma.platformSetting.delete({
      where: { key },
    });
    await this.invalidateCache(key);
    return { message: 'Setting deleted successfully' };
  }

  // Get effective setting value (with fallback to system default)
  async getEffectiveSetting(key: string, systemDefault: any = null) {
    const value = await this.getSetting(key);
    return value ?? systemDefault;
  }

  async isMaintenanceModeEnabled(): Promise<boolean> {
    const value = await this.getSetting('MAINTENANCE_MODE');
    return this.toBoolean(value);
  }

  // Batch update multiple settings
  async batchUpdate(settings: Record<string, any>) {
    const results = await this.prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        this.prisma.platformSetting.upsert({
          where: { key },
          update: { value: this.serializeValue(value) },
          create: { key, value: this.serializeValue(value) },
        }),
      ),
    );
    await this.invalidateCache(...Object.keys(settings));
    return results.map((setting) => ({
      ...setting,
      value: this.parseStoredValue(setting.value),
    }));
  }

  // ATTENDANCE SPECIFIC SETTINGS

  // Get attendance cutoff time (default: 3:00 AM)
  async getAttendanceCutoffTime(
    schoolId?: string,
  ): Promise<{ hour: number; minute: number }> {
    const key = schoolId
      ? `attendance_cutoff_${schoolId}`
      : 'attendance_cutoff_default';
    const value = await this.getSetting(key);
    if (
      value &&
      typeof value === 'object' &&
      'hour' in value &&
      'minute' in value
    ) {
      return value as { hour: number; minute: number };
    }
    // Default: 3:00 AM
    return { hour: 3, minute: 0 };
  }

  // Set attendance cutoff time
  async setAttendanceCutoffTime(
    schoolId: string,
    hour: number,
    minute: number,
  ): Promise<void> {
    const key = `attendance_cutoff_${schoolId}`;
    await this.setSetting(key, { hour, minute });
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return false;
  }

  private serializeValue(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  private parseStoredValue(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
