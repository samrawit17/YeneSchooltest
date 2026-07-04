import { Injectable } from '@nestjs/common';
import { StudentRankingService } from './services/student-ranking.service';
import { AdvancedAnalyticsService } from './services/advanced-analytics.service';

@Injectable()
export class AnalyticsService {
  constructor(
    readonly rankings: StudentRankingService,
    readonly advanced: AdvancedAnalyticsService,
  ) {}
}
