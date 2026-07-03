import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../../notification/notification.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { SyncModule } from '../../sync/sync.module';
import { EventBusService } from './event-bus.service';
import { EventStoreService } from './event-store.service';
import { EventWorkerService } from './event-worker.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';
import { SuperadminEventListener } from './superadmin-event.listener';
import { NotificationEventListener } from './listeners/notification-event.listener';
import { SchoolActivityEventListener } from './listeners/school-activity-event.listener';
import { SyncEventListener } from './listeners/sync-event.listener';
import { EventLoggerService } from './event-logger.service';

@Global()
@Module({
  imports: [PrismaModule, NotificationModule, QueueModule, SyncModule],
  providers: [
    EventBusService,
    EventStoreService,
    DeadLetterQueueService,
    EventWorkerService,
    SuperadminEventListener,
    NotificationEventListener,
    SchoolActivityEventListener,
    SyncEventListener,
    EventLoggerService,
  ],
  exports: [EventBusService, EventStoreService, DeadLetterQueueService],
})
export class EventsModule {}
