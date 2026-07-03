import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './payments.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    private resolveSchoolId;
    recordPayment(dto: RecordPaymentDto, req: any): Promise<{
        payment: any;
        paymentReference: any;
        remaining: number;
        status: "PAID" | "PARTIAL";
        success: boolean;
    }>;
    reversePayment(paymentId: string, body: {
        schoolId: string;
        reason?: string;
    }, req: any): Promise<{
        reversed: boolean;
        paymentReference: string;
        remainingPaid: number;
        remainingBalance: number;
        status: "PENDING" | "PAID" | "PARTIAL";
        success: boolean;
    }>;
    getAllPayments(schoolId: string, req: any): Promise<{
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
        success: boolean;
    }>;
}
