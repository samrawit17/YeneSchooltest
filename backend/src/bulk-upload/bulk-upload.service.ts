import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/types/role.enum';
import { CredentialService } from '../credential/credential.service';

export interface BulkUserRecord {
  full_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mother_name?: string;
  mother_phone?: string;
  role: string;
  // Student-specific fields
  current_class?: string;
  next_class?: string;
  gender?: string;
  section?: string;
  roll_number?: string;
  student_code?: string;
  // Parent-specific fields
  parent_name?: string;
  parent_phone?: string;
  student_email?: string;
  student_id?: string;
  relation?: string;
}

export interface GeneratedCredential {
  name: string;
  email?: string;
  phone?: string;
  username: string;
  temporaryPassword: string;
  role: Role;
}

export interface BulkUploadResult {
  status: 'success' | 'partial' | 'failed';
  message: string;
  totalRecords: number;
  successfulCount: number;
  failedCount: number;
  failedRecords: Array<{
    record: BulkUserRecord;
    error: string;
  }>;
  credentials: GeneratedCredential[];
}

@Injectable()
export class BulkUploadService {
  constructor(
    private prismaService: PrismaService,
    private credentialService: CredentialService,
  ) {}

  private getSectionNameByIndex(index: number) {
    let current = index;
    let name = '';

    do {
      name = String.fromCharCode(65 + (current % 26)) + name;
      current = Math.floor(current / 26) - 1;
    } while (current >= 0);

    return name;
  }

