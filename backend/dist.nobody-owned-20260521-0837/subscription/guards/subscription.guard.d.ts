import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../subscription.service';
export declare class SubscriptionGuard implements CanActivate {
    private reflector;
    private subscriptionService;
    constructor(reflector: Reflector, subscriptionService: SubscriptionService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export declare class MinimumTierGuard implements CanActivate {
    private reflector;
    private subscriptionService;
    constructor(reflector: Reflector, subscriptionService: SubscriptionService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
