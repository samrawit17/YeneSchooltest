import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, EnrollmentStatus } from '@prisma/client';
import { AutoAssignmentService } from '../auto-assignment/auto-assignment.service';
import { CredentialService } from '../credential/credential.service';

export interface CreateStudentDto {
  email: string;
  name: string;
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
}

export interface UpdateStudentDto {
  name?: string;
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
}

export interface ApproveEnrollmentDto {
  className: string;
  section: string;
  rollNumber: string;
}

export interface AssignClassDto {
  className: string;
  section: string;
  rollNumber: string;
}

@Injectable()
export class RegistrarService {
  constructor(
    private prismaService: PrismaService,
    private autoAssignmentService: AutoAssignmentService,
    private credentialService: CredentialService,
  ) {}

  async createStudent(
    createStudentDto: CreateStudentDto,
    schoolId: string,
    createdById: string,
  ) {
    const {
      email,
      name,
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
    } = createStudentDto;

    // Check if school exists
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Check if email already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Generate student code (using unified credential service)
    const studentCreds =
      await this.credentialService.generateStudentCredentials(
        schoolId,
        academicYear,
      );
    const studentCode = studentCreds.username;

    // Create user with temporary password
    const user = await this.prismaService.user.create({
      data: {
        email,
        name,
        username: studentCode,
        password: studentCreds.hashedPassword,
        role: Role.STUDENT,
        schoolId,
        avatarUrl: photo || undefined,
        isActive: false,
        mustChangePassword: true,
      },
    });

    // Create student profile
    const studentProfile = await this.prismaService.studentProfile.create({
      data: {
        userId: user.id,
        schoolId,
        studentCode,
        studentId: studentCode,
        enrollmentStatus: EnrollmentStatus.PENDING,
        academicYear,
        gender,
        address,
        phone,
        emergencyContact: emergencyContact
          ? JSON.stringify(emergencyContact)
          : undefined,
        documents: documents ? JSON.stringify(documents) : undefined,
      },
    });

    // Create enrollment
    const enrollment = await this.prismaService.enrollment.create({
      data: {
        studentId: user.id,
        schoolId,
        status: EnrollmentStatus.PENDING,
        academicYear,
        gradeId,
      },
    });

    return {
      user,
      studentProfile,
      enrollment,
      studentCode,
      username: studentCreds.username,
      temporaryPassword: studentCreds.temporaryPassword,
    };
  }

  async getStudents(
    schoolId: string,
    filters?: { status?: EnrollmentStatus; grade?: number },
  ) {
    const where: any = { schoolId };

    const studentProfiles = await this.prismaService.studentProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrollments = await this.prismaService.enrollment.findMany({
      where: {
        studentId: { in: studentProfiles.map((sp) => sp.userId) },
      },
    });

    return studentProfiles.map((profile) => ({
      ...profile,
      enrollment: enrollments.find((e) => e.studentId === profile.userId),
    }));
  }

  async getStudentById(studentId: string, schoolId: string) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        userId: studentId,
        schoolId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const enrollment = await this.prismaService.enrollment.findFirst({
      where: {
        studentId,
        schoolId,
      },
    });

