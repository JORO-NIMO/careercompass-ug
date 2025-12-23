/**
 * Analytics tracking service
 * Centralized event tracking with batching and offline support
 */
import { env } from './env';
import { apiClient } from './api-client';

interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  session_id?: string;
  props?: Record<string, any>;
  timestamp?: string;
}

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
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
      this.flush();
    }, this.flushInterval);
  }

  private setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
  }

  /**
   * Track a single event
   */
  track(eventName: string, props?: Record<string, any>, userId?: string) {
    if (!env.features.analytics) return;

    const event: AnalyticsEvent = {
      event_name: eventName,
      user_id: userId,
      session_id: this.sessionId,
      props: props || {},
      timestamp: new Date().toISOString(),
    };

    this.queue.push(event);

    // Auto-flush if queue is full
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  pageView(path: string, title?: string, userId?: string) {
    this.track('page.view', { path, title: title || document.title }, userId);
  }

  /**
   * Track user action
   */
  action(actionName: string, context?: Record<string, any>, userId?: string) {
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
        await apiClient.post('/api/analytics', { events });
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
    this.flush(true);
  }
}

// Singleton instance
export const analytics = new AnalyticsService();

// Convenience functions
export const trackEvent = (eventName: string, props?: Record<string, any>, userId?: string) =>
  analytics.track(eventName, props, userId);

export const trackPageView = (path: string, title?: string, userId?: string) =>
  analytics.pageView(path, title, userId);

export const trackAction = (actionName: string, context?: Record<string, any>, userId?: string) =>
  analytics.action(actionName, context, userId);
