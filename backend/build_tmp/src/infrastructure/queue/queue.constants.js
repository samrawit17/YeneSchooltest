"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_CONFIGS = exports.SyncJob = exports.FileProcessingJob = exports.CommunicationJob = exports.NotificationJob = exports.EmailJob = exports.QueuePriority = exports.QueueName = void 0;
var QueueName;
(function (QueueName) {
    QueueName["EMAIL"] = "sms-email";
    QueueName["NOTIFICATION"] = "sms-notification";
    QueueName["COMMUNICATION"] = "sms-communication";
    QueueName["FILE_PROCESSING"] = "sms-file-processing";
    QueueName["SYNC"] = "sms-sync";
})(QueueName || (exports.QueueName = QueueName = {}));
var QueuePriority;
(function (QueuePriority) {
    QueuePriority[QueuePriority["HIGH"] = 1] = "HIGH";
    QueuePriority[QueuePriority["MEDIUM"] = 2] = "MEDIUM";
    QueuePriority[QueuePriority["LOW"] = 3] = "LOW";
})(QueuePriority || (exports.QueuePriority = QueuePriority = {}));
var EmailJob;
(function (EmailJob) {
    EmailJob["SEND"] = "email.send";
    EmailJob["SEND_BULK"] = "email.send-bulk";
    EmailJob["SEND_TEMPLATE"] = "email.send-template";
})(EmailJob || (exports.EmailJob = EmailJob = {}));
var NotificationJob;
(function (NotificationJob) {
    NotificationJob["SEND_PUSH"] = "notification.send-push";
    NotificationJob["SEND_IN_APP"] = "notification.send-in-app";
    NotificationJob["SEND_DIGEST"] = "notification.send-digest";
})(NotificationJob || (exports.NotificationJob = NotificationJob = {}));
var CommunicationJob;
(function (CommunicationJob) {
    CommunicationJob["SEND_SMS"] = "communication.send-sms";
    CommunicationJob["SEND_WHATSAPP"] = "communication.send-whatsapp";
    CommunicationJob["SEND_VOICE"] = "communication.send-voice";
})(CommunicationJob || (exports.CommunicationJob = CommunicationJob = {}));
var FileProcessingJob;
(function (FileProcessingJob) {
    FileProcessingJob["PROCESS_UPLOAD"] = "file.process-upload";
    FileProcessingJob["GENERATE_PDF"] = "file.generate-pdf";
    FileProcessingJob["GENERATE_EXCEL"] = "file.generate-excel";
    FileProcessingJob["PROCESS_BULK_IMPORT"] = "file.process-bulk-import";
    FileProcessingJob["RESIZE_IMAGE"] = "file.resize-image";
})(FileProcessingJob || (exports.FileProcessingJob = FileProcessingJob = {}));
var SyncJob;
(function (SyncJob) {
    SyncJob["PROCESS_BATCH"] = "sync.process-batch";
    SyncJob["RESOLVE_CONFLICT"] = "sync.resolve-conflict";
    SyncJob["CLEANUP_ORPHANS"] = "sync.cleanup-orphans";
})(SyncJob || (exports.SyncJob = SyncJob = {}));
exports.QUEUE_CONFIGS = {
    [QueueName.EMAIL]: {
        name: QueueName.EMAIL,
        defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        },
        defaultPriority: QueuePriority.HIGH,
    },
    [QueueName.NOTIFICATION]: {
        name: QueueName.NOTIFICATION,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 500 },
            removeOnComplete: { count: 200 },
            removeOnFail: { count: 50 },
        },
        defaultPriority: QueuePriority.HIGH,
    },
    [QueueName.COMMUNICATION]: {
        name: QueueName.COMMUNICATION,
        defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        },
        defaultPriority: QueuePriority.MEDIUM,
    },
    [QueueName.FILE_PROCESSING]: {
        name: QueueName.FILE_PROCESSING,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { count: 50 },
            removeOnFail: { count: 100 },
        },
        defaultPriority: QueuePriority.LOW,
    },
    [QueueName.SYNC]: {
        name: QueueName.SYNC,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        },
        defaultPriority: QueuePriority.LOW,
    },
};
//# sourceMappingURL=queue.constants.js.map