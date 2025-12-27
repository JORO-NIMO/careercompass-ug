import { api } from './api-client';
import type { ExtractNotificationPayload, NotificationPayload, NotificationType } from '@/types/notifications';
import { createNotificationPayload } from '@/types/notifications';
import { analytics } from './analytics';

export const notificationChannels = ['in_app', 'email', 'push'] as const;

export type NotificationChannels = typeof notificationChannels[number];

export function buildNotification<Type extends NotificationType>(
  type: Type,
  payload: Omit<ExtractNotificationPayload<Type>, 'type'>,
): ExtractNotificationPayload<Type> {
  return createNotificationPayload(type, payload);
}

export async function sendNotification<Type extends NotificationType>(
  type: Type,
  payload: Omit<ExtractNotificationPayload<Type>, 'type'>,
): Promise<void> {
  const notification = buildNotification(type, payload);
  await api.sendNotification(notification);
  analytics.track('action.notification.sent', { type, user_id: payload.user_id });
}

export function dispatchNotification(notification: NotificationPayload): Promise<unknown> {
  analytics.track('action.notification.sent', { type: notification.type, user_id: notification.user_id });
  return api.sendNotification(notification);
}
