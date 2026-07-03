import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../subscription.service';
import { SUBSCRIPTION_FEATURE_KEY } from '../decorators/subscription.decorator';
import { PlanTier } from '@prisma/client';

const isSuperAdmin = (user: any): boolean =>
  String(user?.role || '').toLowerCase() === 'super_admin';

abstract class BaseSubscriptionGuard implements CanActivate {
  constructor(
    protected readonly reflector: Reflector,
    protected readonly subscriptionService: SubscriptionService,
  ) {}

  abstract canActivate(context: ExecutionContext): Promise<boolean>;

  protected async resolveSchoolPlan(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (isSuperAdmin(user)) {
      return { plan: null, isSuperAdmin: true };
    }

    if (!user || !user.schoolId) {
      throw new HttpException(
        'School not found in request',
        HttpStatus.FORBIDDEN,
      );
    }

    const schoolPlan = await this.subscriptionService.getSchoolPlan(
      user.schoolId,
    );

    if (!schoolPlan) {
      throw new HttpException(
        'No subscription plan found for this school. Please contact support.',
        HttpStatus.FORBIDDEN,
      );
    }

    return { plan: schoolPlan, isSuperAdmin: false };
  }
}

@Injectable()
export class SubscriptionGuard extends BaseSubscriptionGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(
      SUBSCRIPTION_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const { plan: schoolPlan, isSuperAdmin } =
      await this.resolveSchoolPlan(context);

    if (isSuperAdmin) {
      return true;
    }

    for (const feature of requiredFeatures) {
      const hasAccess = this.subscriptionService.hasFeature(
        schoolPlan,
        feature,
      );

      if (!hasAccess) {
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: `Feature '${feature}' is not available on your current plan.`,
            requiredTier: this.subscriptionService.getFeatureTier(feature),
            currentTier: schoolPlan!.tier,
            upgradeRequired: true,
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    return true;
  }
}

@Injectable()
export class MinimumTierGuard extends BaseSubscriptionGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.get<string>(
      'minimumTier',
      context.getHandler(),
    );

    if (!requiredTier) {
      return true;
    }

    const { plan: schoolPlan, isSuperAdmin } =
      await this.resolveSchoolPlan(context);

    if (isSuperAdmin) {
      return true;
    }

    const requiredTierLevel = this.subscriptionService.getTierLevel(
      requiredTier as PlanTier,
    );
    const currentTierLevel = this.subscriptionService.getTierLevel(
      schoolPlan!.tier,
    );

    if (currentTierLevel < requiredTierLevel) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: `This feature requires ${requiredTier} plan or higher.`,
          requiredTier,
          currentTier: schoolPlan!.tier,
          upgradeRequired: true,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
