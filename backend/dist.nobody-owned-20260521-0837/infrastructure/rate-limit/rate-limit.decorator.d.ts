export interface RateLimitOptions {
    limit: number;
    windowSec: number;
}
export declare const RATE_LIMIT_KEY = "rate_limit_options";
export declare const SKIP_RATE_LIMIT_KEY = "skip_rate_limit";
export declare const RateLimit: (options: RateLimitOptions) => import("@nestjs/common").CustomDecorator<string>;
export declare const SkipRateLimit: () => import("@nestjs/common").CustomDecorator<string>;
