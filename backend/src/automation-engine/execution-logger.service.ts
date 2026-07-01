import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationEvent } from './interfaces/event.interface';
import { ActionResult } from './interfaces/action.interface';

@Injectable()
export class ExecutionLoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async logExecution(params: {
    schoolId: string;
    ruleId: string;
    ruleName?: string;
    event: AutomationEvent;
    results: ActionResult[];
    executionTimeMs: number;
  }): Promise<void> {
    const allSucceeded = params.results.every((r) => r.success);

    await this.prisma.automationExecutionLog.create({
      data: {
        schoolId: params.schoolId,
        ruleId: params.ruleId,
        ruleName: params.ruleName,
        eventType: params.event.eventType,
        eventPayload: params.event.payload as any,
        status: allSucceeded ? 'success' : 'failed',
        executedActions: params.results as any,
        errorMessage: allSucceeded
          ? null
          : params.results
              .filter((r) => !r.success)
              .map((r) => r.message)
              .join('; '),
        executionTimeMs: params.executionTimeMs,
      },
    });
  }
}
