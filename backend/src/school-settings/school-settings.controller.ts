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
  Req,
} from '@nestjs/common';
import { SchoolSettingsService } from './school-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AllowSuperAdminMixedRole,
  Roles,
} from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('schools/:schoolId/settings')
export class SchoolSettingsController {
  constructor(private readonly schoolSettingsService: SchoolSettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowSuperAdminMixedRole()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.IT_MANAGER,
    Role.PARENT,
    Role.TEACHER,
    Role.STUDENT,
    Role.REGISTRAR,
    Role.FINANCE,
  )
  async getAllSettings(@Param('schoolId') schoolId: string) {
    try {
      // Admins can only access their own school's settings
      return await this.schoolSettingsService.getAllSettings(schoolId);
    } catch (error) {
      throw new HttpException(
        'Failed to get settings: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowSuperAdminMixedRole()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.IT_MANAGER,
    Role.PARENT,
    Role.TEACHER,
    Role.STUDENT,
    Role.REGISTRAR,
    Role.FINANCE,
  )
  async getSetting(
    @Param('schoolId') schoolId: string,
    @Param('key') key: string,
  ) {
    try {
      const value = await this.schoolSettingsService.getSetting(schoolId, key);
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
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async setSetting(
    @Param('schoolId') schoolId: string,
    @Param('key') key: string,
    @Body() body: { value: any },
  ) {
    try {
      const setting = await this.schoolSettingsService.setSetting(
        schoolId,
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
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async deleteSetting(
    @Param('schoolId') schoolId: string,
    @Param('key') key: string,
  ) {
    try {
      return await this.schoolSettingsService.deleteSetting(schoolId, key);
    } catch (error) {
      throw new HttpException(
        'Failed to delete setting: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async batchUpdate(
    @Param('schoolId') schoolId: string,
    @Body() settings: Record<string, any>,
  ) {
    try {
      return await this.schoolSettingsService.batchUpdate(schoolId, settings);
    } catch (error) {
      throw new HttpException(
        'Failed to batch update settings: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
