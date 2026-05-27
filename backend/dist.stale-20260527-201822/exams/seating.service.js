"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SeatingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatingService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const seating_dto_1 = require("./dto/seating.dto");
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
let SeatingService = SeatingService_1 = class SeatingService {
    prisma;
    logger = new common_2.Logger(SeatingService_1.name);
    allowedBigExamTypes = new Set([
        'MID_TERM',
        'FINAL',
    ]);
    constructor(prisma) {
        this.prisma = prisma;
    }
    isSupportedExamType(examType) {
        const normalized = String(examType || '').toUpperCase();
        return (normalized === 'MID_TERM' ||
            normalized === 'FINAL' ||
            normalized.endsWith('_MID') ||
            normalized.endsWith('_FINAL'));
    }
    isFinalExamType(examType) {
        const normalized = String(examType || '').toUpperCase();
        return normalized === 'FINAL' || normalized.endsWith('_FINAL');
    }
    isMidExamType(examType) {
        const normalized = String(examType || '').toUpperCase();
        return normalized === 'MID_TERM' || normalized.endsWith('_MID');
    }
    async getSeatingPlans(schoolId) {
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
        return plans;
    }
    async getSeatingPlanByExamId(schoolId, examId) {
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
        return plan;
    }
    async getSeatingPlanByExamType(schoolId, examType) {
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
        return plan;
    }
    async createSeatingPlanByExamType(schoolId, userId, examType, dto) {
        if (!this.isSupportedExamType(examType)) {
            throw new common_1.BadRequestException('Exam seating is only supported for mid and final exams');
        }
        if (dto.mode === seating_dto_1.SeatingMode.GRADE_RANGE) {
            if (!dto.toGrade) {
                throw new common_1.BadRequestException('toGrade is required for grade range mode');
            }
            if (dto.toGrade < dto.fromGrade) {
                throw new common_1.BadRequestException('toGrade must be greater than or equal to fromGrade');
            }
        }
        const existingPlan = await this.prisma.examSeatingPlan.findFirst({
            where: { examType, schoolId },
        });
        if (existingPlan) {
            throw new common_1.ConflictException('A seating plan already exists for this exam type. Delete it first to create a new one.');
        }
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
                useScoreThresholdFilter: Boolean(dto.useScoreThresholdFilter),
                scoreThreshold: dto.useScoreThresholdFilter ? dto.scoreThreshold || 0 : 0,
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
        return plan;
    }
    async deleteSeatingStudents(schoolId, planId) {
        const plan = await this.prisma.examSeatingPlan.findFirst({
            where: { id: planId, schoolId },
            include: { assignments: true },
        });
        if (!plan) {
            throw new common_1.NotFoundException('Seating plan not found');
        }
        await this.prisma.examSectionStudent.deleteMany({
            where: {
                assignmentId: { in: plan.assignments.map((a) => a.id) },
            },
        });
        return { message: 'Students deleted successfully' };
    }
    async createSeatingPlan(schoolId, userId, examId, dto) {
        const exam = await this.prisma.exam.findFirst({
            where: { id: examId, schoolId },
            include: { subject: true },
        });
        if (!exam) {
            throw new common_1.NotFoundException('Exam not found or does not belong to your school');
        }
        if (dto.mode === seating_dto_1.SeatingMode.GRADE_RANGE) {
            if (!dto.toGrade) {
                throw new common_1.BadRequestException('toGrade is required for grade range mode');
            }
            if (dto.toGrade < dto.fromGrade) {
                throw new common_1.BadRequestException('toGrade must be greater than or equal to fromGrade');
            }
        }
        const existingPlan = await this.prisma.examSeatingPlan.findFirst({
            where: { examId, schoolId },
        });
        if (existingPlan) {
            throw new common_1.BadRequestException('A seating plan already exists for this exam. Delete it first to create a new one.');
        }
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
    async generateSeating(schoolId, planId) {
        const plan = await this.prisma.examSeatingPlan.findFirst({
            where: { id: planId, schoolId },
        });
        if (!plan) {
            throw new common_1.NotFoundException('Seating plan not found or does not belong to your school');
        }
        if (!this.isSupportedExamType(plan.examType)) {
            throw new common_1.BadRequestException('Only mid and final exams can use exam seating');
        }
        const existingAssignments = await this.prisma.examSectionAssignment.findMany({
            where: { seatingPlanId: planId },
            include: { students: true },
        });
        if (existingAssignments.length > 0 &&
            existingAssignments.some((a) => a.students.length > 0)) {
            throw new common_1.BadRequestException('Seating has already been generated for this plan. Delete the existing seating first to regenerate.');
        }
        const matchingAssessments = await this.prisma.assessment.findMany({
            where: {
                schoolId,
            },
            select: {
                academicYearId: true,
                termId: true,
                type: true,
                startDate: true,
            },
            orderBy: {
                startDate: 'desc',
            },
        });
        const matchingAssessment = matchingAssessments.find((assessment) => {
            const normalizedType = String(assessment.type || '').toUpperCase();
            if (plan.examType === 'MID_TERM')
                return normalizedType === 'MID';
            if (plan.examType === 'FINAL')
                return normalizedType === 'FINAL';
            if (plan.examType.endsWith('_MID'))
                return normalizedType === 'MID';
            if (plan.examType.endsWith('_FINAL'))
                return normalizedType === 'FINAL';
            return false;
        });
        const activeYear = matchingAssessment
            ? await this.prisma.academicYear.findUnique({
                where: { id: matchingAssessment.academicYearId },
            })
            : await this.prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
            });
        if (!activeYear) {
            throw new common_1.BadRequestException('No active academic year found');
        }
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
            throw new common_1.BadRequestException('No students found in the selected grade range. Students must be enrolled in the active academic year (' + activeYear.name + '). Please enroll students first.');
        }
        const uniqueStudents = new Map();
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
        let orderedStudents = students;
        if (plan.useScoreThresholdFilter) {
            orderedStudents = this.isFinalExamType(plan.examType)
                ? await this.orderStudentsByMidResult(schoolId, students, activeYear.name, matchingAssessment?.termId ?? null)
                : this.isMidExamType(plan.examType)
                    ? await this.orderStudentsByPreviousFinalResult(schoolId, students, activeYear.id, activeYear.name, matchingAssessment?.termId ?? null)
                    : students;
        }
        const totalStudents = orderedStudents.length;
        const examCapacity = plan.examCapacity || 30;
        const numSections = Math.ceil(totalStudents / examCapacity);
        let sections = await this.prisma.section.findMany({
            where: {
                class: {
                    schoolId,
                    academicYearId: activeYear.id,
                    grade: { gte: plan.fromGrade, lte: plan.toGrade },
                },
            },
            include: { class: true },
            orderBy: [
                { class: { grade: 'asc' } },
                { class: { name: 'asc' } },
                { name: 'asc' },
            ],
        });
        if (sections.length === 0) {
            throw new common_1.BadRequestException('No sections available for the selected grade range');
        }
        if (sections.length < numSections) {
            throw new common_1.BadRequestException(`Not enough existing sections for this seating plan. Required: ${numSections}, available: ${sections.length}. Create the academic sections first instead of generating temporary exam sections.`);
        }
        sections = sections.slice(0, numSections);
        let studentsToAssign = [...orderedStudents];
        if (plan.shuffle) {
            studentsToAssign = this.shuffleArray(studentsToAssign);
        }
        const sectionStudents = new Map();
        sections.forEach((s) => sectionStudents.set(s.id, []));
        let sectionIndex = 0;
        let countInSection = 0;
        for (const student of studentsToAssign) {
            sectionStudents.get(sections[sectionIndex].id).push(student);
            countInSection++;
            if (countInSection >= examCapacity) {
                sectionIndex++;
                countInSection = 0;
                if (sectionIndex >= sections.length) {
                    break;
                }
            }
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.examSectionAssignment.deleteMany({
                where: { seatingPlanId: planId },
            });
            for (const section of sections) {
                const assignedStudents = sectionStudents.get(section.id) || [];
                const assignment = await tx.examSectionAssignment.create({
                    data: {
                        seatingPlanId: planId,
                        sectionId: section.id,
                    },
                });
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
    async getSeatingPlanById(schoolId, planId) {
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
            throw new common_1.NotFoundException('Seating plan not found or does not belong to your school');
        }
        return plan;
    }
    async getSeatingOverview(schoolId, planId) {
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
            throw new common_1.NotFoundException('Seating plan not found or does not belong to your school');
        }
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
        const totalStudents = sections.reduce((sum, s) => sum + s.assignedStudents, 0);
        const totalCapacity = sections.reduce((sum, s) => sum +
            s.examCapacity * Math.ceil(s.assignedStudents / (s.examCapacity || 1)), 0);
        return {
            plan: plan,
            totalStudents,
            totalSections: sections.length,
            totalCapacity: totalCapacity || sections.length * (plan.examCapacity || 30),
            sections,
        };
    }
    async deleteSeatingPlan(schoolId, planId) {
        const plan = await this.prisma.examSeatingPlan.findFirst({
            where: { id: planId, schoolId },
        });
        if (!plan) {
            throw new common_1.NotFoundException('Seating plan not found or does not belong to your school');
        }
        await this.prisma.examSeatingPlan.delete({
            where: { id: planId },
        });
    }
    async generatePdfReport(schoolId, planId, res) {
        const overview = await this.getSeatingOverview(schoolId, planId);
        const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
        const examTypeLabel = (overview.plan.examType || 'Exam').replace(/\s+/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=seating-plan-${examTypeLabel}.pdf`);
        doc.pipe(res);
        const examTypeLabels = {
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
            doc
                .fontSize(20)
                .font('Helvetica-Bold')
                .text('Exam Seating Plan', { align: 'center' });
            doc.moveDown();
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
                .text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.moveDown();
            doc
                .fontSize(14)
                .font('Helvetica-Bold')
                .text(`Section: ${section.sectionName} (${section.className})`);
            doc
                .fontSize(10)
                .font('Helvetica')
                .text(`Grade: ${section.grade || 'N/A'} | Capacity: ${section.capacity} | Assigned: ${section.assignedStudents}`);
            doc.moveDown();
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
            doc
                .fontSize(8)
                .text(`Generated on ${new Date().toLocaleString()} | Page ${i + 1} of ${overview.sections.length}`, 50, 750, { align: 'center' });
        }
        doc.end();
    }
    async generateExcelReport(schoolId, planId, res) {
        const overview = await this.getSeatingOverview(schoolId, planId);
        this.logger.debug(`Plan ID: ${planId}`);
        this.logger.debug(`Sections count: ${overview.sections.length}`);
        this.logger.debug(`Total students: ${overview.totalStudents}`);
        const workbook = new exceljs_1.default.Workbook();
        workbook.creator = 'SMS System';
        workbook.created = new Date();
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Field', key: 'field', width: 25 },
            { header: 'Value', key: 'value', width: 30 },
        ];
        const examTypeLabels = {
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
            sheet.mergeCells('A1:E1');
            const titleCell = sheet.getCell('A1');
            titleCell.value = `Section: ${section.sectionName} | Class: ${section.className} | Grade: ${section.grade || 'N/A'}`;
            titleCell.font = { bold: true, size: 12 };
            titleCell.alignment = { horizontal: 'center' };
            sheet.mergeCells('A2:E2');
            sheet.getCell('A2').value =
                `Capacity: ${section.examCapacity} | Assigned: ${section.assignedStudents}`;
            sheet.getCell('A2').alignment = { horizontal: 'center' };
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
            if (students.length > 0) {
                sheet.getRow(4).font = { bold: true };
                sheet.getRow(4).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' },
                };
            }
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=seating-plan-${overview.plan.examType}.xlsx`);
        const buffer = await workbook.xlsx.writeBuffer();
        this.logger.debug(`Excel buffer size: ${buffer.length} bytes`);
        this.logger.debug(`Workbook has ${workbook.worksheets.length} worksheets`);
        const firstSectionSheet = workbook.worksheets.find(ws => !ws.name.includes('Summary'));
        if (firstSectionSheet) {
            this.logger.debug(`First section sheet row count: ${firstSectionSheet.rowCount}`);
        }
        res.send(buffer);
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    distributeStudentsToSections(students, assignments) {
        const result = [];
        let studentIndex = 0;
        for (const assignment of assignments) {
            const sectionStudents = [];
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
    async orderStudentsByMidResult(schoolId, students, academicYear, termId) {
        if (students.length === 0) {
            return students;
        }
        const results = await this.prisma.subjectGrade.findMany({
            where: {
                schoolId,
                academicYear,
                studentId: { in: students.map((student) => student.studentId) },
                ...(termId ? { termId } : {}),
                midScore: { not: null },
            },
            select: {
                studentId: true,
                midScore: true,
            },
        });
        const totals = new Map();
        for (const r of results) {
            const score = r.midScore ?? null;
            if (score === null)
                continue;
            const current = totals.get(r.studentId) ?? { sum: 0, count: 0 };
            current.sum += score;
            current.count += 1;
            totals.set(r.studentId, current);
        }
        const rankedStudents = students
            .map((student) => {
            const result = totals.get(student.studentId);
            return {
                student,
                rankScore: result && result.count > 0 ? result.sum / result.count : Number.NEGATIVE_INFINITY,
            };
        })
            .sort((a, b) => b.rankScore - a.rankScore || a.student.name.localeCompare(b.student.name));
        if (rankedStudents.every((row) => row.rankScore === Number.NEGATIVE_INFINITY)) {
            throw new common_1.BadRequestException('No mid exam results were found for these students, so performance-based final seating cannot be generated yet');
        }
        return rankedStudents.map((row) => row.student);
    }
    async orderStudentsByPreviousFinalResult(schoolId, students, academicYearId, academicYear, currentTermId) {
        if (students.length === 0) {
            return students;
        }
        let referenceTermId = null;
        if (currentTermId) {
            const currentTerm = await this.prisma.term.findUnique({
                where: { id: currentTermId },
                select: { id: true, order: true, academicYearId: true },
            });
            if (currentTerm) {
                const previousTerm = await this.prisma.term.findFirst({
                    where: {
                        academicYearId: currentTerm.academicYearId,
                        order: { lt: currentTerm.order },
                    },
                    orderBy: { order: 'desc' },
                    select: { id: true },
                });
                referenceTermId = previousTerm?.id ?? null;
            }
        }
        const results = await this.prisma.subjectGrade.findMany({
            where: {
                schoolId,
                academicYear,
                studentId: { in: students.map((student) => student.studentId) },
                ...(referenceTermId ? { termId: referenceTermId } : {}),
                finalScore: { not: null },
            },
            select: {
                studentId: true,
                finalScore: true,
                term: {
                    select: {
                        order: true,
                        academicYearId: true,
                    },
                },
            },
            orderBy: [{ term: { order: 'desc' } }],
        });
        const latestFinalByStudent = new Map();
        for (const row of results) {
            if (row.term.academicYearId !== academicYearId)
                continue;
            if (row.finalScore === null || latestFinalByStudent.has(row.studentId))
                continue;
            latestFinalByStudent.set(row.studentId, row.finalScore);
        }
        const rankedStudents = students
            .map((student) => ({
            student,
            rankScore: latestFinalByStudent.get(student.studentId) ?? Number.NEGATIVE_INFINITY,
        }))
            .sort((a, b) => b.rankScore - a.rankScore || a.student.name.localeCompare(b.student.name));
        if (rankedStudents.every((row) => row.rankScore === Number.NEGATIVE_INFINITY)) {
            throw new common_1.BadRequestException('No previous final results were found for these students, so performance-based mid seating cannot be generated yet');
        }
        return rankedStudents.map((row) => row.student);
    }
};
exports.SeatingService = SeatingService;
exports.SeatingService = SeatingService = SeatingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SeatingService);
//# sourceMappingURL=seating.service.js.map