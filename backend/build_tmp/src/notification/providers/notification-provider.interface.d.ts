export interface NotificationPayload {
    schoolId?: string;
    userId?: string;
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}
export interface BulkNotificationPayload {
    schoolId: string;
    userIds: string[];
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}
export interface SendResult {
    success: boolean;
    recipientCount: number;
    error?: string;
}
export interface INotificationChannel {
    readonly channelName: string;
    canHandle(type: string): boolean;
    send(payload: NotificationPayload): Promise<SendResult>;
    sendBulk(payload: BulkNotificationPayload): Promise<SendResult>;
}
export type NotificationChannelType = 'in-app' | 'push' | 'email' | 'sms';
