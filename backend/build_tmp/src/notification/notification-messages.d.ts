export type NotificationLanguage = 'en' | 'am' | 'ar' | 'om' | 'so';
export interface NotificationTemplate {
    title: string;
    message: string;
}
export interface NotificationMessageSet {
    [key: string]: NotificationTemplate | ((...args: string[]) => NotificationTemplate);
}
export declare const notificationMessages: Record<NotificationLanguage, NotificationMessageSet>;
