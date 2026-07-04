import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptions() {
    this.logger.log('Checking for expired subscriptions...');
    try {
      const expired = await this.subscriptionService.expireSubscriptions();
      if (expired.length > 0) {
        this.logger.log(`Expired ${expired.length} subscription(s): ${expired.map(s => s.id).join(', ')}`);
      } else {
        this.logger.log('No expired subscriptions found.');
      }
    } catch (error) {
      this.logger.error('Failed to process expired subscriptions', error);
    }
  }
}