    return {
      ...student,
      enrollment,
    };
  }

  async updateStudent(
    studentId: string,
    schoolId: string,
    updateStudentDto: UpdateStudentDto,
  ) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        userId: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const {
      name,
      gender,
      address,
      phone,
      emergencyContact,
      guardianName,
      guardianPhone,
      guardianEmail,
      documents,
    } = updateStudentDto;

    if (name) {
      await this.prismaService.user.update({
        where: { id: studentId },
        data: { name },
      });
    }

    return this.prismaService.studentProfile.update({
      where: { userId: studentId },
      data: {
        ...(gender && { gender }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(emergencyContact && {
          emergencyContact: JSON.stringify(emergencyContact),
        }),
        ...(guardianName && { guardianName }),
        ...(guardianPhone && { guardianPhone }),
        ...(guardianEmail && { guardianEmail }),
        ...(documents && { documents: JSON.stringify(documents) }),
      },
    });
  }

  async getPendingEnrollments(schoolId: string) {
    const enrollments = await this.prismaService.enrollment.findMany({
      where: {
        schoolId,
        status: EnrollmentStatus.PENDING,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const studentIds = enrollments.map((e) => e.studentId);
    const studentProfiles = await this.prismaService.studentProfile.findMany({
      where: {
        userId: { in: studentIds },
      },
    });

    return enrollments.map((enrollment) => ({
      ...enrollment,
      studentProfile: studentProfiles.find(
        (sp) => sp.userId === enrollment.studentId,
      ),
    }));
  }

  async getEnrollments(schoolId: string, status?: string, page: number = 1) {
    const PAGE_SIZE = 10;
    const skip = (page - 1) * PAGE_SIZE;

    const where: any = {
      schoolId,
    };

    if (status && status !== '') {
      where.status = status.toUpperCase();
    }

    const [enrollments, total] = await Promise.all([
      this.prismaService.enrollment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE,
        skip,
      }),
      this.prismaService.enrollment.count({ where }),
    ]);

    const studentIds = enrollments.map((e) => e.studentId);
    const studentProfiles = await this.prismaService.studentProfile.findMany({
      where: {
        userId: { in: studentIds },
      },
    });

    const enrichments = enrollments.map((enrollment) => ({
      ...enrollment,
      user: enrollment.student,
      studentProfile: studentProfiles.find(
        (sp) => sp.userId === enrollment.studentId,
      ),
    }));

    return {
      data: enrichments,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async approveEnrollment(
    enrollmentId: string,
    schoolId: string,
    approveData: ApproveEnrollmentDto,
  ) {
    const enrollment = await this.prismaService.enrollment.findFirst({
      where: {
        id: enrollmentId,
        schoolId,
      },
      include: {
        student: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new BadRequestException('Enrollment is not pending');
    }

    const { className, section, rollNumber } = approveData;

    await this.prismaService.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.APPROVED,
      },
    });

    await this.prismaService.studentProfile.update({
      where: { userId: enrollment.studentId },
      data: {
        enrollmentStatus: EnrollmentStatus.APPROVED,
        className,
        section,
        rollNumber,
      },
    });

    return { message: 'Enrollment approved successfully' };
  }

  /**
   * Approve enrollment with automatic class/section assignment
   * This is the recommended method for approving enrollments
   *
   * @param enrollmentId - The enrollment to approve
   * @param schoolId - The school context
   * @returns AutoAssignmentResult with assignment details
   */
  async approveEnrollmentAuto(enrollmentId: string, schoolId: string) {
    return this.autoAssignmentService.autoAssignStudent(enrollmentId, schoolId);
  }

  async rejectEnrollment(
    enrollmentId: string,
    schoolId: string,
    rejectionReason: string,
  ) {
    const enrollment = await this.prismaService.enrollment.findFirst({
      where: {
        id: enrollmentId,
        schoolId,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new BadRequestException('Enrollment is not pending');
    }

    await this.prismaService.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.REJECTED,
        rejectionReason,
      },
    });

    await this.prismaService.studentProfile.update({
      where: { userId: enrollment.studentId },
      data: {
        enrollmentStatus: EnrollmentStatus.REJECTED,
      },
    });

    return { message: 'Enrollment rejected successfully' };
  }

  async assignClass(
    studentId: string,
    schoolId: string,
    assignData: AssignClassDto,
  ) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        userId: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const { className, section, rollNumber } = assignData;

    await this.prismaService.studentProfile.update({
      where: { userId: studentId },
      data: {
        className,
        section,
        rollNumber,
      },
    });

    return {
      message: 'Class assigned successfully',
      studentId,
      className,
      section,
      rollNumber,
    };
  }

  async uploadDocuments(studentId: string, schoolId: string, documents: any[]) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        userId: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const existingDocs = student.documents ? JSON.parse(student.documents) : [];

    const updatedDocs = [
      ...existingDocs,
      ...documents.map((doc) => ({
        ...doc,
        uploadedAt: new Date().toISOString(),
      })),
    ];

    await this.prismaService.studentProfile.update({
      where: { userId: studentId },
      data: {
        documents: JSON.stringify(updatedDocs),
      },
    });

    return {
      message: 'Documents uploaded successfully',
      studentId,
      documentCount: updatedDocs.length,
    };
  }

  private async generateStudentCode(schoolId: string): Promise<string> {
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const schoolPrefix = school.name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    return `${schoolPrefix}${timestamp}${random}`;
  }

  private generateTempPassword(): string {
    return (
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8)
    );
  }
}
