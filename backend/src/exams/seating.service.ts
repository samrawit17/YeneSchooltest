import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateSeatingPlanDto,
  SeatingMode,
  SeatingPlanResponseDto,
  SeatingOverviewResponseDto,
} from './dto/seating.dto';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class SeatingService {
  private readonly logger = new Logger(SeatingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all seating plans for a school
   */
  async getSeatingPlans(schoolId: string): Promise<SeatingPlanResponseDto[]> {
    const plans = await this.prisma.examSeatingPlan.findMany({
      where: { schoolId },
      include: {
        exam: {
          include: { subject: true },
        },
        assignments: {
          include: {
            section: {
              include: { class: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans as SeatingPlanResponseDto[];
  }

  /**
   * Get seating plan by exam ID
   */
  async getSeatingPlanByExamId(
    schoolId: string,
    examId: string,
  ): Promise<SeatingPlanResponseDto | null> {
    const plan = await this.prisma.examSeatingPlan.findFirst({
      where: { examId, schoolId },
      include: {
        exam: {
          include: { subject: true },
        },
        assignments: {
          include: {
            section: {
              include: { class: true },
            },
          },
        },
      },
    });

    return plan as SeatingPlanResponseDto | null;
  }

  /**
   * Get seating plan by exam type (MID_TERM, FINAL, etc.)
   */
  async getSeatingPlanByExamType(
    schoolId: string,
    examType: string,
  ): Promise<SeatingPlanResponseDto | null> {
    const plan = await this.prisma.examSeatingPlan.findFirst({
      where: { examType, schoolId },
      include: {
        exam: {
          include: { subject: true },
        },
        assignments: {
          include: {
            section: {
              include: { class: true },
            },
          },
        },
      },
    });

    return plan as SeatingPlanResponseDto | null;
  }

  /**
   * Create a new seating plan by exam type
   */
  async createSeatingPlanByExamType(
    schoolId: string,
    userId: string,
    examType: string,
    dto: CreateSeatingPlanDto,
  ): Promise<SeatingPlanResponseDto> {
    // Validate grade range
    if (dto.mode === SeatingMode.GRADE_RANGE) {
      if (!dto.toGrade) {
        throw new BadRequestException(
          'toGrade is required for grade range mode',
        );
      }
      if (dto.toGrade < dto.fromGrade) {
        throw new BadRequestException(
          'toGrade must be greater than or equal to fromGrade',
        );
      }
    }

    // Check if seating plan already exists for this exam type
    const existingPlan = await this.prisma.examSeatingPlan.findFirst({
      where: { examType, schoolId },
    });

    if (existingPlan) {
      throw new ConflictException(
        'A seating plan already exists for this exam type. Delete it first to create a new one.',
      );
    }

    // Create seating plan
    const plan = await this.prisma.examSeatingPlan.create({
      data: {
        schoolId,
        createdBy: userId,
        examType,
        mode: dto.mode,
        fromGrade: dto.fromGrade,
        toGrade: dto.toGrade,
        examCapacity: dto.examCapacity || 30,
        shuffle: dto.shuffle,
        useScoreThresholdFilter: dto.useScoreThresholdFilter || false,
        scoreThreshold: dto.scoreThreshold || 0,
      },
      include: {
        assignments: {
          include: {
            section: {
              include: { class: true },
            },
          },
        },
      },
    });

    return plan as SeatingPlanResponseDto;
  }

  /**
   * Delete student assignments (for regeneration)
   */
  async deleteSeatingStudents(schoolId: string, planId: string) {
    const plan = await this.prisma.examSeatingPlan.findFirst({
      where: { id: planId, schoolId },
      include: { assignments: true },
    });

    if (!plan) {
      throw new NotFoundException('Seating plan not found');
    }

    // Delete all student assignments
    await this.prisma.examSectionStudent.deleteMany({
      where: {
        assignmentId: { in: plan.assignments.map((a) => a.id) },
      },
    });

    return { message: 'Students deleted successfully' };
  }

  /**
   * @deprecated This method is deprecated. Use createSeatingPlanByExamType instead.
   * Create a new seating plan configuration (legacy - not used in new flow)
   */
  async createSeatingPlan(
    schoolId: string,
    userId: string,
    examId: string,
    dto: CreateSeatingPlanDto,
  ): Promise<SeatingPlanResponseDto> {
    // This method is kept for backward compatibility but the new flow uses createSeatingPlanByExamType
    // Validate exam belongs to school
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId },
      include: { subject: true },
    });

    if (!exam) {
      throw new NotFoundException(
        'Exam not found or does not belong to your school',
      );
    }

    // Validate grade range
    if (dto.mode === SeatingMode.GRADE_RANGE) {
      if (!dto.toGrade) {
        throw new BadRequestException(
          'toGrade is required for grade range mode',
        );
      }
      if (dto.toGrade < dto.fromGrade) {
        throw new BadRequestException(
          'toGrade must be greater than or equal to fromGrade',
        );
      }
    }

    // Check if seating plan already exists for this exam
    const existingPlan = await this.prisma.examSeatingPlan.findFirst({
      where: { examId, schoolId },
    });

    if (existingPlan) {
      throw new BadRequestException(
        'A seating plan already exists for this exam. Delete it first to create a new one.',
      );
    }

    // Create seating plan (without pre-selected sections - they'll be created dynamically during generation)
    const plan = await this.prisma.examSeatingPlan.create({
      data: {
        examId,
        schoolId,
        mode: dto.mode,
        fromGrade: dto.fromGrade,
        toGrade: dto.toGrade,
        examCapacity: dto.examCapacity || 30,
        shuffle: dto.shuffle,
        createdBy: userId,
      },
    });

    return this.getSeatingPlanById(schoolId, plan.id);
  }

  /**
   * Generate seating assignments for a plan
   * This creates sections dynamically based on examCapacity
   */
  async generateSeating(
    schoolId: string,
    planId: string,
  ): Promise<SeatingOverviewResponseDto> {
    // Fetch the seating plan
    const plan = await this.prisma.examSeatingPlan.findFirst({
      where: { id: planId, schoolId },
    });

    if (!plan) {
      throw new NotFoundException(
        'Seating plan not found or does not belong to your school',
      );
    }

    // Check if seating has already been generated
    const existingAssignments =
      await this.prisma.examSectionAssignment.findMany({
        where: { seatingPlanId: planId },
        include: { students: true },
      });

    if (
      existingAssignments.length > 0 &&
      existingAssignments.some((a) => a.students.length > 0)
    ) {
      throw new BadRequestException(
        'Seating has already been generated for this plan. Delete the existing seating first to regenerate.',
      );
    }

    // Get current academic year
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });

    if (!activeYear) {
      throw new BadRequestException('No active academic year found');
    }

    // Fetch students in the grade range from the plan
    // Note: academicYear stores the year name (e.g., "2018") not the ID
    const studentClasses = await this.prisma.studentClass.findMany({
      where: {
        schoolId,
        academicYear: activeYear.name,
        class: {
          grade: { gte: plan.fromGrade, lte: plan.toGrade },
        },
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        class: {
          select: { name: true, grade: true },
        },
        section: {
          select: { name: true },
        },
      },
    });

    if (studentClasses.length === 0) {
      throw new BadRequestException(
        'No students found in the selected grade range. Students must be enrolled in the active academic year (' + activeYear.name + '). Please enroll students first.',
      );
    }

    // Deduplicate students
    const uniqueStudents = new Map<
      string,
      {
        studentId: string;
        name: string;
        email: string | null;
        className: string;
        grade: number;
        sectionName: string;
      }
    >();

    for (const sc of studentClasses) {
      if (!uniqueStudents.has(sc.studentId)) {
        uniqueStudents.set(sc.studentId, {
          studentId: sc.student.id,
          name: sc.student.name,
          email: sc.student.email,
          className: sc.class.name,
          grade: sc.class.grade ?? 0,
          sectionName: sc.section.name,
        });
      }
    }

    const students = Array.from(uniqueStudents.values());

    // Apply score threshold filter if enabled
    let filteredStudents = students;
    if (plan.useScoreThresholdFilter && plan.scoreThreshold > 0) {
      const qualifiedIds = await this.getStudentsAboveThreshold(schoolId, plan.scoreThreshold);
      filteredStudents = students.filter((s) => qualifiedIds.has(s.studentId));
    }

    const totalStudents = filteredStudents.length;
    const examCapacity = plan.examCapacity || 30;

    // Calculate how many sections needed
    const numSections = Math.ceil(totalStudents / examCapacity);

    // Get existing sections in the grade range
    let sections = await this.prisma.section.findMany({
      where: {
        class: {
          schoolId,
          grade: { gte: plan.fromGrade, lte: plan.toGrade },
        },
      },
      include: { class: true },
      take: numSections,
    });

    // If not enough sections, create new ones
    if (sections.length < numSections) {
      const classesInRange = await this.prisma.class.findMany({
        where: {
          schoolId,
          academicYearId: activeYear.id,
          grade: { gte: plan.fromGrade, lte: plan.toGrade },
        },
      });

      const sectionsToCreate: {
        name: string;
        classId: string;
        capacity: number;
      }[] = [];
      for (let i = 0; i < numSections; i++) {
        const classItem = classesInRange[i % classesInRange.length];
        if (classItem) {
          const sectionName = `Exam Section ${i + 1}`;
          const exists = sections.find(
            (s) => s.name === sectionName && s.classId === classItem.id,
          );
          if (!exists) {
            sectionsToCreate.push({
              name: sectionName,
              classId: classItem.id,
              capacity: examCapacity,
            });
          }
        }
      }

      if (sectionsToCreate.length > 0) {
        const createdSections = await this.prisma.section.createMany({
          data: sectionsToCreate,
        });

        // Get the created sections
        const newSections = await this.prisma.section.findMany({
          where: {
            name: { in: sectionsToCreate.map((s) => s.name) },
            classId: { in: sectionsToCreate.map((s) => s.classId) },
          },
          include: { class: true },
        });
        sections = [...sections, ...newSections];
      }
    }

    if (sections.length === 0) {
      throw new BadRequestException(
        'No sections available for the selected grade range',
      );
    }

    // Shuffle students if required
    let studentsToAssign = [...filteredStudents];
    if (plan.shuffle) {
      studentsToAssign = this.shuffleArray(studentsToAssign);
    }

    // Distribute students into sections by examCapacity
    const sectionStudents: Map<string, typeof students> = new Map();
    sections.forEach((s) => sectionStudents.set(s.id, []));

    let sectionIndex = 0;
    let countInSection = 0;

    for (const student of studentsToAssign) {
      sectionStudents.get(sections[sectionIndex].id)!.push(student);
      countInSection++;
      if (countInSection >= examCapacity) {
        sectionIndex++;
        countInSection = 0;
        if (sectionIndex >= sections.length) {
          break;
        }
      }
    }

    // Create assignments and student assignments in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete existing empty assignments if any
      await tx.examSectionAssignment.deleteMany({
        where: { seatingPlanId: planId },
      });

      // Create new assignments
      for (const section of sections) {
        const assignedStudents = sectionStudents.get(section.id) || [];

        const assignment = await tx.examSectionAssignment.create({
          data: {
            seatingPlanId: planId,
            sectionId: section.id,
          },
        });

        // Create student assignments with order index
        await tx.examSectionStudent.createMany({
          data: assignedStudents.map((student, idx) => ({
            assignmentId: assignment.id,
            studentId: student.studentId,
            orderIndex: idx + 1,
          })),
        });
      }
    });

    return this.getSeatingOverview(schoolId, planId);
  }

  /**
   * Get seating plan by ID
   */
  async getSeatingPlanById(
    schoolId: string,
    planId: string,
  ): Promise<SeatingPlanResponseDto> {
    const plan = await this.prisma.examSeatingPlan.findFirst({
      where: { id: planId, schoolId },
      include: {
        exam: {
          include: { subject: true },
        },
        assignments: {
          include: {
            section: {
              include: { class: true },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(
        'Seating plan not found or does not belong to your school',
      );
    }

    return plan as SeatingPlanResponseDto;
  }

  /**
   * Get seating overview with all assignments
   */
  async getSeatingOverview(
    schoolId: string,
    planId: string,
  ): Promise<SeatingOverviewResponseDto> {
    const plan = await this.prisma.examSeatingPlan.findFirst({
      where: { id: planId, schoolId },
      include: {
        exam: {
          include: { subject: true },
        },
        assignments: {
          include: {
            section: {
              include: { class: true },
            },
            students: {
              include: {
                student: {
                  include: {
                    studentProfile: true,
                    studentClasses: {
                      where: { schoolId },
                      include: {
                        section: {
                          include: { class: true },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(
        'Seating plan not found or does not belong to your school',
      );
    }

    // Build overview response
    const sections = plan.assignments.map((assignment) => {
      const students = assignment.students.map((studentAssignment) => {
        const student = studentAssignment.student;
        const originalClass = student.studentClasses[0];

        return {
          orderIndex: studentAssignment.orderIndex,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          originalSection: originalClass?.section?.name || null,
          originalGrade: originalClass?.section?.class?.grade || null,
        };
      });

      return {
        sectionId: assignment.section.id,
        sectionName: assignment.section.name,
        className: assignment.section.class.name,
        grade: assignment.section.class.grade,
        capacity: assignment.section.capacity,
        examCapacity: plan.examCapacity || 30,
        assignedStudents: students.length,
        students,
      };
    });

    const totalStudents = sections.reduce(
      (sum, s) => sum + s.assignedStudents,
      0,
    );
    const totalCapacity = sections.reduce(
      (sum, s) =>
        sum +
        s.examCapacity * Math.ceil(s.assignedStudents / (s.examCapacity || 1)),
      0,
    );

    return {
      plan: plan as unknown as SeatingPlanResponseDto,
      totalStudents,
      totalSections: sections.length,
      totalCapacity:
        totalCapacity || sections.length * (plan.examCapacity || 30),
      sections,
    };
  }

  /**
   * Delete seating plan and all associated data
   */
  async deleteSeatingPlan(schoolId: string, planId: string): Promise<void> {
    const plan = await this.prisma.examSeatingPlan.findFirst({
      where: { id: planId, schoolId },
    });

    if (!plan) {
      throw new NotFoundException(
        'Seating plan not found or does not belong to your school',
      );
    }

    // Cascading deletes will handle assignments and students
    await this.prisma.examSeatingPlan.delete({
      where: { id: planId },
    });
  }

  /**
   * Generate PDF report for seating plan
   */
  async generatePdfReport(
    schoolId: string,
    planId: string,
    res: Response,
  ): Promise<void> {
    const overview = await this.getSeatingOverview(schoolId, planId);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const examTypeLabel = (overview.plan.examType || 'Exam').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=seating-plan-${examTypeLabel}.pdf`,
    );

    doc.pipe(res);

    // Generate PDF for each section
    const examTypeLabels: Record<string, string> = {
      MID_TERM: 'Mid Term Exam',
      FINAL: 'Final Exam',
      QUIZ: 'Quiz/Test',
      PRACTICAL: 'Practical Exam',
      ASSIGNMENT: 'Assignment',
    };
    
    for (let i = 0; i < overview.sections.length; i++) {
      const section = overview.sections[i];

      if (i > 0) {
        doc.addPage();
      }

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Exam Seating Plan', { align: 'center' });

      doc.moveDown();

      // Exam info - use exam type label and grade range
      const examTypeLabel = examTypeLabels[overview.plan.examType] || overview.plan.examType;
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Exam Type: ${examTypeLabel}`, {
          align: 'center',
        })
        .text(`Grade Range: Grade ${overview.plan.fromGrade} - ${overview.plan.toGrade}`, {
          align: 'center',
        })
        .text(
          `Generated: ${new Date().toLocaleDateString()}`,
          { align: 'center' },
        );

      doc.moveDown();

      // Section info
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`Section: ${section.sectionName} (${section.className})`);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          `Grade: ${section.grade || 'N/A'} | Capacity: ${section.capacity} | Assigned: ${section.assignedStudents}`,
        );

      doc.moveDown();

      // Table header
      const tableTop = doc.y;
      const colWidths = [40, 200, 150, 100];
      const headers = ['#', 'Student Name', 'Original Section', 'Grade'];

      doc.font('Helvetica-Bold').fontSize(10);
      let xPos = 50;
      headers.forEach((header, idx) => {
        doc.text(header, xPos, tableTop, {
          width: colWidths[idx],
          continued: false,
        });
        xPos += colWidths[idx];
      });

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(540, tableTop + 15)
        .stroke();

      // Table rows
      doc.font('Helvetica').fontSize(9);
      let yPos = tableTop + 25;

      section.students.forEach((student, idx) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        xPos = 50;
        doc.text(String(idx + 1), xPos, yPos, { width: colWidths[0] });
        xPos += colWidths[0];
        doc.text(student.studentName, xPos, yPos, { width: colWidths[1] });
        xPos += colWidths[1];
        doc.text(student.originalSection || 'N/A', xPos, yPos, {
          width: colWidths[2],
        });
        xPos += colWidths[2];
        doc.text(String(student.originalGrade || 'N/A'), xPos, yPos, {
          width: colWidths[3],
        });

        yPos += 20;
      });

      // Footer
      doc
        .fontSize(8)
        .text(
          `Generated on ${new Date().toLocaleString()} | Page ${i + 1} of ${overview.sections.length}`,
          50,
          750,
          { align: 'center' },
        );
    }

    doc.end();
  }

  /**
   * Generate Excel report for seating plan
   */
  async generateExcelReport(
    schoolId: string,
    planId: string,
    res: Response,
  ): Promise<void> {
    const overview = await this.getSeatingOverview(schoolId, planId);

    this.logger.debug(`Plan ID: ${planId}`);
    this.logger.debug(`Sections count: ${overview.sections.length}`);
    this.logger.debug(`Total students: ${overview.totalStudents}`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SMS System';
    workbook.created = new Date();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 30 },
    ];

    const examTypeLabels: Record<string, string> = {
      MID_TERM: 'Mid Term Exam',
      FINAL: 'Final Exam',
      QUIZ: 'Quiz/Test',
      PRACTICAL: 'Practical Exam',
      ASSIGNMENT: 'Assignment',
    };
    
    summarySheet.addRows([
      { field: 'Exam Type', value: examTypeLabels[overview.plan.examType] || overview.plan.examType },
      {
        field: 'Grade Range',
        value: `Grade ${overview.plan.fromGrade} - ${overview.plan.toGrade}`,
      },
      { field: 'Total Students', value: overview.totalStudents },
      { field: 'Total Sections', value: overview.totalSections },
      { field: 'Capacity per Section', value: overview.plan.examCapacity },
      { field: 'Shuffle', value: overview.plan.shuffle ? 'Yes' : 'No' },
      { field: 'Generated On', value: new Date().toLocaleString() },
    ]);

    // Sheet for each section
    this.logger.debug(`Creating section sheets for ${overview.sections.length} sections`);
    for (let i = 0; i < overview.sections.length; i++) {
      const section = overview.sections[i];
      this.logger.debug(`Section ${i}: ${section.sectionName}, students: ${section.students?.length || 0}`);
      
      const sectionName = section.sectionName
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 20);
      const className = section.className
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 10);
      const uniqueName = `${sectionName}_${className}_${i + 1}`.substring(0, 31);
      const sheet = workbook.addWorksheet(uniqueName);

      sheet.columns = [
        { header: '#', key: 'order', width: 5 },
        { header: 'Student Name', key: 'studentName', width: 30 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Original Section', key: 'originalSection', width: 20 },
        { header: 'Grade', key: 'grade', width: 10 },
      ];

      // Section header info
      sheet.mergeCells('A1:E1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = `Section: ${section.sectionName} | Class: ${section.className} | Grade: ${section.grade || 'N/A'}`;
      titleCell.font = { bold: true, size: 12 };
      titleCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('A2:E2');
      sheet.getCell('A2').value =
        `Capacity: ${section.examCapacity} | Assigned: ${section.assignedStudents}`;
      sheet.getCell('A2').alignment = { horizontal: 'center' };

      // Student rows start from row 4
      const students = section.students || [];
      for (const student of students) {
        sheet.addRow({
          order: student.orderIndex,
          studentName: student.studentName,
          email: student.studentEmail || '',
          originalSection: student.originalSection || 'N/A',
          grade: student.originalGrade || 'N/A',
        });
}
    this.logger.log(`Excel report generated successfully`);

    // Style header row
      if (students.length > 0) {
        sheet.getRow(4).font = { bold: true };
        sheet.getRow(4).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      }
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=seating-plan-${overview.plan.examType}.xlsx`,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.debug(`Excel buffer size: ${(buffer as any).length} bytes`);
    this.logger.debug(`Workbook has ${workbook.worksheets.length} worksheets`);
    
    // Verify the first section sheet has rows
    const firstSectionSheet = workbook.worksheets.find(ws => !ws.name.includes('Summary'));
    if (firstSectionSheet) {
      this.logger.debug(`First section sheet row count: ${firstSectionSheet.rowCount}`);
    }
    
    res.send(buffer);
  }

  /**
   * Fetch students based on seating plan criteria
   */
  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Distribute students across sections by capacity
   */
  private distributeStudentsToSections(
    students: { studentId: string; name: string; email: string | null }[],
    assignments: {
      id: string;
      section: { capacity: number };
    }[],
  ): {
    assignmentId: string;
    students: { studentId: string; orderIndex: number }[];
  }[] {
    const result: {
      assignmentId: string;
      students: { studentId: string; orderIndex: number }[];
    }[] = [];

    let studentIndex = 0;

    for (const assignment of assignments) {
      const sectionStudents: { studentId: string; orderIndex: number }[] = [];
      const capacity = assignment.section.capacity;

      for (let i = 0; i < capacity && studentIndex < students.length; i++) {
        sectionStudents.push({
          studentId: students[studentIndex].studentId,
          orderIndex: i + 1,
        });
        studentIndex++;
      }

      result.push({
        assignmentId: assignment.id,
        students: sectionStudents,
      });
    }

    return result;
  }

  /**
   * Get student IDs whose latest exam score meets or exceeds the threshold
   */
  private async getStudentsAboveThreshold(
    schoolId: string,
    threshold: number,
  ): Promise<Set<string>> {
    const results = await this.prisma.examResult.findMany({
      where: {
        exam: { schoolId },
        marks: { gte: threshold },
      },
      select: {
        studentId: true,
        marks: true,
        exam: {
          select: { date: true },
        },
      },
      orderBy: {
        exam: { date: 'desc' },
      },
    });

    // Keep only the latest result per student
    const latestByStudent = new Map<string, number>();
    for (const r of results) {
      if (!latestByStudent.has(r.studentId)) {
        latestByStudent.set(r.studentId, r.marks);
      }
    }

    // Return students whose latest score meets threshold
    const qualified = new Set<string>();
    for (const [studentId, marks] of latestByStudent) {
      if (marks >= threshold) {
        qualified.add(studentId);
      }
    }

    return qualified;
  }
}
