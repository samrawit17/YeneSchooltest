declare class PushSubscriptionKeysDto {
    p256dh: string;
    auth: string;
}
declare class PushSubscriptionBodyDto {
    endpoint: string;
    expirationTime?: number | null;
    keys: PushSubscriptionKeysDto;
}
export declare class SavePushSubscriptionDto {
    subscription: PushSubscriptionBodyDto;
}
export declare class RemovePushSubscriptionDto {
    endpoint: string;
}
export {};
