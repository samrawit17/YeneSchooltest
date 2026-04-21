import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('platform/settings')
export class PlatformSettingsController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllSettings() {
    try {
      return await this.platformSettingsService.getAllSettings();
    } catch (error) {
      throw new HttpException(
        'Failed to get settings: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('flags')
  @UseGuards(JwtAuthGuard)
  async getFeatureFlags() {
    try {
      const settings = await this.platformSettingsService.getAllSettings();
      // Return only feature flags for frontend consumption
      const featureFlags: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (key.startsWith('FEATURE_FLAG_') || key === 'MAINTENANCE_MODE') {
          // Convert to boolean - handle string "false"/"true" and actual booleans
          if (typeof value === 'string') {
            featureFlags[key] = value.toLowerCase() !== 'false';
          } else {
            featureFlags[key] = Boolean(value);
          }
        }
      }
      return featureFlags;
    } catch (error) {
      throw new HttpException(
        'Failed to get feature flags: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getSetting(@Param('key') key: string) {
    try {
      const value = await this.platformSettingsService.getSetting(key);
      return { key, value };
    } catch (error) {
      throw new HttpException(
        'Failed to get setting: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async setSetting(@Param('key') key: string, @Body() body: { value: any }) {
    try {
      const setting = await this.platformSettingsService.setSetting(
        key,
        body.value,
      );
      return setting;
    } catch (error) {
      throw new HttpException(
        'Failed to update setting: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async deleteSetting(@Param('key') key: string) {
    try {
      return await this.platformSettingsService.deleteSetting(key);
    } catch (error) {
      throw new HttpException(
        'Failed to delete setting: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async batchUpdate(@Body() settings: Record<string, any>) {
    try {
      return await this.platformSettingsService.batchUpdate(settings);
    } catch (error) {
      throw new HttpException(
        'Failed to batch update settings: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
