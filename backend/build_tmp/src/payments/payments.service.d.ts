import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { EventBusService } from '../core/events/event-bus.service';
import { FeeStructureService } from '../fee-structure/fee-structure.service';
import type { RecordPaymentDto } from './payments.dto';
export declare class PaymentsService {
    private readonly prisma;
    private readonly notificationService;
    private readonly eventBus;
    private readonly feeStructureService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService, eventBus: EventBusService, feeStructureService: FeeStructureService);
    recordPayment(user: any, dto: RecordPaymentDto): Promise<{
        payment: any;
        paymentReference: any;
        remaining: number;
        status: "PAID" | "PARTIAL";
    }>;
    reversePayment(user: any, schoolId: string, paymentId: string, reason?: string): Promise<{
        reversed: boolean;
        paymentReference: string;
        remainingPaid: number;
        remainingBalance: number;
        status: "PENDING" | "PAID" | "PARTIAL";
    }>;
    getAllPayments(schoolId: string): Promise<{
        total: number;
        count: number;
        payments: {
            id: any;
            receiptNumber: any;
            paymentReference: any;
            transactionReference: any;
            studentName: string;
            studentId: any;
            paymentMethod: any;
            amountPaid: any;
            recordedBy: any;
            paymentDate: any;
            notes: any;
            termId: any;
            termName: any;
            feeType: any;
        }[];
    }>;
    private formatPaymentsWithStudentContext;
    private getPaymentReferenceDateParts;
    private generatePaymentReferenceCandidate;
    private isUniqueConstraintError;
    private createPaymentWithUniqueReference;
    private createPaymentWithFallbackReference;
    private logAudit;
    private getFeeStructureInstallmentIndex;
}
