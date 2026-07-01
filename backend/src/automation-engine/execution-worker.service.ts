import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, AppEvent } from '../core/events';
import { RuleEngineService } from './rule-engine.service';
import { ActionExecutorService } from './action-executor.service';
import { ExecutionLoggerService } from './execution-logger.service';

@Injectable()
export class ExecutionWorkerService implements OnModuleInit {
  private readonly logger = new Logger(ExecutionWorkerService.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly ruleEngine: RuleEngineService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly loggerService: ExecutionLoggerService,
  ) {}

  onModuleInit(): void {
    this.eventBus.on('*', (event) => this.processEvent(event));
    this.logger.log('Execution worker initialized and listening for automation events');
  }

  async processEvent(event: AppEvent): Promise<void> {
    const startTime = Date.now();
    const schoolId = event.payload?.schoolId as string | undefined;

    if (!schoolId) {
      this.logger.debug(`Event "${event.eventType}" has no schoolId in payload, skipping`);
      return;
    }

    try {
      const matchedRules = await this.ruleEngine.evaluateEvent({
        eventType: event.eventType,
        payload: event.payload,
        schoolId,
        timestamp: event.timestamp,
      });

      for (const rule of matchedRules) {
        const ruleStartTime = Date.now();

        try {
          const actions = rule.actions as any[];
          const results = await this.actionExecutor.executeActions(actions, {
            ...event,
            schoolId,
          });

          await this.loggerService.logExecution({
            schoolId,
            ruleId: rule.id,
            ruleName: rule.name,
            event: { ...event, schoolId },
            results,
            executionTimeMs: Date.now() - ruleStartTime,
          });

          this.logger.log(
            `Rule "${rule.name}" processed for event ${event.eventType}: ${results.filter((r) => r.success).length}/${results.length} actions succeeded`,
          );
        } catch (err: any) {
          this.logger.error(`Rule ${rule.id} execution failed: ${err.message}`);
          await this.loggerService.logExecution({
            schoolId,
            ruleId: rule.id,
            ruleName: rule.name,
            event: { ...event, schoolId },
            results: [],
            executionTimeMs: Date.now() - ruleStartTime,
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Event processing failed for ${event.eventType}: ${err.message}`);
    }
  }
}
