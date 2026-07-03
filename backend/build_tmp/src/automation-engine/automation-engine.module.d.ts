import { OnModuleInit } from '@nestjs/common';
import { ActionExecutorService } from './action-executor.service';
import { SmsAction } from './actions/sms.action';
import { EmailAction } from './actions/email.action';
import { PushNotificationAction } from './actions/push-notification.action';
import { CreateAlertAction } from './actions/create-alert.action';
import { UpdateDatabaseFieldAction } from './actions/update-database-field.action';
export declare class AutomationEngineModule implements OnModuleInit {
    private readonly actionExecutor;
    private readonly smsAction;
    private readonly emailAction;
    private readonly pushNotificationAction;
    private readonly createAlertAction;
    private readonly updateDatabaseFieldAction;
    constructor(actionExecutor: ActionExecutorService, smsAction: SmsAction, emailAction: EmailAction, pushNotificationAction: PushNotificationAction, createAlertAction: CreateAlertAction, updateDatabaseFieldAction: UpdateDatabaseFieldAction);
    onModuleInit(): void;
}