  private getNormalizedStudentName(record: {
    full_name?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
  }) {
    const joined =
      [
        record.first_name,
        record.middle_name,
        record.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() || record.full_name || '';

    return joined.replace(/\s+/g, ' ').trim();
  }

  private sortRecordsAlphabetically<T extends {
    full_name?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
  }>(records: T[]) {
    return [...records].sort((left, right) =>
      this.getNormalizedStudentName(left).localeCompare(
        this.getNormalizedStudentName(right),
        undefined,
        { sensitivity: 'base' },
      ),
    );
  }

  private normalizeStudentAndParentNames(
    fullName?: string,
    explicitParentName?: string,
  ): { studentName: string; parentName?: string } {
    const normalizedStudentName = String(fullName || '')
      .replace(/\s+/g, ' ')
      .trim();
    const normalizedExplicitParentName =
      explicitParentName?.replace(/\s+/g, ' ').trim() || undefined;

    if (!normalizedStudentName) {
      return { studentName: '', parentName: normalizedExplicitParentName };
    }

    if (normalizedExplicitParentName) {
      return {
        studentName: normalizedStudentName,
        parentName: normalizedExplicitParentName,
      };
    }

    const nameParts = normalizedStudentName.split(' ').filter(Boolean);
    if (nameParts.length >= 3) {
      return {
        studentName: nameParts.slice(0, 2).join(' '),
        parentName: nameParts.slice(1).join(' '),
      };
    }

    if (nameParts.length === 2) {
      // When there's no explicit parent_name, don't derive parent from a 2-part name
      // (e.g., "John Bekele" - Bekele is just the last name, not a parent)
      if (!normalizedExplicitParentName) {
        return { studentName: normalizedStudentName };
      }
      return {
        studentName: normalizedStudentName,
        parentName: nameParts[1],
      };
    }

    return { studentName: normalizedStudentName };
  }

  private buildGradeLevelLookups(
    gradeLevels: { id: string; name: string; level: number }[],
  ) {
    const byLevel = new Map<
      number,
      { id: string; name: string; level: number }
    >();
    const byName = new Map<
      string,
      { id: string; name: string; level: number }
    >();

    for (const level of gradeLevels) {
      byLevel.set(level.level, level);
      byName.set(level.name.trim().toLowerCase(), level);
    }

    return { byLevel, byName };
  }

  private extractSectionFromClassLabel(rawGrade?: string): string | null {
    if (!rawGrade) return null;
    const trimmed = String(rawGrade).trim();
    if (!trimmed) return null;

    const sectionMatch = trimmed.match(
      /(?:grade\s*\d+|\d+)\s*[-\s]*([A-Za-z])$/i,
    );
    if (sectionMatch?.[1]) return sectionMatch[1].toUpperCase();

    const numericSuffixMatch = trimmed.match(/^\d+\s*([A-Za-z])$/);
    if (numericSuffixMatch?.[1]) return numericSuffixMatch[1].toUpperCase();

    const kMatch = trimmed.match(/^(?:k|kg|kindergarten)\s*[-\s]*([A-Za-z])$/i);
    if (kMatch?.[1]) return kMatch[1].toUpperCase();

    const preKMatch = trimmed.match(
      /^(?:pre-?k|prekindergarten)\s*[-\s]*([A-Za-z])$/i,
    );
    if (preKMatch?.[1]) return preKMatch[1].toUpperCase();

    return null;
  }

  private resolveGradeInfo(
    rawGrade: string,
    lookups: ReturnType<BulkUploadService['buildGradeLevelLookups']>,
    allowedLevels?: Set<number>,
  ): { name: string; level?: number; id?: string } {
    const trimmed = String(rawGrade || '').trim();
    if (!trimmed) {
      return { name: 'Unassigned' };
    }

    const lower = trimmed.toLowerCase();

    const preKMatches = [
      'pre-k',
      'prek',
      'pre k',
      'prekindergarten',
      'pre-kindergarten',
    ];
    if (preKMatches.includes(lower)) {
      const level = lookups.byLevel.get(-1);
      if (level) return { name: level.name, level: level.level, id: level.id };
      return allowedLevels?.has(-1)
        ? { name: 'Pre-Kindergarten', level: -1 }
        : { name: 'Unassigned' };
    }

    const kMatches = ['k', 'kg', 'kindergarten', 'k-a', 'k-b', 'kg-a', 'kg-b'];
    if (kMatches.includes(lower)) {
      const level = lookups.byLevel.get(0);
      if (level) return { name: level.name, level: level.level, id: level.id };
      return allowedLevels?.has(0)
        ? { name: 'Kindergarten', level: 0 }
        : { name: 'Unassigned' };
    }

    const gradeMatch = trimmed.match(/grade\s*(\d+)/i);
    const numericMatch = trimmed.match(/^\d+$/);
    const leadingNumberMatch = trimmed.match(/^(\d+)/);
    const levelValue = gradeMatch
      ? parseInt(gradeMatch[1], 10)
      : numericMatch
        ? parseInt(trimmed, 10)
        : leadingNumberMatch
          ? parseInt(leadingNumberMatch[1], 10)
          : undefined;

    if (levelValue !== undefined && !isNaN(levelValue)) {
      if (allowedLevels && !allowedLevels.has(levelValue)) {
        return { name: `Grade ${levelValue}`, level: levelValue };
      }
      const level = lookups.byLevel.get(levelValue);
      return level
        ? { name: level.name, level: level.level, id: level.id }
        : { name: `Grade ${levelValue}`, level: levelValue };
    }

    const byName = lookups.byName.get(lower);
    if (byName) {
      return { name: byName.name, level: byName.level, id: byName.id };
    }

    return { name: trimmed };
  }

  /**
   * Parse CSV file content (simple manual parser)
   */
  parseCSV(content: string): BulkUserRecord[] {
    try {
      const lines = content.split('\n').filter((line) => line.trim() !== '');
      if (lines.length < 2) {
        throw new BadRequestException(
          'CSV file must have a header row and at least one data row',
        );
      }

      // Parse headers and filter out '#' and other non-meaningful columns
      const rawHeaders = this.parseCSVLine(lines[0]);
      const headers = rawHeaders
        .map((h) =>
          h
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, ''),
        )
        .filter((h) => h && h !== '#' && !/^\d+$/.test(h));

      const findIdx = (names: string[]) =>
        headers.findIndex((h) => names.includes(h));

      // Debug: log headers
      console.log('Parsed headers:', headers);
      console.log('Header count:', headers.length);

      const nameIdx = findIdx([
        'full_name',
        'fullname',
        'name',
        'student_name',
      ]);
      const firstIdx = findIdx(['first_name', 'firstname', 'fname']);
      const middleIdx = findIdx(['middle_name', 'middlename', 'mname']);
      const lastIdx = findIdx(['last_name', 'lastname', 'lname']);
      const emailIdx = findIdx(['email']);
      const phoneIdx = findIdx([
        'phone',
        'mobile',
        'telephone',
        'phone_number',
      ]);
      const roleIdx = findIdx(['role']);
      const classIdx = findIdx(['current_class', 'class', 'classname']);
      const genderIdx = findIdx(['gender']);
      const sectionIdx = findIdx(['section']);
      const studEmailIdx = findIdx(['student_email', 'linked_student_email']);
      const studIdIdx = findIdx([
        'student_id',
        'linked_student_id',
        'student_code',
        'code',
      ]);
      const relationIdx = findIdx(['relation', 'relationship']);
      const parentNameIdx = findIdx([
        'parent_name',
        'parent_fullname',
        'guardian_name',
        'parent',
      ]);
      const parentPhoneIdx = findIdx([
        'parent_phone',
        'parent_mobile',
        'guardian_phone',
      ]);
      const motherNameIdx = findIdx([
        'mother_name',
        'mother_fullname',
        'mothers_name',
      ]);
      const motherPhoneIdx = findIdx([
        'mother_phone',
        'mother_mobile',
        'mothers_phone',
      ]);
      const rollNumberIdx = findIdx(['roll_number', 'rollno', 'roll']);

      const records: BulkUserRecord[] = [];
      for (let i = 1; i < lines.length; i++) {
        let rawValues = this.parseCSVLine(lines[i]);

        // Debug: log first few raw values
        if (i <= 2) {
          console.log(`Row ${i} raw values:`, rawValues.slice(0, 10));
        }

        // Skip if empty
        if (rawValues.length === 0 || rawValues.every((v) => !v.trim()))
          continue;

        // Detect if first column is a row number (1, 2, 3...) and skip it
        if (rawValues.length > 0 && /^\d+$/.test(rawValues[0].trim())) {
          rawValues = rawValues.slice(1);
        }

        // Skip if now empty
        if (rawValues.length === 0) continue;

        // Now check for and remove single-letter garbage columns (like H, C, J, B)
        while (rawValues.length > 0 && /^[A-Za-z]$/.test(rawValues[0].trim())) {
          rawValues = rawValues.slice(1);
        }

        // Take only header count values
        const values = rawValues.slice(0, headers.length);

        if (values.length === 0 || values.every((v) => !v.trim())) continue;

        let fullName = values[nameIdx] || '';
        if (!fullName && values[firstIdx]) {
          fullName =
            `${values[firstIdx]} ${values[middleIdx] || ''} ${values[lastIdx] || ''}`
              .replace(/\s+/g, ' ')
              .trim();
        }

        let currentClass = classIdx !== -1 ? values[classIdx] : undefined;
        if (currentClass && /^\d+$/.test(currentClass)) {
          currentClass = `Grade ${currentClass}`;
        }

        const normalizedNames = this.normalizeStudentAndParentNames(
          fullName,
          parentNameIdx !== -1 ? values[parentNameIdx] : undefined,
        );

        records.push({
          full_name: normalizedNames.studentName,
          first_name: values[firstIdx] || undefined,
          middle_name: values[middleIdx] || undefined,
          last_name: values[lastIdx] || undefined,
          email: values[emailIdx] || undefined,
          phone: values[phoneIdx] || undefined,
          mother_name:
            motherNameIdx !== -1 ? values[motherNameIdx] : undefined,
          mother_phone:
            motherPhoneIdx !== -1 ? values[motherPhoneIdx] : undefined,
          role: roleIdx !== -1 ? values[roleIdx] || 'student' : 'student',
          current_class: currentClass,
          gender: genderIdx !== -1 ? values[genderIdx] : undefined,
          section: sectionIdx !== -1 ? values[sectionIdx] : undefined,
          roll_number: rollNumberIdx !== -1 ? values[rollNumberIdx] : undefined,
          student_code: studIdIdx !== -1 ? values[studIdIdx] : undefined,
          parent_name: normalizedNames.parentName,
          parent_phone:
            parentPhoneIdx !== -1 ? values[parentPhoneIdx] : undefined,
          student_email: studEmailIdx !== -1 ? values[studEmailIdx] : undefined,
          relation: relationIdx !== -1 ? this.normalizeRelation(values[relationIdx]) : undefined,
        });
      }

      return records;
    } catch (error) {
      console.error('CSV parse error:', error);
      throw new BadRequestException(
        'Failed to parse CSV file. Please check the format.',
      );
    }
  }

