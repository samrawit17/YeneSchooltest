export declare enum QueueName {
    EMAIL = "sms-email",
    NOTIFICATION = "sms-notification",
    COMMUNICATION = "sms-communication",
    FILE_PROCESSING = "sms-file-processing",
    SYNC = "sms-sync"
}
export declare enum QueuePriority {
    HIGH = 1,
    MEDIUM = 2,
    LOW = 3
}
export declare enum EmailJob {
    SEND = "email.send",
    SEND_BULK = "email.send-bulk",
    SEND_TEMPLATE = "email.send-template"
}
export declare enum NotificationJob {
    SEND_PUSH = "notification.send-push",
    SEND_IN_APP = "notification.send-in-app",
    SEND_DIGEST = "notification.send-digest"
}
export declare enum CommunicationJob {
    SEND_SMS = "communication.send-sms",
    SEND_WHATSAPP = "communication.send-whatsapp",
    SEND_VOICE = "communication.send-voice"
}
export declare enum FileProcessingJob {
    PROCESS_UPLOAD = "file.process-upload",
    GENERATE_PDF = "file.generate-pdf",
    GENERATE_EXCEL = "file.generate-excel",
    PROCESS_BULK_IMPORT = "file.process-bulk-import",
    RESIZE_IMAGE = "file.resize-image"
}
export declare enum SyncJob {
    PROCESS_BATCH = "sync.process-batch",
    RESOLVE_CONFLICT = "sync.resolve-conflict",
    CLEANUP_ORPHANS = "sync.cleanup-orphans"
}
export interface QueueConfig {
    name: QueueName;
    defaultJobOptions: {
        attempts: number;
        backoff: {
            type: 'exponential' | 'fixed';
            delay: number;
        };
        removeOnComplete: {
            count: number;
        };
        removeOnFail: {
            count: number;
        };
    };
    defaultPriority: QueuePriority;
}
export declare const QUEUE_CONFIGS: Record<QueueName, QueueConfig>;
