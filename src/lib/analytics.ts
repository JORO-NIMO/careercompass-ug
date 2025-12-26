/**
 * Analytics tracking service
 * Centralized event tracking with batching and offline support
 */
import { env } from './env';
import { api } from './api-client';
import type {
  AnalyticsActionName,
  AnalyticsActionPayload,
  AnalyticsEventEnvelope,
  AnalyticsEventName,
  AnalyticsEventPayload,
} from '@/types/analytics';
import { createAnalyticsEvent } from '@/types/analytics';

class AnalyticsService {
  private queue: AnalyticsEventEnvelope[] = [];
  private sessionId: string;
  private flushInterval: number = 5000; // 5 seconds
  private maxBatchSize: number = 10;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    
    if (env.features.analytics) {
      this.startAutoFlush();
      this.setupBeforeUnload();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startAutoFlush() {
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushInterval);
  }

  private setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      void this.flush(true);
    });
  }

  /**
   * Track a single event
   */
  track<Name extends AnalyticsEventName>(eventName: Name, props: AnalyticsEventPayload<Name>, userId?: string) {
    if (!env.features.analytics) return;

    const event = createAnalyticsEvent(eventName, props, {
      userId,
      sessionId: this.sessionId,
    });

    this.queue.push(event);

    // Auto-flush if queue is full
    if (this.queue.length >= this.maxBatchSize) {
      void this.flush();
    }
  }

  /**
   * Track page view
   */
  pageView(path: string, title?: string, userId?: string) {
    this.track('page.view', { path, title: title ?? document.title }, userId);
  }

  /**
   * Track user action
   */
  action<Name extends AnalyticsActionName>(actionName: Name, context: AnalyticsActionPayload<Name>, userId?: string) {
    this.track(`action.${actionName}`, context, userId);
  }

  /**
   * Flush queued events to server
   */
  async flush(sync = false) {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      if (sync && navigator.sendBeacon) {
        // Use sendBeacon for synchronous requests (e.g., page unload)
        const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics', blob);
      } else {
        // Regular async request
        await api.trackEvents(events);
      }
    } catch (error) {
      // Re-queue events on failure
      this.queue.unshift(...events);
      console.error('[Analytics] Failed to send events:', error);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    void this.flush(true);
  }
}

// Singleton instance
export const analytics = new AnalyticsService();

// Convenience functions
export const trackEvent = <Name extends AnalyticsEventName>(
  eventName: Name,
  props: AnalyticsEventPayload<Name>,
  userId?: string,
) => analytics.track(eventName, props, userId);

export const trackPageView = (path: string, title?: string, userId?: string) =>
  analytics.pageView(path, title, userId);

export const trackAction = <Name extends AnalyticsActionName>(
  actionName: Name,
  context: AnalyticsActionPayload<Name>,
  userId?: string,
) => analytics.action(actionName, context, userId);
