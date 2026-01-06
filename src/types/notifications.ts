export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  channel: string[];
  metadata: Record<string, any>;
  created_at: string;
  sent_at?: string;
  push_sent?: boolean;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  channel: string;
  type: string;
  enabled: boolean;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  created_at: string;
}

export interface NotificationEvent {
  id: string;
  notification_id: string;
  user_id: string;
  event_type: string;
  timestamp: string;
}
import type { JsonValue } from '@/lib/api-client';

export type NotificationChannel = 'in_app' | 'email' | 'push';

export type NotificationType =
  | 'session'
  | 'deadline'
  | 'admin_alert'
  | 'admin_broadcast'
  | 'custom';

export interface NotificationPayloadBase {
  user_id?: string;
  title: string;
  body?: string;
  channel?: NotificationChannel[];
  email?: string;
  player_id?: string;
  scheduled_at?: string;
}

type SessionMetadata = {
  sessionId: string;
  startsAt: string;
};

type DeadlineMetadata = {
  placementId: string;
  deadline: string;
};

type AdminAlertMetadata = {
  severity?: 'info' | 'warning' | 'critical';
  link?: string;
};

type JsonMetadata = Record<string, JsonValue>;

export type NotificationPayloadMap = {
  session: NotificationPayloadBase & {
    type: 'session';
    metadata: SessionMetadata;
  };
  deadline: NotificationPayloadBase & {
    type: 'deadline';
    metadata: DeadlineMetadata;
  };
  admin_alert: NotificationPayloadBase & {
    type: 'admin_alert';
    metadata?: AdminAlertMetadata;
  };
  admin_broadcast: NotificationPayloadBase & {
    type: 'admin_broadcast';
    metadata?: JsonMetadata;
  };
  custom: NotificationPayloadBase & {
    type: 'custom';
    metadata?: JsonMetadata;
  };
};

export type NotificationPayload = NotificationPayloadMap[NotificationType];

export type ExtractNotificationPayload<Type extends NotificationType> = NotificationPayloadMap[Type];

export type NotificationPreferenceChannels = Partial<Record<NotificationChannel, boolean>>;

export type NotificationPreferencesState = Partial<Record<NotificationType, NotificationPreferenceChannels>>;

export function createNotificationPayload<Type extends NotificationType>(
  type: Type,
  payload: Omit<ExtractNotificationPayload<Type>, 'type'>,
): ExtractNotificationPayload<Type> {
  return { type, ...payload } as ExtractNotificationPayload<Type>;
}
