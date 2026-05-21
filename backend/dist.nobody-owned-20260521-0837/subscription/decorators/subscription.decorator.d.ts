export declare const SUBSCRIPTION_FEATURE_KEY = "subscription_features";
export declare const RequiresFeature: (...features: string[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const RequiresTier: (tier: "CORE" | "STANDARD" | "ULTIMATE") => import("@nestjs/common").CustomDecorator<string>;
export declare const CORE_FEATURES: string[];
export declare const STANDARD_FEATURES: string[];
export declare const ULTIMATE_FEATURES: string[];
export declare const FEATURE_DESCRIPTIONS: Record<string, string>;
export declare const TIER_DESCRIPTIONS: {
    CORE: {
        name: string;
        description: string;
        features: string[];
    };
    STANDARD: {
        name: string;
        description: string;
        features: string[];
    };
    ULTIMATE: {
        name: string;
        description: string;
        features: string[];
    };
};
