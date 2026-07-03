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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationEngineModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const notification_module_1 = require("../notification/notification.module");
const automation_engine_controller_1 = require("./automation-engine.controller");
const automation_engine_service_1 = require("./automation-engine.service");
const rule_engine_service_1 = require("./rule-engine.service");
const action_executor_service_1 = require("./action-executor.service");
const execution_worker_service_1 = require("./execution-worker.service");
const execution_logger_service_1 = require("./execution-logger.service");
const sms_action_1 = require("./actions/sms.action");
const email_action_1 = require("./actions/email.action");
const push_notification_action_1 = require("./actions/push-notification.action");
const create_alert_action_1 = require("./actions/create-alert.action");
const update_database_field_action_1 = require("./actions/update-database-field.action");
let AutomationEngineModule = class AutomationEngineModule {
    actionExecutor;
    smsAction;
    emailAction;
    pushNotificationAction;
    createAlertAction;
    updateDatabaseFieldAction;
    constructor(actionExecutor, smsAction, emailAction, pushNotificationAction, createAlertAction, updateDatabaseFieldAction) {
        this.actionExecutor = actionExecutor;
        this.smsAction = smsAction;
        this.emailAction = emailAction;
        this.pushNotificationAction = pushNotificationAction;
        this.createAlertAction = createAlertAction;
        this.updateDatabaseFieldAction = updateDatabaseFieldAction;
    }
    onModuleInit() {
        this.actionExecutor.registerAction(this.smsAction);
        this.actionExecutor.registerAction(this.emailAction);
        this.actionExecutor.registerAction(this.pushNotificationAction);
        this.actionExecutor.registerAction(this.createAlertAction);
        this.actionExecutor.registerAction(this.updateDatabaseFieldAction);
    }
};
exports.AutomationEngineModule = AutomationEngineModule;
exports.AutomationEngineModule = AutomationEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, notification_module_1.NotificationModule],
        controllers: [automation_engine_controller_1.AutomationEngineController],
        providers: [
            automation_engine_service_1.AutomationEngineService,
            rule_engine_service_1.RuleEngineService,
            action_executor_service_1.ActionExecutorService,
            execution_worker_service_1.ExecutionWorkerService,
            execution_logger_service_1.ExecutionLoggerService,
            sms_action_1.SmsAction,
            email_action_1.EmailAction,
            push_notification_action_1.PushNotificationAction,
            create_alert_action_1.CreateAlertAction,
            update_database_field_action_1.UpdateDatabaseFieldAction,
        ],
        exports: [
            automation_engine_service_1.AutomationEngineService,
        ],
    }),
    __metadata("design:paramtypes", [action_executor_service_1.ActionExecutorService,
        sms_action_1.SmsAction,
        email_action_1.EmailAction,
        push_notification_action_1.PushNotificationAction,
        create_alert_action_1.CreateAlertAction,
        update_database_field_action_1.UpdateDatabaseFieldAction])
], AutomationEngineModule);
//# sourceMappingURL=automation-engine.module.js.map