  private normalizeRelation(relation: string | undefined): string {
    if (!relation) return 'Guardian';
    const normalized = relation.trim().toLowerCase();
    if (normalized === 'father' || normalized === 'dad' || normalized === 'f') return 'Father';
    if (normalized === 'mother' || normalized === 'mom' || normalized === 'm') return 'Mother';
    if (normalized === 'guardian' || normalized === 'g') return 'Guardian';
    if (normalized === 'parent' || normalized === 'p') return 'Parent';
    return relation.trim();
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else current += char;
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Universal record validator
   */
  validateRecord(record: BulkUserRecord, index: number): string | null {
    if (!record.full_name?.trim() && !record.first_name?.trim())
      return `Row ${index + 1}: Name is required (full_name or first_name)`;
    if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email))
      return `Row ${index + 1}: Invalid email format`;

    // For staff imports, validate role is provided
    if (
      record.role &&
      !['student', 'teacher', 'admin', 'finance', 'registrar', 'parent'].includes(
        record.role.toLowerCase(),
      )
    ) {
      return `Row ${index + 1}: Invalid role '${record.role}'. Valid roles: student, teacher, admin, finance, registrar, parent`;
    }

    // For student imports, validate student-specific fields are present if it's explicitly a student role or has student fields
    const isStudent = record.role?.toLowerCase() === 'student' || (!record.full_name && record.first_name);
    if (isStudent && !record.current_class) {
      return `Row ${index + 1}: Missing required field 'current_class' for student import`;
    }

