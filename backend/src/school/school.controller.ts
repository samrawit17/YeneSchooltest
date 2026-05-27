import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  SchoolService,
  CreateSchoolDto,
  UpdateSchoolDto,
} from './school.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  AllowSuperAdminMixedRole,
  Roles,
} from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('schools')
@UseGuards(JwtAuthGuard)
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN)
  @Permissions('school:create')
  async createSchool(
    @Body()
    body: {
      name: string;
      email: string;
      address?: string;
      phone?: string;
    },
  ) {
    try {
      const createSchoolDto: CreateSchoolDto = {
        name: body.name,
        email: body.email,
        address: body.address,
        phone: body.phone,
      };
      return await this.schoolService.createSchool(createSchoolDto);
    } catch (error) {
      throw new HttpException(
        'Failed to create school: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Permissions('school:read')
  async getSchools() {
    try {
      return await this.schoolService.getSchools();
    } catch (error) {
      throw new HttpException(
        'Failed to get schools: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @Permissions('school:read')
  async getSchoolById(@Param('id') id: string) {
    try {
      const school = await this.schoolService.getSchoolById(id);
      if (!school) {
        throw new HttpException('School not found', HttpStatus.NOT_FOUND);
      }
      return school;
    } catch (error) {
      throw new HttpException(
        'Failed to get school: ' + error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowSuperAdminMixedRole()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.IT_MANAGER)
  async updateSchool(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      address?: string;
      phone?: string;
      code?: string;
      publicUrlSlug?: string;
      logo?: string;
      logoUrl?: string;
    },
    @Request() req: any,
  ) {
    try {
      // If ADMIN, ensure they can only update their own school
      if ((req.user.role === Role.ADMIN || req.user.role === Role.IT_MANAGER) && req.user.schoolId !== id) {
        throw new HttpException(
          'You can only update your own school',
          HttpStatus.FORBIDDEN,
        );
      }

      const updateDto: UpdateSchoolDto = {
        name: body.name,
        email: body.email,
        address: body.address,
        phone: body.phone,
        code: body.code,
        publicUrlSlug: body.publicUrlSlug,
        logoUrl: body.logoUrl ?? body.logo,
      };
      const school = await this.schoolService.updateSchool(id, updateDto);
      return school;
    } catch (error) {
      throw new HttpException(
        'Failed to update school: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowSuperAdminMixedRole()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.IT_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      // If ADMIN, ensure they can only update their own school
      if ((req.user.role === Role.ADMIN || req.user.role === Role.IT_MANAGER) && req.user.schoolId !== id) {
        throw new HttpException(
          'You can only update your own school',
          HttpStatus.FORBIDDEN,
        );
      }

      const logoUrl = await this.schoolService.uploadLogo(id, file);
      return { url: logoUrl };
    } catch (error) {
      throw new HttpException(
        'Failed to upload logo: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN)
  @Permissions('school:deactivate')
  async deleteSchool(@Param('id') id: string) {
    try {
      await this.schoolService.deleteSchool(id);
      return { message: 'School deleted successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to delete school: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
