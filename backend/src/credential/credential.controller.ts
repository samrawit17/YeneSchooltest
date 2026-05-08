import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Response,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { CredentialService, BulkCredentialResult } from './credential.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { PrismaService } from '../prisma/prisma.service';

export interface BulkStudentCreationDto {
  students: Array<{
    name: string;
    email?: string;
    gender?: string;
    phone?: string;
    address?: string;
  }>;
  academicYear: string;
  grade: number;
  className?: string;
  section?: string;
}

export interface GenerateCredentialsDto {
  count: number;
  academicYear: string;
  role: Role;
}

export interface CreateStaffDto {
  staff: Array<{
    name: string;
    email: string;
    role: Role.TEACHER | Role.ADMIN | Role.REGISTRAR | Role.FINANCE;
    phone?: string;
    // Option to auto-generate credentials (default: true)
    generateCredentials?: boolean;
    // Custom credentials (only used when generateCredentials is false)
    username?: string;
    password?: string;
  }>;
  academicYear?: string;
}

@Controller('credentials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CredentialController {
  constructor(
    private readonly credentialService: CredentialService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Generate a preview of the next student admission number
   * GET /credentials/preview/student/:schoolId
   */
  @Get('preview/student/:schoolId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async previewStudentId(
    @Param('schoolId') schoolId: string,
    @Query('academicYear') academicYear: string,
  ) {
    if (!academicYear) {
      throw new BadRequestException('Academic year is required');
    }

    // Get current counter state
    const counter = await this.prismaService.schoolYearCounter.findUnique({
      where: {
        schoolId_academicYear: {
          schoolId,
          academicYear,
        },
      },
    });

    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { code: true, name: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const nextSequence = (counter?.studentCount || 0) + 1;
    const year = this.extractYearFromAcademicYear(academicYear);

    return {
      schoolName: school.name,
      schoolCode: school.code,
      academicYear,
      currentCount: counter?.studentCount || 0,
      nextAdmissionNumber: school.code
        ? `${school.code}-${year}-${nextSequence.toString().padStart(4, '0')}`
        : null,
      message: school.code
        ? 'Next admission number preview'
        : 'School code not configured. Please set a school code first.',
    };
  }

  /**
   * Generate a preview of the next staff ID
   * GET /credentials/preview/staff/:schoolId
   */
  @Get('preview/staff/:schoolId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async previewStaffId(
    @Param('schoolId') schoolId: string,
    @Query('role') role: Role,
    @Query('academicYear') academicYear?: string,
  ) {
    const year = academicYear
      ? this.extractYearFromAcademicYear(academicYear)
      : new Date().getFullYear().toString();

    const counter = await this.prismaService.schoolYearCounter.findUnique({
      where: {
        schoolId_academicYear: {
          schoolId,
          academicYear: `${year}-${parseInt(year) + 1}`,
        },
      },
    });

    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { code: true, name: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    let nextSequence: number;
    let roleType: string;

    switch (role) {
      case Role.TEACHER:
        nextSequence = (counter?.teacherCount || 0) + 1;
        roleType = 'T';
        break;
      case Role.ADMIN:
        nextSequence = (counter?.adminCount || 0) + 1;
        roleType = 'A';
        break;
      case Role.PARENT:
        nextSequence = (counter?.parentCount || 0) + 1;
        roleType = 'P';
        break;
      default:
        throw new BadRequestException('Invalid role for staff ID preview');
    }

    return {
      schoolName: school.name,
      schoolCode: school.code,
      role,
      year,
      currentCount: nextSequence - 1,
      nextStaffId: school.code
        ? `${school.code}-${roleType}-${nextSequence.toString().padStart(4, '0')}`
        : null,
      message: school.code
        ? 'Next staff ID preview'
        : 'School code not configured. Please set a school code first.',
    };
  }

  /**
   * Generate bulk credentials for export
   * POST /credentials/generate/bulk
   */
  @Post('generate/bulk')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async generateBulkCredentials(
    @Body() dto: GenerateCredentialsDto,
    @Request() req: any,
  ) {
    const schoolId = req.user.schoolId;
    const { count, academicYear, role } = dto;

    if (count < 1 || count > 1000) {
      throw new BadRequestException('Count must be between 1 and 1000');
    }

    const credentials: Array<{
      username: string;
      temporaryPassword: string;
      hashedPassword: string;
      role: Role;
    }> = [];

    for (let i = 0; i < count; i++) {
      if (role === Role.STUDENT) {
        const cred = await this.credentialService.generateStudentCredentials(
          schoolId,
          academicYear,
        );
        credentials.push({
          ...cred,
          role: Role.STUDENT,
        });
      } else if (
        role === Role.TEACHER ||
        role === Role.ADMIN ||
        role === Role.REGISTRAR ||
        role === Role.FINANCE
      ) {
        const cred = await this.credentialService.generateStaffCredentials(
          schoolId,
          role,
          academicYear,
        );
        credentials.push({
          ...cred,
          role,
        });
      } else {
        throw new BadRequestException(
          'Role must be STUDENT, TEACHER, ADMIN, REGISTRAR, or FINANCE',
        );
      }
    }

    return {
      message: `Generated ${count} credentials for ${role}`,
      credentials,
    };
  }

  /**
   * Bulk create students with auto-generated credentials
   * POST /credentials/students/bulk
   */
  @Post('students/bulk')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async bulkCreateStudents(
    @Body() dto: BulkStudentCreationDto,
    @Request() req: any,
  ) {
    const schoolId = req.user.schoolId;
    const { students, academicYear, grade, className, section } = dto;

    if (!students || students.length === 0) {
      throw new BadRequestException('At least one student is required');
    }

    if (students.length > 100) {
      throw new BadRequestException('Maximum 100 students per bulk creation');
    }

    // Verify school exists and has a code
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { code: true, name: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    if (!school.code) {
      throw new BadRequestException(
        `School code not set for "${school.name}". Please configure a school code first.`,
      );
    }

    const createdStudents: Array<{
      id: string;
      name: string;
      email?: string | null;
      username: string;
      temporaryPassword: string;
      role: Role;
    }> = [];

    // Generate credentials and create users in a transaction
    for (const student of students) {
      // Generate credentials
      const credentials =
        await this.credentialService.generateStudentCredentials(
          schoolId,
          academicYear,
        );

      // Create user
      const user = await this.prismaService.user.create({
        data: {
          email: student.email || null,
          username: credentials.username,
          password: credentials.hashedPassword,
          name: student.name,
          role: Role.STUDENT,
          schoolId,
          mustChangePassword: true,
          phone: student.phone || undefined,
        },
      });

      // Create student profile
      await this.prismaService.studentProfile.create({
        data: {
          userId: user.id,
          schoolId,
          studentCode: credentials.username,
          studentId: credentials.username,
          enrollmentStatus: 'PENDING',
          academicYear,
          className: className || 'Pending',
          section: section || 'Pending',
          gender: student.gender,
          address: student.address,
          phone: student.phone,
        },
      });

      // Create enrollment
      await this.prismaService.enrollment.create({
        data: {
          studentId: user.id,
          schoolId,
          status: 'PENDING',
          academicYear,
          grade,
        },
      });

      createdStudents.push({
        id: user.id,
        name: user.name,
        email: user.email,
        username: credentials.username,
        temporaryPassword: credentials.temporaryPassword,
        role: Role.STUDENT,
      });
    }

    // Log credential generation
    await this.credentialService.logCredentialGeneration(
      schoolId,
      req.user.id,
      'STUDENT',
      createdStudents.length,
      academicYear,
      createdStudents.map((s) => s.username),
    );

    return {
      message: `Successfully created ${createdStudents.length} students with credentials`,
      students: createdStudents,
      credentials: createdStudents.map((s) => ({
        name: s.name,
        email: s.email,
        username: s.username,
        temporaryPassword: s.temporaryPassword,
        role: s.role,
      })),
      note: 'Temporary passwords are only shown once. Make sure to download or print the credentials.',
    };
  }

  /**
   * Bulk create staff with auto-generated credentials
   * POST /credentials/staff/bulk
   */
  @Post('staff/bulk')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async bulkCreateStaff(
    @Body()
    dto: {
      staff: Array<{
        name: string;
        email: string;
        role:
          | Role.TEACHER
          | Role.ADMIN
          | Role.REGISTRAR
          | Role.FINANCE;
        phone?: string;
      }>;
      academicYear?: string;
    },
    @Request() req: any,
  ) {
    const schoolId = req.user.schoolId;
    const { staff, academicYear } = dto;

    if (!staff || staff.length === 0) {
      throw new BadRequestException('At least one staff member is required');
    }

    if (staff.length > 50) {
      throw new BadRequestException('Maximum 50 staff per bulk creation');
    }

    // Verify school exists and has a code
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { code: true, name: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    if (!school.code) {
      throw new BadRequestException(
        `School code not set for "${school.name}". Please configure a school code first.`,
      );
    }

    const createdStaff: Array<{
      id: string;
      name: string;
      email: string;
      username: string;
      temporaryPassword: string;
      role: Role;
    }> = [];

    // Generate credentials and create users
    for (const member of staff) {
      if (
        ![
          Role.TEACHER,
          Role.ADMIN,
          Role.REGISTRAR,
          Role.FINANCE,
        ].includes(member.role)
      ) {
        throw new BadRequestException(
          `Invalid role: ${member.role}. Must be TEACHER, ADMIN, REGISTRAR, or FINANCE`,
        );
      }

      // Generate credentials
      const credentials = await this.credentialService.generateStaffCredentials(
        schoolId,
        member.role,
        academicYear,
      );

      // Create user
      const user = await this.prismaService.user.create({
        data: {
          email: member.email,
          username: credentials.username,
          password: credentials.hashedPassword,
          name: member.name,
          role: member.role,
          schoolId,
          mustChangePassword: true,
          phone: member.phone || undefined,
        },
      });

      // Create teacher profile for TEACHER role
      if (member.role === Role.TEACHER) {
        await this.prismaService.teacherProfile.create({
          data: {
            userId: user.id,
            schoolId,
            employeeId: credentials.username,
          },
        });
      }

      createdStaff.push({
        id: user.id,
        name: user.name,
        email: user.email || '',
        username: credentials.username,
        temporaryPassword: credentials.temporaryPassword,
        role: user.role as Role,
      });
    }

    // Log credential generation
    await this.credentialService.logCredentialGeneration(
      schoolId,
      req.user.id,
      'STAFF',
      createdStaff.length,
      academicYear || null,
      createdStaff.map((s) => s.username),
    );

    return {
      message: `Successfully created ${createdStaff.length} staff with credentials`,
      staff: createdStaff,
      credentials: createdStaff.map((s) => ({
        name: s.name,
        email: s.email,
        username: s.username,
        temporaryPassword: s.temporaryPassword,
        role: s.role,
      })),
      note: 'Temporary passwords are only shown once. Make sure to download or print the credentials.',
    };
  }

  /**
   * Unified staff creation - supports both auto-generated and custom credentials
   * POST /credentials/staff/create
   */
  @Post('staff/create')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async createStaff(@Body() dto: CreateStaffDto, @Request() req: any) {
    const schoolId = req.user.schoolId;
    const { staff, academicYear } = dto;

    if (!staff || staff.length === 0) {
      throw new BadRequestException('At least one staff member is required');
    }

    if (staff.length > 50) {
      throw new BadRequestException('Maximum 50 staff per creation');
    }

    // Verify school exists
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { code: true, name: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const createdStaff: Array<{
      id: string;
      name: string;
      email: string;
      username: string;
      temporaryPassword: string;
      role: Role;
      wasAutoGenerated: boolean;
    }> = [];

    // Process each staff member
    for (const member of staff) {
      if (
        ![
          Role.TEACHER,
          Role.ADMIN,
          Role.REGISTRAR,
          Role.FINANCE,
        ].includes(member.role)
      ) {
        throw new BadRequestException(
          `Invalid role: ${member.role}. Must be TEACHER, ADMIN, REGISTRAR, or FINANCE`,
        );
      }

      const generateCredentials = member.generateCredentials !== false; // Default to true
      let username: string;
      let temporaryPassword: string;
      let hashedPassword: string;

      if (generateCredentials) {
        // Auto-generate credentials
        const credentials =
          await this.credentialService.generateStaffCredentials(
            schoolId,
            member.role,
            academicYear,
          );
        username = credentials.username;
        temporaryPassword = credentials.temporaryPassword;
        hashedPassword = credentials.hashedPassword;
      } else {
        // Use custom credentials
        if (!member.username || !member.password) {
          throw new BadRequestException(
            `Username and password are required when generateCredentials is false`,
          );
        }
        username = member.username;
        temporaryPassword = member.password; // Show the provided password in response
        hashedPassword = await this.credentialService.hashPassword(
          member.password,
        );
      }

      const createdMember = await this.prismaService.$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: {
              email: member.email,
              username,
              password: hashedPassword,
              name: member.name,
              role: member.role,
              schoolId,
              mustChangePassword: generateCredentials,
              phone: member.phone || undefined,
            },
          });

          if (member.role === Role.TEACHER) {
            await tx.teacherProfile.create({
              data: {
                userId: user.id,
                schoolId,
                employeeId: username,
              },
            });
          }

          await this.credentialService.createPendingCredential(
            {
              schoolId,
              userId: user.id,
              name: member.name,
              email: member.email,
              username,
              temporaryPassword,
              role: member.role.toString(),
            },
            tx,
          );

          return user;
        },
      );

      createdStaff.push({
        id: createdMember.id,
        name: createdMember.name,
        email: createdMember.email || '',
        username: createdMember.username || '',
        temporaryPassword,
        role: createdMember.role as Role,
        wasAutoGenerated: generateCredentials,
      });
    }

    // Log credential generation
    await this.credentialService.logCredentialGeneration(
      schoolId,
      req.user.id,
      'STAFF',
      createdStaff.length,
      academicYear || null,
      createdStaff.map((s) => s.username),
    );

    const generateCredentials = dto.staff[0]?.generateCredentials !== false;
    return {
      message: `Successfully created ${createdStaff.length} staff`,
      staff: createdStaff,
      credentials: createdStaff.map((s) => ({
        name: s.name,
        email: s.email,
        username: s.username,
        temporaryPassword: s.temporaryPassword,
        role: s.role,
        wasAutoGenerated: s.wasAutoGenerated,
      })),
      note: generateCredentials
        ? 'Temporary passwords are only shown once. Make sure to download or print the credentials.'
        : 'Custom passwords were provided by the user.',
    };
  }

  /**
   * Unified student creation - supports both auto-generated and custom credentials
   * POST /credentials/students/create
   */
  @Post('students/create')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async createStudents(
    @Body()
    dto: {
      students: Array<{
        name: string;
        email?: string;
        phone?: string;
        parentEmail?: string;
        generateCredentials?: boolean;
        username?: string;
        password?: string;
        classId?: string;
        sectionId?: string;
      }>;
      academicYear?: string;
    },
    @Request() req: any,
  ) {
    const schoolId = req.user.schoolId;
    const { students, academicYear } = dto;

    if (!students || students.length === 0) {
      throw new BadRequestException('At least one student is required');
    }

    if (students.length > 100) {
      throw new BadRequestException('Maximum 100 students per creation');
    }

    // Verify school exists
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { code: true, name: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const createdStudents: Array<{
      id: string;
      name: string;
      email?: string | null;
      username: string;
      temporaryPassword: string;
      role: Role;
      wasAutoGenerated: boolean;
    }> = [];

    // Process each student
    for (const student of students) {
      const generateCredentials = student.generateCredentials !== false; // Default to true
      let username: string;
      let temporaryPassword: string;
      let hashedPassword: string;

      if (generateCredentials) {
        // Auto-generate credentials
        if (!school.code) {
          throw new BadRequestException(
            `School code not set for "${school.name}". Please configure a school code first.`,
          );
        }
        const credentials =
          await this.credentialService.generateStudentCredentials(
            schoolId,
            academicYear || new Date().getFullYear().toString(),
          );
        username = credentials.username;
        temporaryPassword = credentials.temporaryPassword;
        hashedPassword = credentials.hashedPassword;
      } else {
        // Use custom credentials
        if (!student.username || !student.password) {
          throw new BadRequestException(
            `Username and password are required when generateCredentials is false`,
          );
        }
        username = student.username;
        temporaryPassword = student.password; // Show the provided password in response
        hashedPassword = await this.credentialService.hashPassword(
          student.password,
        );
      }

      const createdStudent = await this.prismaService.$transaction(
        async (tx) => {
          let assignedClassName = 'Pending';
          let assignedSectionName: string | undefined;
          let rollNumber: string | undefined;

          // Handle class assignment - section is auto-assigned
          if (student.classId) {
            const selectedClass = await tx.class.findFirst({
              where: { id: student.classId, schoolId },
              select: { id: true, name: true },
            });
            if (!selectedClass) {
              throw new NotFoundException(
                `Class not found: ${student.classId}`,
              );
            }
            assignedClassName = selectedClass.name;

            // If sectionId is provided, use it; otherwise we'll auto-assign later
            if (student.sectionId) {
              const selectedSection = await tx.section.findFirst({
                where: { id: student.sectionId, classId: selectedClass.id },
                select: { id: true, name: true },
              });
              if (!selectedSection) {
                throw new NotFoundException(
                  `Section not found: ${student.sectionId}`,
                );
              }
              assignedSectionName = selectedSection.name;
              rollNumber =
                await this.credentialService.generateSectionRollNumber(
                  schoolId,
                  assignedClassName,
                  assignedSectionName,
                  undefined, // studentName
                  tx,
                );
            }
          }

          const user = await tx.user.create({
            data: {
              email: student.email || null,
              username,
              password: hashedPassword,
              name: student.name,
              role: Role.STUDENT,
              schoolId,
              mustChangePassword: generateCredentials,
              phone: student.phone || undefined,
            },
          });

          const profile = await tx.studentProfile.create({
            data: {
              userId: user.id,
              schoolId,
              studentCode: username,
              studentId: username,
              enrollmentStatus:
                student.classId && student.sectionId ? 'APPROVED' : 'PENDING',
              academicYear,
              className: assignedClassName,
              section: assignedSectionName,
              rollNumber,
              phone: student.phone,
            },
          });

          await tx.enrollment.create({
            data: {
              studentId: user.id,
              schoolId,
              status:
                student.classId && student.sectionId ? 'APPROVED' : 'PENDING',
              academicYear: academicYear || new Date().getFullYear().toString(),
            },
          });

          // Only create studentClass if both class and section are assigned
          if (student.classId && student.sectionId) {
            await tx.studentClass.create({
              data: {
                studentId: user.id,
                classId: student.classId,
                sectionId: student.sectionId,
                schoolId,
                academicYear:
                  academicYear || new Date().getFullYear().toString(),
              },
            });
          }

          await this.credentialService.createPendingCredential(
            {
              schoolId,
              userId: user.id,
              name: student.name,
              email: student.email || null,
              username,
              temporaryPassword,
              role: Role.STUDENT.toString(),
            },
            tx,
          );

          return { user, profile };
        },
      );

      createdStudents.push({
        id: createdStudent.user.id,
        name: createdStudent.user.name,
        email: createdStudent.user.email,
        username: createdStudent.user.username || '',
        temporaryPassword,
        role: createdStudent.user.role as Role,
        wasAutoGenerated: generateCredentials,
      });
    }

    // Log credential generation
    await this.credentialService.logCredentialGeneration(
      schoolId,
      req.user.id,
      'STUDENT',
      createdStudents.length,
      academicYear || null,
      createdStudents.map((s) => s.username),
    );

    const generateCredentials = dto.students[0]?.generateCredentials !== false;
    return {
      message: `Successfully created ${createdStudents.length} students`,
      students: createdStudents,
      credentials: createdStudents.map((s) => ({
        name: s.name,
        email: s.email,
        username: s.username,
        temporaryPassword: s.temporaryPassword,
        role: s.role,
        wasAutoGenerated: s.wasAutoGenerated,
      })),
      note: generateCredentials
        ? 'Temporary passwords are only shown once. Make sure to download or print the credentials.'
        : 'Custom passwords were provided by the user.',
    };
  }

  /**
   * Export credentials to CSV
   * POST /credentials/export/csv
   */
  @Post('export/csv')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async exportCredentialsToCSV(
    @Body() credentials: BulkCredentialResult[],
    @Response() res: ExpressResponse,
  ) {
    const csv = this.credentialService.exportToCSV(credentials);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=credentials.csv',
    );
    res.send(csv);
  }

  /**
   * Generate credential slips for printing
   * POST /credentials/slips
   */
  @Post('slips')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async generateCredentialSlips(
    @Body() credentials: BulkCredentialResult[],
    @Request() req: any,
  ) {
    const schoolId = req.user.schoolId;
    const slips = await this.credentialService.generateCredentialSlips(
      schoolId,
      credentials,
    );

    return {
      slips,
      printableFormat: slips.map((slip) => ({
        title: 'STUDENT CREDENTIAL SLIP',
        header: `
          ${slip.schoolLogo ? `<img src="${slip.schoolLogo}" alt="School Logo" style="max-width: 100px; max-height: 100px;" />` : ''}
          <h1>${slip.schoolName}</h1>
          <p>School Code: ${slip.schoolCode}</p>
        `,
        body: `
          <div style="border: 2px solid #000; padding: 20px; margin: 10px;">
            <h2>Student Information</h2>
            <p><strong>Name:</strong> ${slip.studentName}</p>
            <p><strong>Admission Number:</strong> ${slip.admissionNumber}</p>
            <hr />
            <h2>Login Credentials</h2>
            <p><strong>Username:</strong> ${slip.username}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 5px;">${slip.temporaryPassword}</code></p>
            <hr />
            <h2>Important Instructions</h2>
            <ul>
              ${slip.instructions.map((i) => `<li>${i}</li>`).join('')}
            </ul>
            <p><em>Generated on: ${slip.generatedAt.toLocaleDateString()}</em></p>
          </div>
        `,
      })),
    };
  }

  /**
   * Validate password strength
   * POST /credentials/validate-password
   */
  @Post('validate-password')
  async validatePassword(@Body('password') password: string) {
    return this.credentialService.validatePasswordStrength(password);
  }

  /**
   * Check username uniqueness
   * GET /credentials/check-username/:username
   */
  @Get('check-username/:username')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async checkUsername(
    @Param('username') username: string,
    @Request() req: any,
  ) {
    const schoolId = req.user.schoolId;
    const isUnique = await this.credentialService.isUsernameUnique(
      schoolId,
      username,
    );

    return {
      username,
      isUnique,
      message: isUnique
        ? 'Username is available'
        : 'Username already exists in this school',
    };
  }

  /**
   * List all credentials (pending and sent)
   * GET /credentials
   */
  @Get()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  async listCredentials(
    @Request() req: any,
    @Query('status') status?: 'pending' | 'sent' | 'all',
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const schoolId = req.user.schoolId;
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');

    return this.credentialService.listCredentials(schoolId, {
      status: status || 'all',
      role,
      search,
      page: pageNum,
      limit: limitNum,
    });
  }

  /**
   * Get credential statistics
   * GET /credentials/stats
   */
  @Get('stats')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  async getCredentialStats(@Request() req: any) {
    const schoolId = req.user.schoolId;
    return this.credentialService.getCredentialStats(schoolId);
  }

  /**
   * Mark credential as sent
   * POST /credentials/:id/send
   */
  @Post(':id/send')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  async markAsSent(
    @Param('id') id: string,
    @Body('sentVia') sentVia: string = 'MANUAL',
    @Request() req: any,
  ) {
    const schoolId = req.user.schoolId;
    return this.credentialService.markCredentialSent(id, schoolId, sentVia);
  }

  /**
   * Delete a pending credential
   * DELETE /credentials/:id
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  async deleteCredential(@Param('id') id: string, @Request() req: any) {
    const schoolId = req.user.schoolId;
    await this.credentialService.deletePendingCredential(id, schoolId);
    return { success: true, message: 'Credential deleted successfully' };
  }

  /**
   * Assign roll numbers by alphabet order
   * POST /credentials/assign-roll-numbers
   */
  @Post('assign-roll-numbers')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  async assignRollNumbersByAlphabet(
    @Request() req: any,
    @Body() body: { academicYearId: string },
  ) {
    const schoolId = req.user.schoolId;
    const result = await this.credentialService.assignRollNumbersByAlphabet(
      schoolId,
      body.academicYearId,
    );
    return { success: true, ...result };
  }

  // Private helper
  private extractYearFromAcademicYear(academicYear: string): string {
    if (academicYear.includes('-')) {
      const parts = academicYear.split('-');
      return parts[parts.length - 1];
    }
    if (academicYear.includes('/')) {
      const parts = academicYear.split('/');
      return parts[parts.length - 1];
    }
    return academicYear;
  }
}
