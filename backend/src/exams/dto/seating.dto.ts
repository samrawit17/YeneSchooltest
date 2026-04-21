import {
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SeatingMode as PrismaSeatingMode } from '@prisma/client';

export { PrismaSeatingMode as SeatingMode };

export class CreateSeatingPlanDto {
  @IsEnum(PrismaSeatingMode)
  mode: PrismaSeatingMode;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  fromGrade: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  toGrade: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  examCapacity?: number;

  @IsBoolean()
  shuffle: boolean;

  @IsBoolean()
  @IsOptional()
  useScoreThresholdFilter?: boolean;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  scoreThreshold?: number;
}

export class SeatingPlanResponseDto {
  id: string;
  examId: string | null;
  examType: string;
  schoolId: string;
  mode: PrismaSeatingMode;
  fromGrade: number;
  toGrade: number;
  examCapacity: number;
  shuffle: boolean;
  useScoreThresholdFilter: boolean;
  scoreThreshold: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  exam?: {
    id: string;
    title: string;
    date: Date;
    subject: {
      name: string;
    };
  };
  assignments?: SectionAssignmentResponseDto[];
}

export class GenerateSeatingDto {
  @IsString()
  planId: string;
}

export class SectionAssignmentResponseDto {
  id: string;
  seatingPlanId: string;
  sectionId: string;
  section?: {
    id: string;
    name: string;
    capacity: number;
    class?: {
      id: string;
      name: string;
      grade: number | null;
    };
  };
  students?: StudentAssignmentResponseDto[];
}

export class StudentAssignmentResponseDto {
  id: string;
  assignmentId: string;
  studentId: string;
  orderIndex: number;
  student?: {
    id: string;
    name: string;
    email: string | null;
    studentProfile?: {
      studentCode: string;
      gender: string | null;
    };
  };
}

export class SeatingOverviewResponseDto {
  plan: SeatingPlanResponseDto;
  totalStudents: number;
  totalSections: number;
  totalCapacity: number;
  sections: SectionWithStudentsDto[];
}

export class SectionWithStudentsDto {
  sectionId: string;
  sectionName: string;
  className: string;
  grade: number | null;
  capacity: number;
  examCapacity: number;
  assignedStudents: number;
  students: StudentInSectionDto[];
}

export class StudentInSectionDto {
  orderIndex: number;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  originalSection: string | null;
  originalGrade: number | null;
}
