// Universal Dashboard Response Shape
export class DashboardStatsDto {
  // Dynamic stats based on role
  [key: string]: any;
}

export class DashboardAlertDto {
  message: string;
  type: 'warning' | 'error' | 'info' | 'success';
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  actionLabel?: string;
}

export class QuickActionDto {
  label: string;
  icon?: string;
  url: string;
  permission?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export class DashboardChartDto {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }[];
}

export class UniversalDashboardResponseDto {
  stats: DashboardStatsDto;
  alerts: DashboardAlertDto[];
  quickActions: QuickActionDto[];
  charts: {
    [key: string]: DashboardChartDto;
  };
  metadata: {
    schoolId?: string;
    academicYear?: string;
    term?: string;
    teacherLeaderboard?: Array<{
      rank: number;
      teacherId: string;
      teacherName: string;
      teacherEmail: string | null;
      overallScore: number;
      gradingScore: number;
      attendanceScore: number;
      lessonPlanScore: number;
      gradingSubmitted: number;
      gradingOnTime: number;
      attendanceSubmitted: number;
      lessonPlans: number;
    }>;
    generatedAt: Date;
    curriculum?: {
      curriculumType: string;
      academicYear: string;
      periods: Array<{
        id: string;
        name: string;
        order: number;
        percentageWeight: number;
        isLocked: boolean;
      }>;
    };
  };
}
