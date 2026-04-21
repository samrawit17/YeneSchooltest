"use client";

import { notificationsAPI } from "@/lib/api";

const SERVICE_WORKER_PATH = "/sw.js";
export const PUSH_NOTIFICATIONS_DISABLED_KEY = "push_notifications_disabled";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!isPushSupported()) {
    return "unsupported";
  }

  return Notification.permission;
}

function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export async function registerNotificationServiceWorker() {
  if (!isPushSupported()) {
    return null;
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH);
}

async function getPublicKey() {
  const response = await notificationsAPI.getPublicKey();
  const { enabled, publicKey } = response.data as {
    enabled: boolean;
    publicKey: string | null;
  };

  if (!enabled || !publicKey) {
    return null;
  }

  return publicKey;
}

export async function syncPushSubscription() {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return { enabled: false, reason: "permission" as const };
  }

  localStorage.removeItem(PUSH_NOTIFICATIONS_DISABLED_KEY);

  const publicKey = await getPublicKey();
  if (!publicKey) {
    return { enabled: false, reason: "server" as const };
  }

  const registration = await registerNotificationServiceWorker();
  if (!registration) {
    return { enabled: false, reason: "unsupported" as const };
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(publicKey),
    });
  }

  await notificationsAPI.savePushSubscription(subscription.toJSON());
  return {
    enabled: true,
    permission: Notification.permission as NotificationPermission,
  };
}

export async function requestAndEnablePushNotifications() {
  if (!isPushSupported()) {
    return { enabled: false, permission: "unsupported" as const };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { enabled: false, permission };
  }

  localStorage.removeItem(PUSH_NOTIFICATIONS_DISABLED_KEY);

  return syncPushSubscription();
}

export async function disablePushNotifications() {
  if (!isPushSupported()) {
    return { success: false, reason: "unsupported" as const };
  }

  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
  const subscription = await registration?.pushManager.getSubscription();

  if (!subscription) {
    localStorage.setItem(PUSH_NOTIFICATIONS_DISABLED_KEY, "true");
    return { success: true };
  }

  await notificationsAPI.removePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
  localStorage.setItem(PUSH_NOTIFICATIONS_DISABLED_KEY, "true");

  return { success: true };
}
