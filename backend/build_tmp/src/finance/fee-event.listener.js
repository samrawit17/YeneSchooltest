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
var FeeEventListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../core/events/event-bus.service");
const notification_service_1 = require("../notification/notification.service");
const prisma_service_1 = require("../prisma/prisma.service");
let FeeEventListener = FeeEventListener_1 = class FeeEventListener {
    eventBus;
    notificationService;
    prisma;
    logger = new common_1.Logger(FeeEventListener_1.name);
    constructor(eventBus, notificationService, prisma) {
        this.eventBus = eventBus;
        this.notificationService = notificationService;
        this.prisma = prisma;
        this.eventBus.on('fee.paid', this.handleFeePaid);
        this.eventBus.on('fee.overdue', this.handleFeeOverdue);
    }
    handleFeePaid = async (event) => {
        const { schoolId, studentId, amount } = event.payload;
        try {
            const studentProfile = await this.prisma.studentProfile.findFirst({
                where: { schoolId, userId: studentId },
                select: {
                    id: true,
                    user: { select: { name: true } },
                    parents: { select: { parent: { select: { userId: true } } } },
                },
            });
            if (!studentProfile)
                return;
            const parentIds = studentProfile.parents
                .map((p) => p.parent.userId)
                .filter((id) => Boolean(id));
            if (parentIds.length === 0)
                return;
            await Promise.allSettled(parentIds.map((parentId) => this.notificationService.notifyPaymentReceived(schoolId, parentId, String(amount), '')));
        }
        catch (error) {
            this.logger.error(`[correlationId=${event.metadata?.correlationId}] FeeEventListener.fee.paid failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleFeeOverdue = async (event) => {
        const { schoolId, studentId, amount, dueDate } = event.payload;
        try {
            const studentProfile = await this.prisma.studentProfile.findFirst({
                where: { schoolId, userId: studentId },
                select: {
                    id: true,
                    user: { select: { name: true } },
                    parents: { select: { parent: { select: { userId: true } } } },
                },
            });
            if (!studentProfile)
                return;
            const parentIds = studentProfile.parents
                .map((p) => p.parent.userId)
                .filter((id) => Boolean(id));
            if (parentIds.length === 0)
                return;
            await Promise.allSettled(parentIds.map((parentId) => this.notificationService.notifyFeeDue(schoolId, parentId, String(amount), dueDate || '', studentProfile.user.name || 'your child')));
        }
        catch (error) {
            this.logger.error(`[correlationId=${event.metadata?.correlationId}] FeeEventListener.fee.overdue failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
};
exports.FeeEventListener = FeeEventListener;
exports.FeeEventListener = FeeEventListener = FeeEventListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        notification_service_1.NotificationService,
        prisma_service_1.PrismaService])
], FeeEventListener);
//# sourceMappingURL=fee-event.listener.js.map