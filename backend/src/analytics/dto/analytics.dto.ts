import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class RankingQueryDto {
  @IsString()
  schoolId: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeHistory?: boolean;
}

export class AnalyticsQueryDto {
  @IsString()
  schoolId: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  period?: 'daily' | 'weekly' | 'monthly' | 'termly';
}

export interface StudentRankingRow {
  rank: number;
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  sectionName: string;
  averageScore: number;
  gradePoint: number | null;
  subjectsCount: number;
  previousRank?: number | null;
  rankChange?: number | null;
}

export interface PerformanceTrendPoint {
  period: string;
  averageScore: number;
  studentCount: number;
  subjectBreakdown?: Record<string, number>;
}
