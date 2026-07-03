export declare class RecordPaymentDto {
    schoolId: string;
    studentFeeId: string;
    studentId: string;
    termId?: string;
    amountPaid: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
    transactionReference?: string;
    paymentDate?: string;
    notes?: string;
}
