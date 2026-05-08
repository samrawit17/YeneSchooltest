import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/types/role.enum';

export interface StudentIdComponents {
  schoolCode: string;
  year: string;
  sequence: number;
}

export interface StaffIdComponents {
  schoolCode: string;
  roleType: 'T' | 'A' | 'P'; // Teacher, Admin, Parent
  sequence: number;
}

export interface GeneratedCredentials {
  username: string;
  temporaryPassword: string;
  hashedPassword: string;
}

export interface BulkCredentialResult {
  id: string;
  name: string;
  email?: string | null;
  username: string;
  temporaryPassword: string;
  role: Role;
}

export interface CredentialSlip {
  schoolLogo: string | null;
  schoolName: string;
  schoolCode: string | null;
  studentName: string;
  admissionNumber: string;
  username: string;
  temporaryPassword: string;
  instructions: string[];
  generatedAt: Date;
}

@Injectable()
export class CredentialService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Generate a simple student admission number
   * Format: STU-[SEQUENCE]
   * Example: STU-001
   */
  async generateStudentAdmissionNumber(
    schoolId: string,
    academicYear: string,
  ): Promise<string> {
    const resolvedAcademicYear = await this.resolveAcademicYearValue(
      schoolId,
      academicYear,
    );

    // Get or create counter for this school and academic year
    const counter = await this.getOrCreateSchoolYearCounter(
      schoolId,
      resolvedAcademicYear,
    );

    // Increment student count
    const newCount = counter.studentCount + 1;
    await this.prismaService.schoolYearCounter.update({
      where: { id: counter.id },
      data: { studentCount: newCount },
    });

    // Format: STU-SEQUENCE (e.g., STU-001)
    const sequence = this.padSequence(newCount, 3);
    return `STU-${sequence}`;
  }

  /**
   * Generate a secure temporary password
   * 8-12 characters, mixed case, numbers, special characters
   */
  generateTemporaryPassword(length: number = 10): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@#$%&*!?';

    const allChars = uppercase + lowercase + numbers + special;

    // Ensure at least one of each type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return this.shuffleString(password);
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Generate complete credentials for a student
   */
  async generateStudentCredentials(
    schoolId: string,
    academicYear: string,
  ): Promise<GeneratedCredentials> {
    const username = await this.generateStudentAdmissionNumber(
      schoolId,
      academicYear,
    );
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await this.hashPassword(temporaryPassword);

    return {
      username,
      temporaryPassword,
      hashedPassword,
    };
  }

  /**
   * Generate complete credentials for staff
   */
  async generateStaffCredentials(
    schoolId: string,
    role:
      | Role.TEACHER
      | Role.ADMIN
      | Role.REGISTRAR
      | Role.FINANCE
      | Role.PARENT,
    academicYear?: string,
  ): Promise<GeneratedCredentials> {
    const username = await this.generateStaffId(schoolId, role, academicYear);
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await this.hashPassword(temporaryPassword);

    return {
      username,
      temporaryPassword,
      hashedPassword,
    };
  }

  /**
   * Generate credentials for bulk student creation
   */
  async generateBulkStudentCredentials(
    schoolId: string,
    academicYear: string,
    count: number,
  ): Promise<GeneratedCredentials[]> {
    const credentials: GeneratedCredentials[] = [];

    for (let i = 0; i < count; i++) {
      const cred = await this.generateStudentCredentials(
        schoolId,
        academicYear,
      );
      credentials.push(cred);
    }

    return credentials;
  }

  /**
   * Generate credential slips for printing
   */
  async generateCredentialSlips(
    schoolId: string,
    credentials: BulkCredentialResult[],
  ): Promise<CredentialSlip[]> {
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { name: true, code: true, logoUrl: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return credentials.map((cred) => ({
      schoolLogo: school.logoUrl,
      schoolName: school.name,
      schoolCode: school.code,
      studentName: cred.name,
      admissionNumber: cred.username,
      username: cred.username,
      temporaryPassword: cred.temporaryPassword,
      instructions: [
        'Keep this credential slip secure and confidential.',
        'Log in using the username and temporary password above.',
        'You will be required to change your password on first login.',
        'Do not share your credentials with anyone.',
        'Contact the school administration if you lose your credentials.',
      ],
      generatedAt: new Date(),
    }));
  }

  /**
   * Export credentials to CSV format
   */
  exportToCSV(credentials: BulkCredentialResult[]): string {
    const headers = ['Name', 'Email', 'Username', 'Temporary Password', 'Role'];
    const rows = credentials.map((cred) => [
      cred.name,
      cred.email || '',
      cred.username,
      cred.temporaryPassword,
      cred.role,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[@#$%&*!?]/.test(password)) {
      errors.push(
        'Password must contain at least one special character (@#$%&!?)',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if username is unique within a school
   */
  async isUsernameUnique(schoolId: string, username: string): Promise<boolean> {
    const existingUser = await this.prismaService.user.findFirst({
      where: {
        schoolId,
        username,
      },
    });
    return !existingUser;
  }

  /**
   * Ensure username is unique, append suffix if necessary
   */
  async ensureUniqueUsername(
    schoolId: string,
    baseUsername: string,
  ): Promise<string> {
    let username = baseUsername;
    let suffix = 1;

    while (!(await this.isUsernameUnique(schoolId, username))) {
      // If username ends with a sequence number, increment it
      const match = baseUsername.match(/^(.+)-(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2]) + suffix;
        username = `${prefix}-${this.padSequence(num, 4)}`;
      } else {
        username = `${baseUsername}-${suffix}`;
      }
      suffix++;
    }

    return username;
  }

  /**
   * Create a password reset token
   */
  async createPasswordResetToken(userId: string): Promise<string> {
    // Generate a secure random token
    const token = this.generateTemporaryPassword(32);
    const hashedToken = await this.hashPassword(token);

    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Invalidate any existing tokens for this user
    await this.prismaService.passwordResetToken.updateMany({
      where: { userId, used: false },
      data: { used: true, usedAt: new Date() },
    });

    // Create new token
    await this.prismaService.passwordResetToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Validate and use a password reset token
   */
  async validatePasswordResetToken(token: string): Promise<string | null> {
    const tokens = await this.prismaService.passwordResetToken.findMany({
      where: {
        used: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    for (const resetToken of tokens) {
      const isValid = await bcrypt.compare(token, resetToken.token);
      if (isValid) {
        return resetToken.userId;
      }
    }

    return null;
  }

  /**
   * Mark a password reset token as used
   */
  async markTokenAsUsed(token: string): Promise<void> {
    const tokens = await this.prismaService.passwordResetToken.findMany({
      where: { used: false },
    });

    for (const resetToken of tokens) {
      const isValid = await bcrypt.compare(token, resetToken.token);
      if (isValid) {
        await this.prismaService.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true, usedAt: new Date() },
        });
        break;
      }
    }
  }

  /**
   * Log credential generation for audit
   */
  async logCredentialGeneration(
    schoolId: string,
    generatedById: string,
    targetType: string,
    targetCount: number,
    academicYear: string | null,
    usernames: string[],
  ): Promise<void> {
    await this.prismaService.credentialGenerationLog.create({
      data: {
        schoolId,
        generatedById,
        targetType,
        targetCount,
        academicYear,
        usernames: JSON.stringify(usernames),
      },
    });
  }

  // Private helper methods

  private async getOrCreateSchoolYearCounter(
    schoolId: string,
    academicYear: string,
  ) {
    let counter = await this.prismaService.schoolYearCounter.findUnique({
      where: {
        schoolId_academicYear: {
          schoolId,
          academicYear,
        },
      },
    });

    if (!counter) {
      counter = await this.prismaService.schoolYearCounter.create({
        data: {
          schoolId,
          academicYear,
          studentCount: 0,
          teacherCount: 0,
          adminCount: 0,
          parentCount: 0,
          staffCount: 0,
        },
      });
    }

    return counter;
  }

  private extractYearFromAcademicYear(academicYear: string): string {
    // Handle formats like "2025-2026" or "2025/2026" or just "2025"
    if (academicYear.includes('-')) {
      const parts = academicYear.split('-');
      return parts[parts.length - 1]; // Return the end year
    }
    if (academicYear.includes('/')) {
      const parts = academicYear.split('/');
      return parts[parts.length - 1]; // Return the end year
    }
    return academicYear;
  }

  private getRoleTypePrefix(role: Role): string {
    switch (role) {
      case Role.TEACHER:
        return 'TH';
      case Role.ADMIN:
        return 'AD';
      case Role.PARENT:
        return 'PR';
      case Role.FINANCE:
        return 'FI';
      case Role.REGISTRAR:
        return 'RE';
      default:
        return 'ST'; // Unknown
    }
  }

  private padSequence(num: number, length: number): string {
    return num.toString().padStart(length, '0');
  }

  private shuffleString(str: string): string {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  /**
   * Generate staff ID with simple format
   * Teacher: TH-001
   * Admin: AD-001
   * Parent: PR-001
   * Finance: FI-001
   * Registrar: RE-001
   */
  async generateStaffId(
    schoolId: string,
    role: Role,
    academicYear?: string,
  ): Promise<string> {
    // Determine role type prefix
    const roleType = this.getRoleTypePrefix(role);

    const resolvedAcademicYear = academicYear
      ? await this.resolveAcademicYearValue(schoolId, academicYear)
      : `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    // Get or create counter
    const counter = await this.getOrCreateSchoolYearCounter(
      schoolId,
      resolvedAcademicYear,
    );

    // Increment appropriate counter based on role
    let newCount: number;
    let updateField: keyof typeof counter | null = null;

    switch (role) {
      case Role.TEACHER:
        newCount = counter.teacherCount + 1;
        updateField = 'teacherCount';
        break;
      case Role.ADMIN:
        newCount = counter.adminCount + 1;
        updateField = 'adminCount';
        break;
      case Role.PARENT:
        newCount = counter.parentCount + 1;
        updateField = 'parentCount';
        break;
      case Role.FINANCE:
      case Role.REGISTRAR:
        newCount = counter.staffCount + 1;
        updateField = 'staffCount';
        break;
      default:
        throw new BadRequestException('Invalid role for staff ID generation');
    }

    // Update counter
    await this.prismaService.schoolYearCounter.update({
      where: { id: counter.id },
      data: { [updateField]: newCount } as any,
    });

    // Format: TYPE-SEQUENCE (e.g., TH-001)
    const sequence = this.padSequence(newCount, 3);
    return `${roleType}-${sequence}`;
  }

  // Duplicate code removed

  async generateSectionRollNumber(
    schoolId: string,
    className: string,
    sectionName: string,
    studentName?: string,
    prismaArg?: any,
  ): Promise<string> {
    const prisma = prismaArg || this.prismaService;

    // Get all students in this class and section, sorted alphabetically
    const studentsInSection = await prisma.studentProfile.findMany({
      where: {
        schoolId,
        className,
        section: sectionName,
      },
      include: {
        user: true,
      },
      orderBy: {
        user: { name: 'asc' },
      },
    });

    // Find the position of this student (if provided) or add to end
    let position = studentsInSection.length + 1;

    if (studentName) {
      const existingIndex = studentsInSection.findIndex(
        (s) => s.user?.name?.toLowerCase() === studentName.toLowerCase(),
      );
      if (existingIndex >= 0) {
        position = existingIndex + 1;
      }
    }

    return String(position);
  }

  async assignRollNumbersByAlphabet(
    schoolId: string,
    academicYear: string,
  ): Promise<{ updated: number }> {
    const studentClasses = await this.prismaService.studentClass.findMany({
      where: { schoolId, academicYear },
      include: {
        student: { select: { name: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });

    // Group by class+section using classId-sectionId as key
    const groupedBySection = new Map<string, typeof studentClasses>();
    for (const sc of studentClasses) {
      const key = `${sc.classId}-${sc.sectionId}`;
      if (!groupedBySection.has(key)) groupedBySection.set(key, []);
      groupedBySection.get(key)!.push(sc);
    }

    let updated = 0;
    for (const [, students] of groupedBySection) {
      // Sort alphabetically by student name
      const sorted = [...students].sort((a, b) =>
        (a.student?.name || '').localeCompare(b.student?.name || ''),
      );

      for (let i = 0; i < sorted.length; i++) {
        // Get student profile ID via studentClass lookup
        const profile = await this.prismaService.studentProfile.findFirst({
          where: { userId: sorted[i].studentId },
        });

        if (profile) {
          await this.prismaService.studentProfile.update({
            where: { id: profile.id },
            data: { rollNumber: String(i + 1) },
          });
          updated++;
        }
      }
    }

    return { updated };
  }

  async createPendingCredential(
    data: {
      schoolId: string;
      userId: string;
      name: string;
      email?: string | null;
      username: string;
      temporaryPassword: string;
      role: string;
    },
    prisma: Pick<PrismaService, 'pendingCredential'> = this.prismaService,
  ) {
    return prisma.pendingCredential.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        name: data.name,
        email: data.email || null,
        username: data.username,
        temporaryPassword: data.temporaryPassword,
        role: data.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private async resolveAcademicYearValue(
    schoolId: string,
    academicYear: string,
  ): Promise<string> {
    const academicYearRecord = await this.prismaService.academicYear.findFirst({
      where: {
        schoolId,
        OR: [{ id: academicYear }, { name: academicYear }],
      },
      select: { name: true },
    });

    return academicYearRecord?.name || academicYear;
  }

  /**
   * List all credentials with filters
   */
  async listCredentials(
    schoolId: string,
    options: {
      status: 'pending' | 'sent' | 'all';
      role?: string;
      search?: string;
      page: number;
      limit: number;
    },
  ) {
    const { status, role, search, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (status === 'pending') {
      where.isSent = false;
    } else if (status === 'sent') {
      where.isSent = true;
    }

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prismaService.pendingCredential.count({ where }),
      this.prismaService.pendingCredential.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, isActive: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get credential statistics
   */
  async getCredentialStats(schoolId: string) {
    const [total, pending, sent, byRole] = await Promise.all([
      this.prismaService.pendingCredential.count({ where: { schoolId } }),
      this.prismaService.pendingCredential.count({
        where: { schoolId, isSent: false },
      }),
      this.prismaService.pendingCredential.count({
        where: { schoolId, isSent: true },
      }),
      this.prismaService.pendingCredential.groupBy({
        by: ['role'],
        where: { schoolId },
        _count: { role: true },
      }),
    ]);

    return {
      total,
      pending,
      sent,
      byRole: byRole.map((r) => ({ role: r.role, count: r._count.role })),
    };
  }

  /**
   * Mark credential as sent
   */
  async markCredentialSent(
    id: string,
    schoolId: string,
    sentVia: string = 'MANUAL',
  ) {
    const credential = await this.prismaService.pendingCredential.findFirst({
      where: { id, schoolId },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return this.prismaService.pendingCredential.update({
      where: { id },
      data: {
        isSent: true,
        sentAt: new Date(),
        sentVia,
      },
    });
  }

  /**
   * Delete pending credential
   */
  async deletePendingCredential(id: string, schoolId: string) {
    const credential = await this.prismaService.pendingCredential.findFirst({
      where: { id, schoolId },
      include: {
        user: {
          select: { id: true, isActive: true },
        },
      },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    // Also delete the user if exists and not activated
    if (credential.userId && credential.user) {
      if (!credential.user.isActive) {
        await this.prismaService.user.delete({
          where: { id: credential.userId },
        });
      }
    }

    return this.prismaService.pendingCredential.delete({ where: { id } });
  }
}
