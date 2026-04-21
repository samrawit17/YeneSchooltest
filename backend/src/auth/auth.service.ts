import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from './types/role.enum';
import { EnrollmentStatus } from '@prisma/client';
import { CredentialService } from '../credential/credential.service';

// Cookie name constant
export const JWT_COOKIE_NAME = 'Authentication';

// School setting keys
const SCHOOL_SETTING_ALLOW_SELF_ENROLLMENT = 'ALLOW_SELF_ENROLLMENT';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private credentialService: CredentialService,
  ) {}

  /**
   * Validate user by username, email, or phone
   * Supports multiple login identifiers
   */
  async validateUser(loginIdentifier: string, password: string): Promise<any> {
    // Try to find user by username, email, or phone (without isActive filter first)
    const user = await this.prismaService.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { username: loginIdentifier },
          { phone: loginIdentifier },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        name: true,
        role: true,
        schoolId: true,
        theme: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        userPermissions: {
          include: { permission: true },
        },
        school: {
          select: {
            schoolSettings: {
              where: {
                key: 'calendar_type',
              },
              select: { value: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact HR for more information.');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login time
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Extract calendar type from school settings (default to ETHIOPIAN if not found)
    const calendarType =
      user.school?.schoolSettings?.[0]?.value || 'ETHIOPIAN';

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      calendarType,
      theme: user.theme || 'SYSTEM',
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions: user.userPermissions.map((up) => up.permission.name),
    };
  }

  async login(user: any, @Res({ passthrough: true }) res?: Response) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    // Set JWT as HTTP-only cookie
    if (res) {
      res.cookie(JWT_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        calendarType: user.calendarType || 'ETHIOPIAN',
        theme: user.theme || 'SYSTEM',
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        permissions: user.permissions,
      },
    };
  }

  async logout(@Res({ passthrough: true }) res?: Response) {
    if (res) {
      res.clearCookie(JWT_COOKIE_NAME);
    }
    return { message: 'Logged out successfully' };
  }

  // SUPER_ADMIN creates ADMIN (requires schoolId)
  async registerAdmin(
    email: string,
    password: string,
    name: string,
    schoolId: string,
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!schoolId) {
      throw new Error('ADMIN role requires a schoolId');
    }

    // Check if email already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, message: 'An account with this email already exists' };
    }

    await this.prismaService.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: Role.ADMIN,
        schoolId,
      },
    });

    return { success: true, message: 'Admin created successfully' };
  }

  // ADMIN creates TEACHER
  async registerTeacher(email: string, name: string, schoolId: string) {
    // Generate staff ID automatically
    const staffId = await this.credentialService.generateStaffId(
      schoolId,
      Role.TEACHER,
    );

    // Generate temporary password
    const temporaryPassword =
      this.credentialService.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.prismaService.user.create({
      data: {
        email,
        username: staffId,
        password: hashedPassword,
        name,
        role: Role.TEACHER,
        schoolId,
        mustChangePassword: true, // Force password change on first login
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      credentials: {
        username: staffId,
        temporaryPassword, // Only returned once!
      },
    };
  }

  // ADMIN creates STUDENT
  async registerStudent(
    email: string,
    password: string,
    name: string,
    schoolId: string,
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const studentCode =
      await this.credentialService.generateStudentAdmissionNumber(
        schoolId,
        new Date().getFullYear().toString(),
      );

    return this.prismaService.user.create({
      data: {
        email,
        username: studentCode,
        password: hashedPassword,
        name,
        role: Role.STUDENT,
        schoolId,
        mustChangePassword: true,
      },
    });
  }

  // ADMIN creates PARENT
  async registerParent(
    email: string,
    password: string,
    name: string,
    schoolId: string,
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const parentUsername = await this.credentialService.generateStaffId(
      schoolId,
      Role.PARENT,
    );

    return this.prismaService.user.create({
      data: {
        email,
        username: parentUsername,
        password: hashedPassword,
        name,
        role: Role.PARENT,
        schoolId,
        mustChangePassword: true,
      },
    });
  }

  // ADMIN creates REGISTRAR
  async registerRegistrar(
    email: string,
    password: string,
    name: string,
    schoolId: string,
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prismaService.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: Role.REGISTRAR,
        schoolId,
      },
    });
  }

  // STUDENT self-registration and enrollment
  async registerStudentSelf(studentData: {
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
    photo?: string; // Base64 encoded photo
    documents?: {
      type: string;
      fileUrl: string;
      title?: string;
    }[];
  }) {
    // Check if self-enrollment is enabled for this school
    const selfEnrollmentEnabled =
      await this.prismaService.schoolSetting.findUnique({
        where: {
          schoolId_key: {
            schoolId: studentData.schoolId,
            key: SCHOOL_SETTING_ALLOW_SELF_ENROLLMENT,
          },
        },
      });

    if (!selfEnrollmentEnabled || selfEnrollmentEnabled.value !== 'true') {
      throw new BadRequestException(
        'Self-enrollment is not enabled for this school. Please contact your school administrator.',
      );
    }
    const {
      email,
      password,
      name,
      schoolId,
      academicYear,
      gradeId,
      gender,
      address,
      phone,
      emergencyContact,
      guardianName,
      guardianPhone,
      guardianEmail,
      photo,
      documents,
    } = studentData;

    // Check if school exists
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new Error('School not found');
    }

    // Check if email already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate student code
    const studentCode = await this.generateStudentCode(schoolId);

    // Create user
    const user = await this.prismaService.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: Role.STUDENT,
        schoolId,
        avatarUrl: photo || undefined,
      },
    });

    // Create student profile
    const studentProfile = await this.prismaService.studentProfile.create({
      data: {
        userId: user.id,
        schoolId,
        studentCode,
        studentId: studentCode, // Using same as studentCode for now
        enrollmentStatus: EnrollmentStatus.PENDING, // Pending approval from registrar
        academicYear,
        gender,
        address,
        phone,
        emergencyContact: emergencyContact
          ? JSON.stringify(emergencyContact)
          : undefined,
        documents: documents ? JSON.stringify(documents) : undefined,
        className: 'Pending Assignment', // Will be assigned by admin later
        section: 'Pending Assignment',
        rollNumber: 'Pending Assignment',
      },
    });

    // Create enrollment
    const enrollment = await this.prismaService.enrollment.create({
      data: {
        studentId: user.id,
        schoolId,
        status: EnrollmentStatus.PENDING, // Pending approval from registrar
        academicYear,
        gradeId,
      },
    });

    return {
      user,
      studentProfile,
      enrollment,
      message:
        'Student registration successful. Please contact your school administration for class assignment.',
    };
  }

  private async generateStudentCode(schoolId: string): Promise<string> {
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    if (!school) {
      throw new Error('School not found');
    }

    const schoolPrefix = school.name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    return `${schoolPrefix}${timestamp}${random}`;
  }

  async getUsers(
    role?: Role,
    filters?: { page?: number; limit?: number; search?: string },
  ) {
    const where: any = {};
    if (role) {
      where.role = role;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const total = await this.prismaService.user.count({ where });

    const users = await this.prismaService.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
        isActive: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUsersBySchool(
    schoolId: string,
    role?: Role,
    filters?: { page?: number; limit?: number; search?: string },
  ) {
    const where: any = { schoolId };
    if (role) {
      where.role = role;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const total = await this.prismaService.user.count({ where });

    const users = await this.prismaService.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
        isActive: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string) {
    // Logging removed

    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
        isActive: true,
        phone: true,
        avatarUrl: true,
        theme: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        teacherProfile: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            qualification: true,
            specialization: true,
            hireDate: true,
            experienceYears: true,
            department: {
              select: { name: true },
            },
          },
        },
        hrProfile: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            department: {
              select: { name: true },
            },
          },
        },
      },
    });
    // Logging removed
    return user;
  }

  async updateUser(
    id: string,
    data: {
      email?: string;
      password?: string;
      name?: string;
      theme?: string;
      phone?: string;
      avatarUrl?: string;
    },
  ) {
    const updateData: any = {};
    if (data.email) {
      updateData.email = data.email;
    }
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    if (data.name) {
      updateData.name = data.name;
    }
    if (data.theme) {
      updateData.theme = data.theme;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    return this.prismaService.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
        isActive: true,
        phone: true,
        avatarUrl: true,
        theme: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(id: string) {
    return this.prismaService.user.delete({
      where: { id },
    });
  }

  // ==================== PASSWORD MANAGEMENT ====================

  /**
   * Change password (for first login or regular password change)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    // Get user
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation =
      this.credentialService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`,
      );
    }

    // Hash and update password
    const hashedPassword =
      await this.credentialService.hashPassword(newPassword);

    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    return {
      mustChangePassword: false,
    };
  }

  /**
   * Request password reset - generates token and returns it
   * In production, this would send an email
   */
  async requestPasswordReset(email: string) {
    // Find user by email
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return { tokenSent: false };
    }

    // Generate reset token
    const token = await this.credentialService.createPasswordResetToken(
      user.id,
    );

    // In production, send email with reset link
    // For now, return the token (in production, this would be sent via email)
    // Logging removed for production

    return {
      tokenSent: true,
      // In development, return token for testing
      ...(process.env.NODE_ENV !== 'production' && { token }),
    };
  }

  /**
   * Reset password using token
   */
  async resetPasswordWithToken(token: string, newPassword: string) {
    // Validate password strength
    const passwordValidation =
      this.credentialService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`,
      );
    }

    // Validate token and get user ID
    const userId =
      await this.credentialService.validatePasswordResetToken(token);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword =
      await this.credentialService.hashPassword(newPassword);

    // Update user password
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    // Mark token as used
    await this.credentialService.markTokenAsUsed(token);

    return {
      userId,
    };
  }

  /**
   * Admin resets user password - generates new temporary password
   */
  async adminResetUserPassword(targetUserId: string, adminUserId: string) {
    // Get target user
    const targetUser = await this.prismaService.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Generate new temporary password
    const temporaryPassword =
      this.credentialService.generateTemporaryPassword(12);
    const hashedPassword =
      await this.credentialService.hashPassword(temporaryPassword);

    // Update user with new password and force change on next login
    await this.prismaService.user.update({
      where: { id: targetUserId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    // Log this action
    // Logging removed for production

    return {
      userId: targetUserId,
      email: targetUser.email,
      username: targetUser.username,
      temporaryPassword, // Only returned once!
      message:
        'This temporary password should be shared securely with the user',
    };
  }
}
