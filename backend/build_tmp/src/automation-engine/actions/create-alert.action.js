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
exports.CreateAlertAction = void 0;
const common_1 = require("@nestjs/common");
const base_action_1 = require("./base-action");
const prisma_service_1 = require("../../prisma/prisma.service");
let CreateAlertAction = class CreateAlertAction extends base_action_1.BaseAction {
    prisma;
    type = 'create_alert';
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async execute(event, config) {
        const { message, type, priority, actionUrl, actionLabel } = config;
        const compiledMessage = this.compileTemplate(message || 'Automation alert triggered', event.payload);
        try {
            const userIds = config.userIds;
            if (userIds && userIds.length > 0) {
            }
            return this.success('Alert created', {
                message: compiledMessage,
                type: type || 'warning',
                priority: priority || 'low',
            });
        }
        catch (error) {
            return this.fail(`Alert creation failed: ${error.message}`);
        }
    }
    compileTemplate(template, payload) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
    }
};
exports.CreateAlertAction = CreateAlertAction;
exports.CreateAlertAction = CreateAlertAction = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CreateAlertAction);
//# sourceMappingURL=create-alert.action.js.map