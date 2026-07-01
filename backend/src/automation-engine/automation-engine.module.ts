import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { AutomationEngineController } from './automation-engine.controller';
import { AutomationEngineService } from './automation-engine.service';
import { RuleEngineService } from './rule-engine.service';
import { ActionExecutorService } from './action-executor.service';
import { ExecutionWorkerService } from './execution-worker.service';
import { ExecutionLoggerService } from './execution-logger.service';
import { SmsAction } from './actions/sms.action';
import { EmailAction } from './actions/email.action';
import { PushNotificationAction } from './actions/push-notification.action';
import { CreateAlertAction } from './actions/create-alert.action';
import { UpdateDatabaseFieldAction } from './actions/update-database-field.action';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [AutomationEngineController],
  providers: [
    AutomationEngineService,
    RuleEngineService,
    ActionExecutorService,
    ExecutionWorkerService,
    ExecutionLoggerService,
    SmsAction,
    EmailAction,
    PushNotificationAction,
    CreateAlertAction,
    UpdateDatabaseFieldAction,
  ],
  exports: [
    AutomationEngineService,
  ],
})
export class AutomationEngineModule implements OnModuleInit {
  constructor(
    private readonly actionExecutor: ActionExecutorService,
    private readonly smsAction: SmsAction,
    private readonly emailAction: EmailAction,
    private readonly pushNotificationAction: PushNotificationAction,
    private readonly createAlertAction: CreateAlertAction,
    private readonly updateDatabaseFieldAction: UpdateDatabaseFieldAction,
  ) {}

  onModuleInit(): void {
    this.actionExecutor.registerAction(this.smsAction);
    this.actionExecutor.registerAction(this.emailAction);
    this.actionExecutor.registerAction(this.pushNotificationAction);
    this.actionExecutor.registerAction(this.createAlertAction);
    this.actionExecutor.registerAction(this.updateDatabaseFieldAction);
  }
}
