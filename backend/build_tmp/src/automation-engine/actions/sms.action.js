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
exports.SmsAction = void 0;
const common_1 = require("@nestjs/common");
const base_action_1 = require("./base-action");
const event_bus_service_1 = require("../../core/events/event-bus.service");
const queue_constants_1 = require("../../infrastructure/queue/queue.constants");
let SmsAction = class SmsAction extends base_action_1.BaseAction {
    eventBus;
    type = 'send_sms';
    constructor(eventBus) {
        super();
        this.eventBus = eventBus;
    }
    async execute(event, config) {
        const { to, message } = config;
        if (!to && !event.payload?.phone) {
            return this.fail('No recipient phone number configured');
        }
        const phone = to || event.payload.phone;
        const compiledMessage = this.compileTemplate(message || '', event.payload);
        try {
            await this.eventBus.emit('communication.send-sms', {
                schoolId: event.schoolId,
                userId: event.payload?.userId || '',
                to: phone,
                message: compiledMessage,
            }, { async: true, queue: queue_constants_1.QueueName.COMMUNICATION, schoolId: event.schoolId });
            return this.success('SMS enqueued successfully', {
                to: phone,
                message: compiledMessage,
            });
        }
        catch (error) {
            return this.fail(`SMS queue failed: ${error.message}`);
        }
    }
    compileTemplate(template, payload) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
    }
};
exports.SmsAction = SmsAction;
exports.SmsAction = SmsAction = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService])
], SmsAction);
//# sourceMappingURL=sms.action.js.map