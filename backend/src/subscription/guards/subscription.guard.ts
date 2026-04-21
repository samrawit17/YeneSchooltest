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

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(
      SUBSCRIPTION_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

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
            currentTier: schoolPlan.tier,
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
export class MinimumTierGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.get<string>(
      'minimumTier',
      context.getHandler(),
    );

    if (!requiredTier) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

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

    const tierHierarchy: Record<PlanTier, number> = {
      CORE: 1,
      STANDARD: 2,
      ULTIMATE: 3,
    };

    const requiredTierLevel = tierHierarchy[requiredTier as PlanTier];
    const currentTierLevel = tierHierarchy[schoolPlan.tier];

    if (currentTierLevel < requiredTierLevel) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: `This feature requires ${requiredTier} plan or higher.`,
          requiredTier,
          currentTier: schoolPlan.tier,
          upgradeRequired: true,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
