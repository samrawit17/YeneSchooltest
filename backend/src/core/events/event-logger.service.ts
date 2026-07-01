import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { AppEvent } from './event.interface';

@Injectable()
export class EventLoggerService {
  private readonly logger = new Logger(EventLoggerService.name);

  constructor(private readonly eventBus: EventBusService) {
    this.eventBus.on('*', this.logAllEvents);
  }

  private logAllEvents = (event: AppEvent): void => {
    this.logger.log(
      `[${event.eventType}] correlationId=${event.metadata?.correlationId} payload=${JSON.stringify(event.payload)}`,
    );
  };
}
