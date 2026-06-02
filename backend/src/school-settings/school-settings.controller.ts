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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  private ensureCanReadSchoolSettings(req: any, schoolId: string) {
    if (req.user?.role === Role.SUPER_ADMIN) return;
    if (req.user?.schoolId === schoolId) return;

    throw new HttpException(
      'You can only access your own school settings',
      HttpStatus.FORBIDDEN,
    );
  }

  private ensureCanManageSchoolSettings(req: any, schoolId: string) {
    if (req.user?.role === Role.SUPER_ADMIN) return;
    if (
      (req.user?.role === Role.ADMIN || req.user?.role === Role.IT_MANAGER) &&
      req.user?.schoolId === schoolId
    ) {
      return;
    }

    throw new HttpException(
      'You can only update your own school settings',
      HttpStatus.FORBIDDEN,
    );
  }

  private getMutationContext(req: any) {
    return {
      actor: {
        id: req.user?.id || req.user?.sub || null,
        role: req.user?.role || null,
        schoolId: req.user?.schoolId || null,
      },
      request: {
        ip:
          req.ip ||
          req.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
          req.socket?.remoteAddress ||
          null,
        userAgent: req.headers?.['user-agent'] || null,
      },
    };
  }

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
  async getAllSettings(@Param('schoolId') schoolId: string, @Req() req: any) {
    try {
      this.ensureCanReadSchoolSettings(req, schoolId);
      return await this.schoolSettingsService.getAllSettings(schoolId);
    } catch (error) {
      throw new HttpException(
        'Failed to get settings: ' + error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
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
    @Req() req: any,
  ) {
    try {
      this.ensureCanReadSchoolSettings(req, schoolId);
      const value = await this.schoolSettingsService.getSetting(schoolId, key);
      return { key, value };
    } catch (error) {
      throw new HttpException(
        'Failed to get setting: ' + error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
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
    @Req() req: any,
  ) {
    try {
      this.ensureCanManageSchoolSettings(req, schoolId);
      const setting = await this.schoolSettingsService.setSetting(
        schoolId,
        key,
        body.value,
        this.getMutationContext(req),
      );
      return setting;
    } catch (error) {
      throw new HttpException(
        'Failed to update setting: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('login-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLoginImage(
    @Param('schoolId') schoolId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      if (
        (req.user.role === Role.ADMIN || req.user.role === Role.IT_MANAGER) &&
        req.user.schoolId !== schoolId
      ) {
        throw new HttpException(
          'You can only update your own school',
          HttpStatus.FORBIDDEN,
        );
      }

      const url = await this.schoolSettingsService.uploadLoginImage(
        schoolId,
        file,
        this.getMutationContext(req),
      );
      return { url };
    } catch (error) {
      throw new HttpException(
        'Failed to upload login image: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async deleteSetting(
    @Param('schoolId') schoolId: string,
    @Param('key') key: string,
    @Req() req: any,
  ) {
    try {
      this.ensureCanManageSchoolSettings(req, schoolId);
      return await this.schoolSettingsService.deleteSetting(
        schoolId,
        key,
        this.getMutationContext(req),
      );
    } catch (error) {
      throw new HttpException(
        'Failed to delete setting: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async batchUpdate(
    @Param('schoolId') schoolId: string,
    @Body() settings: Record<string, any>,
    @Req() req: any,
  ) {
    try {
      this.ensureCanManageSchoolSettings(req, schoolId);
      return await this.schoolSettingsService.batchUpdate(
        schoolId,
        settings,
        this.getMutationContext(req),
      );
    } catch (error) {
      throw new HttpException(
        'Failed to batch update settings: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
