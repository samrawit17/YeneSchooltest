"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAction = void 0;
const common_1 = require("@nestjs/common");
const base_action_1 = require("./base-action");
let EmailAction = class EmailAction extends base_action_1.BaseAction {
    type = 'send_email';
    async execute(event, config) {
        const { to, subject, body } = config;
        if (!to && !event.payload?.email) {
            return this.fail('No recipient email configured');
        }
        const recipient = to || event.payload.email;
        const compiledSubject = this.compileTemplate(subject || 'Notification', event.payload);
        const compiledBody = this.compileTemplate(body || '', event.payload);
        return this.success('Email queued (provider not configured)', {
            to: recipient,
            subject: compiledSubject,
            body: compiledBody,
        });
    }
    compileTemplate(template, payload) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
    }
};
exports.EmailAction = EmailAction;
exports.EmailAction = EmailAction = __decorate([
    (0, common_1.Injectable)()
], EmailAction);
//# sourceMappingURL=email.action.js.map