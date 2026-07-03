"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinimumTierGuard = exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const subscription_decorator_1 = require("../decorators/subscription.decorator");
const isSuperAdmin = (user) => String(user?.role || '').toLowerCase() === 'super_admin';
class BaseSubscriptionGuard {
    reflector;
    subscriptionService;
    constructor(reflector, subscriptionService) {
        this.reflector = reflector;
        this.subscriptionService = subscriptionService;
    }
    async resolveSchoolPlan(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (isSuperAdmin(user)) {
            return { plan: null, isSuperAdmin: true };
        }
        if (!user || !user.schoolId) {
            throw new common_1.HttpException('School not found in request', common_1.HttpStatus.FORBIDDEN);
        }
        const schoolPlan = await this.subscriptionService.getSchoolPlan(user.schoolId);
        if (!schoolPlan) {
            throw new common_1.HttpException('No subscription plan found for this school. Please contact support.', common_1.HttpStatus.FORBIDDEN);
        }
        return { plan: schoolPlan, isSuperAdmin: false };
    }
}
let SubscriptionGuard = class SubscriptionGuard extends BaseSubscriptionGuard {
    async canActivate(context) {
        const requiredFeatures = this.reflector.getAllAndOverride(subscription_decorator_1.SUBSCRIPTION_FEATURE_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredFeatures || requiredFeatures.length === 0) {
            return true;
        }
        const { plan: schoolPlan, isSuperAdmin } = await this.resolveSchoolPlan(context);
        if (isSuperAdmin) {
            return true;
        }
        for (const feature of requiredFeatures) {
            const hasAccess = this.subscriptionService.hasFeature(schoolPlan, feature);
            if (!hasAccess) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.FORBIDDEN,
                    message: `Feature '${feature}' is not available on your current plan.`,
                    requiredTier: this.subscriptionService.getFeatureTier(feature),
                    currentTier: schoolPlan.tier,
                    upgradeRequired: true,
                }, common_1.HttpStatus.FORBIDDEN);
            }
        }
        return true;
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)()
], SubscriptionGuard);
let MinimumTierGuard = class MinimumTierGuard extends BaseSubscriptionGuard {
    async canActivate(context) {
        const requiredTier = this.reflector.get('minimumTier', context.getHandler());
        if (!requiredTier) {
            return true;
        }
        const { plan: schoolPlan, isSuperAdmin } = await this.resolveSchoolPlan(context);
        if (isSuperAdmin) {
            return true;
        }
        const requiredTierLevel = this.subscriptionService.getTierLevel(requiredTier);
        const currentTierLevel = this.subscriptionService.getTierLevel(schoolPlan.tier);
        if (currentTierLevel < requiredTierLevel) {
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.FORBIDDEN,
                message: `This feature requires ${requiredTier} plan or higher.`,
                requiredTier,
                currentTier: schoolPlan.tier,
                upgradeRequired: true,
            }, common_1.HttpStatus.FORBIDDEN);
        }
        return true;
    }
};
exports.MinimumTierGuard = MinimumTierGuard;
exports.MinimumTierGuard = MinimumTierGuard = __decorate([
    (0, common_1.Injectable)()
], MinimumTierGuard);
//# sourceMappingURL=subscription.guard.js.map