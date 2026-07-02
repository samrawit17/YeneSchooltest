export enum QueueName {
  EMAIL = 'sms:email',
  NOTIFICATION = 'sms:notification',
  COMMUNICATION = 'sms:communication',
  FILE_PROCESSING = 'sms:file-processing',
  SYNC = 'sms:sync',
}

export enum QueuePriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

export enum EmailJob {
  SEND = 'email.send',
  SEND_BULK = 'email.send-bulk',
  SEND_TEMPLATE = 'email.send-template',
}

export enum NotificationJob {
  SEND_PUSH = 'notification.send-push',
  SEND_IN_APP = 'notification.send-in-app',
  SEND_DIGEST = 'notification.send-digest',
}

export enum CommunicationJob {
  SEND_SMS = 'communication.send-sms',
  SEND_WHATSAPP = 'communication.send-whatsapp',
  SEND_VOICE = 'communication.send-voice',
}

export enum FileProcessingJob {
  PROCESS_UPLOAD = 'file.process-upload',
  GENERATE_PDF = 'file.generate-pdf',
  GENERATE_EXCEL = 'file.generate-excel',
  PROCESS_BULK_IMPORT = 'file.process-bulk-import',
  RESIZE_IMAGE = 'file.resize-image',
}

export enum SyncJob {
  PROCESS_BATCH = 'sync.process-batch',
  RESOLVE_CONFLICT = 'sync.resolve-conflict',
  CLEANUP_ORPHANS = 'sync.cleanup-orphans',
}

export interface QueueConfig {
  name: QueueName;
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete: { count: number };
    removeOnFail: { count: number };
  };
  defaultPriority: QueuePriority;
}

export const QUEUE_CONFIGS: Record<QueueName, QueueConfig> = {
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
