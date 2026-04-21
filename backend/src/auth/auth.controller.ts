import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { Role } from './types/role.enum';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Roles } from './decorators/roles.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimit } from '../infrastructure/rate-limit/rate-limit.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prismaService: PrismaService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @RateLimit({ limit: 5, windowSec: 60 })
  async login(@Request() req, @Res({ passthrough: true }) res?: Response) {
    return this.authService.login(req.user, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res?: Response) {
    return this.authService.logout(res);
  }

  // SUPER_ADMIN creates ADMIN
  @Post('register/admin')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN)
  @Permissions('user:create')
  async registerAdmin(
    @Request() req,
    @Body()
    body: { email: string; password: string; name: string; schoolId: string },
  ) {
    try {
      if (!body.schoolId) {
        throw new HttpException(
          'schoolId is required for ADMIN registration',
          HttpStatus.BAD_REQUEST,
        );
      }
      const result = await this.authService.registerAdmin(
        body.email,
        body.password,
        body.name,
        body.schoolId,
      );
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Admin registration failed: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ADMIN creates TEACHER
  @Post('register/teacher')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN)
  @Permissions('user:create')
  async registerTeacher(
    @Request() req,
    @Body() body: { email: string; name: string },
  ) {
    try {
      if (!req.user.schoolId) {
        throw new HttpException(
          'Admin is not associated with any school',
          HttpStatus.BAD_REQUEST,
        );
      }
      return this.authService.registerTeacher(
        body.email,
        body.name,
        req.user.schoolId,
      );
    } catch (error) {
      throw new HttpException(
        'Teacher registration failed: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ADMIN creates STUDENT
  @Post('register/student')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('user:create')
  async registerStudent(
    @Request() req,
    @Body() body: { email: string; password: string; name: string },
  ) {
    try {
      if (!req.user.schoolId) {
        throw new HttpException(
          'User is not associated with any school',
          HttpStatus.BAD_REQUEST,
        );
      }
      return this.authService.registerStudent(
        body.email,
        body.password,
        body.name,
        req.user.schoolId,
      );
    } catch (error) {
      throw new HttpException(
        'Student registration failed: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ADMIN creates PARENT
  @Post('register/parent')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN)
  @Permissions('user:create')
  async registerParent(
    @Request() req,
    @Body() body: { email: string; password: string; name: string },
  ) {
    try {
      if (!req.user.schoolId) {
        throw new HttpException(
          'Admin is not associated with any school',
          HttpStatus.BAD_REQUEST,
        );
      }
      return this.authService.registerParent(
        body.email,
        body.password,
        body.name,
        req.user.schoolId,
      );
    } catch (error) {
      throw new HttpException(
        'Parent registration failed: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ADMIN creates REGISTRAR
  @Post('register/registrar')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN)
  @Permissions('user:create')
  async registerRegistrar(
    @Request() req,
    @Body() body: { email: string; password: string; name: string },
  ) {
    try {
      if (!req.user.schoolId) {
        throw new HttpException(
          'Admin is not associated with any school',
          HttpStatus.BAD_REQUEST,
        );
      }
      return this.authService.registerRegistrar(
        body.email,
        body.password,
        body.name,
        req.user.schoolId,
      );
    } catch (error) {
      throw new HttpException(
        'Registrar registration failed: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // STUDENT self-registration and enrollment
  @Post('register/student-self')
  @UseInterceptors(FilesInterceptor('files', 10)) // Allow up to 10 files
  async registerStudentSelf(
    @Body()
    body: {
      email: string;
      password: string;
      name: string;
      schoolId: string;
      academicYear: string;
      gradeId: string;
      gender?: string;
      address?: string;
      phone?: string;
      emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
      };
      guardianName?: string;
      guardianPhone?: string;
      guardianEmail?: string;
      documents?: any[];
    },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      // Process uploaded files
      let photoUrl: string | undefined;
      const documents: any[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          if (file.fieldname === 'photo') {
            // Convert photo to base64
            photoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          } else if (file.fieldname.startsWith('document')) {
            // Handle documents
            documents.push({
              type: file.mimetype,
              fileUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
              title: file.originalname,
            });
          }
        }
      }

      const studentData = {
        ...body,
        photo: photoUrl,
        documents: documents.length > 0 ? documents : body.documents,
      };

      return this.authService.registerStudentSelf(studentData);
    } catch (error) {
      throw new HttpException(
        'Student self-registration failed: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Permissions('user:read')
  async getUsers(@Request() req, @Query('role') role?: Role) {
    try {
      if (req.user.role === Role.SUPER_ADMIN) {
        return this.authService.getUsers(role);
      }

      if (!req.user.schoolId) {
        throw new HttpException(
          'User is not associated with any school',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.authService.getUsersBySchool(req.user.schoolId, role);
    } catch (error) {
      throw new HttpException(
        'Failed to get users: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('users/teachers')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
  @Permissions('user:read')
  async getTeachers(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;

      // SUPER_ADMIN can see all teachers across schools
      if (req.user.role === Role.SUPER_ADMIN) {
        return this.authService.getUsers(Role.TEACHER, {
          page: pageNum,
          limit: limitNum,
          search,
        });
      }

      if (!req.user.schoolId) {
        throw new HttpException(
          'User is not associated with any school',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.authService.getUsersBySchool(
        req.user.schoolId,
        Role.TEACHER,
        {
          page: pageNum,
          limit: limitNum,
          search,
        },
      );
    } catch (error) {
      throw new HttpException(
        'Failed to get teachers: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('users/me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    try {
      const user = req.user;

      // Get student profile if user is a student
      if (user.role === Role.STUDENT) {
        const studentProfile =
          await this.prismaService.studentProfile.findUnique({
            where: { userId: user.id },
            include: {
              user: true,
            },
          });

        const enrollment = await this.prismaService.enrollment.findFirst({
          where: { studentId: user.id },
        });

        return {
          ...user,
          studentProfile,
          enrollment,
        };
      }

      return user;
    } catch (error) {
      throw new HttpException(
        'Failed to get user profile: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Permissions('view_users')
  async getUser(@Request() req, @Param('id') id: string) {
    try {
      // Handle special case for 'me'
      if (id === 'me') {
        const user = req.user;

        // Get student profile if user is a student
        if (user.role === Role.STUDENT) {
          const studentProfile =
            await this.prismaService.studentProfile.findUnique({
              where: { userId: user.id },
              include: {
                user: true,
              },
            });

          const enrollment = await this.prismaService.enrollment.findFirst({
            where: { studentId: user.id },
          });

          return {
            ...user,
            studentProfile,
            enrollment,
          };
        }

        return user;
      }

      const user = await this.authService.getUserById(id);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (req.user.role !== Role.SUPER_ADMIN) {
        if (!req.user.schoolId || user.schoolId !== req.user.schoolId) {
          throw new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
        }
      }

      return user;
    } catch (error) {
      throw new HttpException(
        'Failed to get user: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('users/me')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(
    @Request() req,
    @Body()
    body: { name?: string; phone?: string; avatarUrl?: string; theme?: string },
  ) {
    try {
      const user = await this.authService.getUserById(req.user.id);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Update only allowed fields
      const { name, phone, avatarUrl, theme } = body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (theme !== undefined) {
        // Validate theme value using enum values
        if (['LIGHT', 'DARK', 'SYSTEM'].includes(theme)) {
          updateData.theme = theme;
        } else {
          throw new HttpException(
            'Invalid theme value. Must be: LIGHT, DARK, or SYSTEM',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      return this.authService.updateUser(req.user.id, updateData);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update user profile: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Permissions('update_users')
  async updateUser(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { email?: string; password?: string; name?: string },
  ) {
    try {
      const user = await this.authService.getUserById(id);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (req.user.role !== Role.SUPER_ADMIN) {
        if (!req.user.schoolId || user.schoolId !== req.user.schoolId) {
          throw new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
        }
      }

      return this.authService.updateUser(id, body);
    } catch (error) {
      throw new HttpException(
        'Failed to update user: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch('users/me/theme')
  @UseGuards(JwtAuthGuard)
  async updateTheme(@Request() req, @Body() body: { theme: string }) {
    try {
      const user = await this.authService.getUserById(req.user.id);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Validate theme value using enum values
      const validThemes = ['LIGHT', 'DARK', 'SYSTEM'];
      if (!validThemes.includes(body.theme)) {
        throw new HttpException(
          'Invalid theme value. Must be: LIGHT, DARK, or SYSTEM',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.authService.updateUser(req.user.id, { theme: body.theme });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update theme: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Permissions('delete_users')
  async deleteUser(@Request() req, @Param('id') id: string) {
    try {
      const user = await this.authService.getUserById(id);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (req.user.role !== Role.SUPER_ADMIN) {
        if (!req.user.schoolId || user.schoolId !== req.user.schoolId) {
          throw new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
        }
      }

      return this.authService.deleteUser(id);
    } catch (error) {
      throw new HttpException(
        'Failed to delete user: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== PASSWORD MANAGEMENT ====================

  /**
   * Change password on first login (enforced when mustChangePassword is true)
   * POST /auth/change-password
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req,
    @Body()
    body: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) {
    try {
      const { currentPassword, newPassword, confirmPassword } = body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new HttpException(
          'Current password, new password, and confirm password are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (newPassword !== confirmPassword) {
        throw new HttpException(
          'New password and confirm password do not match',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
      );

      return {
        success: true,
        message: 'Password changed successfully',
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to change password: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Request password reset (sends reset token)
   * POST /auth/request-password-reset
   */
  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: { email: string }) {
    try {
      const { email } = body;

      if (!email) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.authService.requestPasswordReset(email);

      return {
        success: true,
        message:
          'If the email exists in our system, a password reset link has been sent',
        ...result,
      };
    } catch (error) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message:
          'If the email exists in our system, a password reset link has been sent',
      };
    }
  }

  /**
   * Reset password using token
   * POST /auth/reset-password
   */
  @Post('reset-password')
  async resetPassword(
    @Body()
    body: {
      token: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) {
    try {
      const { token, newPassword, confirmPassword } = body;

      if (!token || !newPassword || !confirmPassword) {
        throw new HttpException(
          'Token, new password, and confirm password are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (newPassword !== confirmPassword) {
        throw new HttpException(
          'New password and confirm password do not match',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.resetPasswordWithToken(
        token,
        newPassword,
      );

      return {
        success: true,
        message: 'Password reset successfully',
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to reset password: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Admin forces password reset for a user
   * POST /auth/admin/reset-user-password/:userId
   */
  @Post('admin/reset-user-password/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Permissions('user:update')
  async adminResetUserPassword(
    @Request() req,
    @Param('userId') userId: string,
  ) {
    try {
      const result = await this.authService.adminResetUserPassword(
        userId,
        req.user.id,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to reset user password: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