    return null;
  }

  /**
   * Map role string to Role enum
   */
  mapRoleToEnum(roleStr: string): Role {
    const roleMap: Record<string, Role> = {
      student: Role.STUDENT,
      teacher: Role.TEACHER,
      finance: Role.FINANCE,
      registrar: Role.REGISTRAR,
      admin: Role.ADMIN,
      'it-manager': Role.IT_MANAGER,
      it_manager: Role.IT_MANAGER,
      parent: Role.PARENT,
    };
    return roleMap[roleStr.toLowerCase()] || Role.STUDENT;
  }

  /**
   * Process bulk staff creation
   */
  async processBulkStaff(
    schoolId: string,
    uploadedById: string,
    records: BulkUserRecord[],
    academicYear?: string,
  ): Promise<BulkUploadResult> {
    const credentials: GeneratedCredential[] = [];
    const failedRecords: Array<{ record: BulkUserRecord; error: string }> = [];
    let successfulCount = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const valError = this.validateRecord(record, i);
        if (valError) throw new Error(valError);

        const role = this.mapRoleToEnum(record.role);

        await this.prismaService.$transaction(async (tx) => {
          if (record.email) {
            const existing = await tx.user.findUnique({
              where: { email: record.email.toLowerCase() },
            });
            if (existing)
              throw new Error(`Email ${record.email} already exists`);
          }

          const username = await this.credentialService.generateStaffId(
            schoolId,
            role,
            academicYear,
          );
          const tempPass = this.credentialService.generateTemporaryPassword(12);
          const hashedPass =
            await this.credentialService.hashPassword(tempPass);

          const user = await tx.user.create({
            data: {
              // @ts-ignore - Email is optional in schema
              email: record.email ? record.email.toLowerCase() : null,
              username,
              password: hashedPass,
              name: (record.full_name || 'Staff Member').trim(),
              role,
              schoolId,
              mustChangePassword: true,
              phone: record.phone?.trim() || null,
            },
          });

          // Create Profiles
          if (role === Role.TEACHER) {
            await tx.teacherProfile.create({
              data: { userId: user.id, schoolId, employeeId: username },
            });
          } else if (role === Role.FINANCE) {
            await tx.financeProfile.create({
              data: { userId: user.id, schoolId, employeeId: username },
            });
          }

          credentials.push({
            name: record.full_name!,
            email: record.email || '',
            username,
            temporaryPassword: tempPass,
            role,
          });
          await this.credentialService.createPendingCredential(
            {
              schoolId,
              userId: user.id,
              name: record.full_name!,
              email: record.email ? record.email.toLowerCase() : null,
              username,
              temporaryPassword: tempPass,
              role: role.toString(),
            },
            tx,
          );
        });
        successfulCount++;
      } catch (err) {
        failedRecords.push({ record, error: err.message });
      }
    }

    await this.credentialService.logCredentialGeneration(
      schoolId,
      uploadedById,
      'BULK_STAFF',
      successfulCount,
      academicYear || null,
      credentials.map((c) => c.username),
    );
    return {
      status:
        successfulCount === 0
          ? 'failed'
          : failedRecords.length
            ? 'partial'
            : 'success',
      message: `Processed ${successfulCount} staff members`,
      totalRecords: records.length,
      successfulCount,
      failedCount: failedRecords.length,
      failedRecords,
      credentials,
    };
  }

  /**
   * Process students with auto class/section assignment
   * Shuffles students by grade and assigns sections in batches of 30
   */
  async processBulkStudentsWithAssignment(
    schoolId: string,
    uploadedById: string,
    records: BulkUserRecord[],
    academicYear?: string,
  ): Promise<BulkUploadResult> {
    const credentials: GeneratedCredential[] = [];
    const failedRecords: Array<{ record: BulkUserRecord; error: string }> = [];
    let successfulCount = 0;
    let skippedCount = 0;

    const schoolSettings = await this.prismaService.schoolSettings.findUnique({
      where: { schoolId },
    });
    let fallbackAcademicYear = schoolSettings?.defaultAcademicYearId
      ? await this.prismaService.academicYear.findUnique({
          where: { id: schoolSettings.defaultAcademicYearId },
        })
      : null;

    if (!fallbackAcademicYear) {
      fallbackAcademicYear = await this.prismaService.academicYear.findFirst({
        where: { schoolId, isActive: true },
        orderBy: { startDate: 'desc' },
      });
    }

    if (!fallbackAcademicYear) {
      fallbackAcademicYear = await this.prismaService.academicYear.findFirst({
        where: { schoolId },
        orderBy: { startDate: 'desc' },
      });
    }
    const yearId = academicYear || fallbackAcademicYear?.id;
    const yearName = fallbackAcademicYear?.name; // Use name for StudentClass.academicYear
    if (!yearId) throw new Error('No academic year found for this school');
    if (!yearName) throw new Error('No academic year name found');

    // Fetch section capacity from school settings (default to 30)
    const capacitySetting = await this.prismaService.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'DEFAULT_SECTION_CAPACITY' } },
    });
    let sectionCapacity = 30;
    if (capacitySetting?.value) {
      // Handle both string and number types
      const parsed =
        typeof capacitySetting.value === 'number'
          ? capacitySetting.value
          : parseInt(capacitySetting.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        sectionCapacity = parsed;
      }
    }

    const gradeLevels = await this.prismaService.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, name: true, level: true },
    });
    const gradeLookups = this.buildGradeLevelLookups(gradeLevels);
    const allowedLevels = gradeLevels.length
      ? new Set(gradeLevels.map((level) => level.level))
      : undefined;
    const gradeLevelIds = new Set(gradeLevels.map((level) => level.id));

    // Group records by grade
    const gradeGroups: Record<string, BulkUserRecord[]> = {};
    const gradeInfoMap = new Map<
      string,
      { name: string; level?: number; id?: string }
    >();
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const valError = this.validateRecord(record, i);
      if (valError) {
        failedRecords.push({ record, error: valError });
        continue;
      }
      if (!record.phone?.trim()) {
        failedRecords.push({
          record,
          error: `Row ${i + 1}: Phone number is required`,
        });
        continue;
      }
      const rawGrade = record.current_class || 'Unassigned';
      const gradeInfo = this.resolveGradeInfo(
        rawGrade,
        gradeLookups,
        allowedLevels,
      );
      if (
        allowedLevels &&
        gradeInfo.level !== undefined &&
        !allowedLevels.has(gradeInfo.level)
      ) {
        failedRecords.push({
          record,
          error: `Row ${i + 1}: ${gradeInfo.name} is outside this school's configured grade range`,
        });
        continue;
      }
      const gradeKey = gradeInfo.name || rawGrade;
      if (!gradeGroups[gradeKey]) gradeGroups[gradeKey] = [];
      gradeGroups[gradeKey].push(record);
      gradeInfoMap.set(gradeKey, gradeInfo);
    }

    const processedGradeNames = new Set<string>();

    // Process each grade group
    for (const [gradeName, group] of Object.entries(gradeGroups)) {
      const gradeInfo = gradeInfoMap.get(gradeName);
      // Keep section assignment deterministic and alphabetical.
      const orderedStudents = this.sortRecordsAlphabetically(group);

      for (let i = 0; i < orderedStudents.length; i++) {
        const record = orderedStudents[i];
        try {
          // Find or create section with available capacity
          const preferredSection = this.extractSectionFromClassLabel(
            record.current_class,
          );
          let sectionName: string | null = null;

          if (preferredSection) {
            const studentCount = await this.prismaService.studentClass.count({
              where: {
                schoolId,
                academicYear: yearName,
                class: { name: gradeName },
                section: { name: preferredSection },
              },
            });

            if (studentCount < sectionCapacity) {
              sectionName = preferredSection;
            }
          }

          if (!sectionName) {
            let sectionIndex = 0;
            while (sectionName === null) {
              const candidate = String.fromCharCode(65 + sectionIndex);
              const studentCount = await this.prismaService.studentClass.count({
                where: {
                  schoolId,
                  academicYear: yearName,
                  class: { name: gradeName },
                  section: { name: candidate },
                },
              });

              if (studentCount < sectionCapacity) {
                sectionName = candidate;
              } else {
                sectionIndex++;
                if (sectionIndex > 25)
                  throw new Error('Too many sections needed (exceeded Z)');
              }
            }
          }

          await this.prismaService.$transaction(async (tx) => {
            const username =
              await this.credentialService.generateStudentAdmissionNumber(
                schoolId,
                yearId,
              );
            const tempPass =
              this.credentialService.generateTemporaryPassword(12);
            const hashed = await this.credentialService.hashPassword(tempPass);

            const user = await tx.user.create({
              data: {
                // @ts-ignore - Email is optional in schema
                email: null,
                username,
                password: hashed,
                name: (record.full_name || 'Student').trim(),
                role: Role.STUDENT,
                schoolId,
                mustChangePassword: true,
              },
            });

            const profile = await tx.studentProfile.create({
              data: {
                userId: user.id,
                schoolId,
                studentCode: username,
                studentId: username,
                academicYear: yearId,
                enrollmentStatus: 'APPROVED',
                gender: record.gender ? record.gender.toUpperCase() : undefined,
                motherName: record.mother_name || undefined,
                motherPhone: record.mother_phone || undefined,
              },
            });

            if (gradeName !== 'Unassigned') {
              // First try to find a class with the specific section
              let cls = await tx.class.findFirst({
                where: {
                  schoolId,
                  name: gradeName,
                  academicYearId: yearId,
                  section: sectionName,
                },
              });

              // If not found, try to find a class with empty section (created by auto-create)
              let emptySectionClassId: string | null = null;
              if (!cls) {
                const emptySectionClass = await tx.class.findFirst({
                  where: {
                    schoolId,
                    name: gradeName,
                    academicYearId: yearId,
                    section: '',
                  },
                });
                if (emptySectionClass) {
                  cls = emptySectionClass;
                  emptySectionClassId = emptySectionClass.id;
                }
              }

              if (!cls) {
                // No existing class found, create new one with the section
                cls = await tx.class.create({
                  data: {
                    schoolId,
                    academicYearId: yearId,
                    name: gradeName,
                    section: sectionName,
                    grade: gradeInfo?.level ?? undefined,
                    gradeId: gradeInfo?.id ?? undefined,
                  },
                });
              } else {
                // Found existing class (possibly with empty section) - update it with the correct section
                const updateData: {
                  grade?: number | null;
                  gradeId?: string | null;
                  section?: string;
                } = {};
                updateData.section = sectionName;
                if (gradeInfo?.level !== undefined)
                  updateData.grade = gradeInfo.level;
                if (gradeInfo?.id) updateData.gradeId = gradeInfo.id;
                if (
                  !gradeInfo?.id &&
                  cls.gradeId &&
                  gradeInfo?.level !== undefined &&
                  !gradeLevelIds.has(cls.gradeId)
                ) {
                  updateData.gradeId = null;
                }
                if (
                  Object.keys(updateData).length > 0 &&
                  (cls.grade !== updateData.grade ||
                    cls.gradeId !== updateData.gradeId ||
                    cls.section !== updateData.section)
                ) {
                  cls = await tx.class.update({
                    where: { id: cls.id },
                    data: updateData,
                  });
                }

                // If we updated a class from empty section to a real section, delete the duplicate empty section class if it exists
                if (emptySectionClassId && cls.id !== emptySectionClassId) {
                  // Check if emptySectionClass has any students or sections
                  const emptyClassStudentCount = await tx.studentClass.count({
                    where: { classId: emptySectionClassId },
                  });
                  const emptyClassSectionCount = await tx.section.count({
                    where: { classId: emptySectionClassId },
                  });
                  if (
                    emptyClassStudentCount === 0 &&
                    emptyClassSectionCount === 0
                  ) {
                    await tx.class.delete({
                      where: { id: emptySectionClassId },
                    });
                  }
                }
              }

              let sec = await tx.section.findFirst({
                where: { classId: cls.id, name: sectionName },
              });
              if (!sec)
                sec = await tx.section.create({
                  data: {
                    classId: cls.id,
                    name: sectionName,
                    capacity: sectionCapacity,
                  },
                });

              const studentName =
                [record.first_name, record.middle_name, record.last_name]
                  .filter(Boolean)
                  .join(' ')
                  .trim() ||
                record.full_name ||
                '';

              const rollNumber =
                await this.credentialService.generateSectionRollNumber(
                  schoolId,
                  cls.name,
                  sec.name,
                  studentName,
                  tx,
                );

              await tx.studentClass.create({
                data: {
                  studentId: user.id,
                  classId: cls.id,
                  sectionId: sec.id,
                  schoolId,
                  academicYear: yearName,
                },
              });
              await tx.studentProfile.update({
                where: { id: profile.id },
                data: { className: cls.name, section: sec.name, rollNumber },
              });
            }

            if (record.parent_name) {
              const pPhone =
                record.parent_phone?.trim() || record.phone?.trim();

              let parentUser: any = null;
              if (pPhone) {
                parentUser = await tx.user.findFirst({
                  where: { schoolId, phone: pPhone, role: Role.PARENT },
                });
              }

              let pUsername = parentUser?.username;
              let pTempPass = '';

              if (!parentUser) {
                // Use unified credential generation for consistency
                const parentCreds =
                  await this.credentialService.generateStaffCredentials(
                    schoolId,
                    Role.PARENT,
                    yearName,
                  );
                pUsername = parentCreds.username;
                pTempPass = parentCreds.temporaryPassword;
                const pHashed = parentCreds.hashedPassword;

                parentUser = await tx.user.create({
                  data: {
                    // @ts-ignore
                    email: null,
                    username: pUsername,
                    password: pHashed,
                    name: record.parent_name.trim(),
                    role: Role.PARENT,
                    schoolId,
                    phone: pPhone || null,
                    mustChangePassword: true,
                  },
                });

                await tx.parentProfile.create({
                  data: {
                    userId: parentUser!.id,
                    schoolId,
                    phone: pPhone || null,
                  },
                });

                credentials.push({
                  name: record.parent_name,
                  email: undefined,
                  username: pUsername!,
                  temporaryPassword: pTempPass,
                  role: Role.PARENT,
                });

                await this.credentialService.createPendingCredential(
                  {
                    schoolId,
                    userId: parentUser!.id,
                    name: record.parent_name,
                    email: null,
                    username: pUsername!,
                    temporaryPassword: pTempPass,
                    role: Role.PARENT.toString(),
                  },
                  tx,
                );
              }

              const parentProf = await tx.parentProfile.findUnique({
                where: { userId: parentUser!.id },
              });
              if (parentProf) {
                await tx.parentStudent.upsert({
                  where: {
                    schoolId_parentId_studentId: {
                      schoolId,
                      parentId: parentProf.id,
                      studentId: profile.id,
                    },
                  },
                  create: {
                    schoolId,
                    parentId: parentProf.id,
                    studentId: profile.id,
                    relation: record.relation || 'Guardian',
                  },
                  update: { relation: record.relation || 'Guardian' },
                });
              }
            }

            credentials.push({
              name: record.full_name || 'Student',
              email: '',
              username,
              temporaryPassword: tempPass,
              role: Role.STUDENT,
            });

            await this.credentialService.createPendingCredential(
              {
                schoolId,
                userId: user.id,
                name: record.full_name || 'Student',
                email: null,
                username,
                temporaryPassword: tempPass,
                role: Role.STUDENT.toString(),
              },
              tx,
            );
          });
          successfulCount++;
          if (gradeName !== 'Unassigned') {
            processedGradeNames.add(gradeName);
          }
        } catch (err) {
          failedRecords.push({ record, error: err.message });
        }
      }
    }

    for (const gradeName of processedGradeNames) {
      await this.rebalanceGradeSections(schoolId, yearName, gradeName);
    }

    await this.credentialService.assignRollNumbersByAlphabet(schoolId, yearName);

    return {
      status:
        successfulCount === 0
          ? 'failed'
          : failedRecords.length
            ? 'partial'
            : 'success',
      message: `Processed ${successfulCount} students with mixed alphabetical section assignment${skippedCount ? `, skipped ${skippedCount} existing records` : ''}`,
      totalRecords: records.length,
      successfulCount,
      failedCount: failedRecords.length,
      failedRecords,
      credentials,
    };
  }

  generateCredentialReport(credentials: any[]): string {
    const headers = ['Name', 'Username', 'Temporary Password', 'Role', 'Email'];
    const rows = credentials.map((c) => [
      c.name,
      c.username,
      c.temporaryPassword,
      c.role,
      c.email,
    ]);
    return [
      headers.join(','),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');
  }

  async getPendingCredentials(schoolId: string, options: any) {
    const {
      includeSent = false,
      role,
      limit = 100,
      offset = 0,
    } = options || {};
    const where: any = { schoolId };
    if (!includeSent) where.isSent = false;
    if (role) where.role = role.toUpperCase();
    const [credentials, total] = await Promise.all([
      this.prismaService.pendingCredential.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prismaService.pendingCredential.count({ where }),
    ]);
    return { credentials, total };
  }

  async markCredentialSent(schoolId: string, id: string, sentVia: string) {
    return this.prismaService.pendingCredential.update({
      where: { id, schoolId },
      data: { isSent: true, sentAt: new Date(), sentVia },
    });
  }

  async markCredentialsSent(ids: string[], sentVia: string) {
    return this.prismaService.pendingCredential.updateMany({
      where: { id: { in: ids } },
      data: { isSent: true, sentAt: new Date(), sentVia },
    });
  }

  async deletePendingCredential(id: string, schoolId: string) {
    return this.prismaService.pendingCredential.delete({
      where: { id, schoolId },
    });
  }

  async exportPendingCredentials(schoolId: string, options: any) {
    const res = await this.getPendingCredentials(schoolId, options);
    return this.generateCredentialReport(res.credentials);
  }

  /**
   * Rebalance students in a grade across sections based on new capacity
   */
  async rebalanceGradeSections(
    schoolId: string,
    gradeName: string,
    academicYearId?: string,
  ) {
    const activeYear = await this.prismaService.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    const yearId = academicYearId || activeYear?.id;
    const yearName = activeYear?.name; // Use name for StudentClass.academicYear
    if (!yearId) throw new Error('No active academic year found');
    if (!yearName) throw new Error('No academic year name found');

    const gradeLevels = await this.prismaService.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, name: true, level: true },
    });
    const gradeLookups = this.buildGradeLevelLookups(gradeLevels);
    const allowedLevels = gradeLevels.length
      ? new Set(gradeLevels.map((level) => level.level))
      : undefined;
    const gradeLevelIds = new Set(gradeLevels.map((level) => level.id));

    const capacitySetting = await this.prismaService.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'DEFAULT_SECTION_CAPACITY' } },
    });
    let sectionCapacity = 30;
    if (capacitySetting?.value) {
      const parsed =
        typeof capacitySetting.value === 'number'
          ? capacitySetting.value
          : parseInt(capacitySetting.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        sectionCapacity = parsed;
      }
    }

    const normalizedGradeInfo = this.resolveGradeInfo(
      gradeName,
      gradeLookups,
      allowedLevels,
    );
    const normalizedGrade = normalizedGradeInfo.name;

    // Get all students in this grade for this year
    const students = await this.prismaService.studentClass.findMany({
      where: {
        schoolId,
        academicYear: yearName,
        class: { name: normalizedGrade },
      },
      include: { student: { include: { studentProfile: true } } },
    });

    if (students.length === 0)
      return {
        status: 'failed',
        message: `No students found in ${normalizedGrade}`,
      };

    const orderedStudents = [...students].sort((left, right) =>
      (left.student?.name || '').localeCompare(
        right.student?.name || '',
        undefined,
        {
          sensitivity: 'base',
        },
      ),
    );
    const totalSections = Math.max(
      1,
      Math.ceil(orderedStudents.length / sectionCapacity),
    );

    // Re-assign
    await this.prismaService.$transaction(async (tx) => {
      for (let i = 0; i < orderedStudents.length; i++) {
        const item = orderedStudents[i];
        const sectionIndex = i % totalSections;
        const sectionName = this.getSectionNameByIndex(sectionIndex);

        // First try to find a class with the specific section
        let cls = await tx.class.findFirst({
          where: {
            schoolId,
            name: normalizedGrade,
            academicYearId: yearId,
            section: sectionName,
          },
        });

        // If not found, try to find a class with empty section
        if (!cls) {
          cls = await tx.class.findFirst({
            where: {
              schoolId,
              name: normalizedGrade,
              academicYearId: yearId,
              section: '',
            },
          });
        }

        if (!cls) {
          // No existing class found, create new one with the section
          cls = await tx.class.create({
            data: {
              schoolId,
              academicYearId: yearId,
              name: normalizedGrade,
              section: sectionName,
              grade: normalizedGradeInfo.level ?? undefined,
              gradeId: normalizedGradeInfo.id ?? undefined,
            },
          });
        } else {
          // Found existing class - update it with the correct section
          const updateData: {
            grade?: number | null;
            gradeId?: string | null;
            section?: string;
          } = {};
          updateData.section = sectionName;
          if (normalizedGradeInfo.level !== undefined)
            updateData.grade = normalizedGradeInfo.level;
          if (normalizedGradeInfo.id)
            updateData.gradeId = normalizedGradeInfo.id;
          if (
            !normalizedGradeInfo.id &&
            cls.gradeId &&
            normalizedGradeInfo.level !== undefined &&
            !gradeLevelIds.has(cls.gradeId)
          ) {
            updateData.gradeId = null;
          }
          if (
            Object.keys(updateData).length > 0 &&
            (cls.grade !== updateData.grade ||
              cls.gradeId !== updateData.gradeId ||
              cls.section !== updateData.section)
          ) {
            cls = await tx.class.update({
              where: { id: cls.id },
              data: updateData,
            });
          }
        }

        let sec = await tx.section.findFirst({
          where: { classId: cls.id, name: sectionName },
        });
        if (!sec)
          sec = await tx.section.create({
            data: {
              classId: cls.id,
              name: sectionName,
              capacity: sectionCapacity,
            },
          });

        await tx.studentClass.update({
          where: { id: item.id },
          data: { classId: cls.id, sectionId: sec.id },
        });

        if (item.student?.studentProfile?.[0]) {
          await tx.studentProfile.update({
            where: { id: item.student.studentProfile[0].id },
            data: {
              className: cls.name,
              section: sec.name,
              rollNumber: '0',
            },
          });
        }
      }
    });

    await this.credentialService.assignRollNumbersByAlphabet(schoolId, yearName);

    return {
      status: 'success',
      message: `Successfully rebalanced ${students.length} students in ${normalizedGrade} across ${totalSections} mixed sections of ${sectionCapacity}`,
    };
  }
}
