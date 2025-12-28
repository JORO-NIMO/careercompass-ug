/**
 * Sentry Error Tracking Configuration
 * Production-only error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';
import { isProduction, isDevelopment } from './env';

// Sentry DSN from environment variable
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

let isInitialized = false;

/**
 * Initialize Sentry for error tracking
 * Only initializes in production with a valid DSN
 */
export function initSentry(): void {
    if (isInitialized) return;

    if (!SENTRY_DSN) {
        if (isDevelopment) {
            console.log('[Sentry] No DSN configured, error tracking disabled');
        }
        return;
    }

    if (!isProduction) {
        console.log('[Sentry] Skipping initialization in development mode');
        return;
    }

    try {
        Sentry.init({
            dsn: SENTRY_DSN,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration({
                    maskAllText: false,
                    blockAllMedia: false,
                }),
            ],
            // Performance monitoring
            tracesSampleRate: 0.1, // 10% of transactions
            // Session replay for errors
            replaysSessionSampleRate: 0.1, // 10% of sessions
            replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
            // Environment
            environment: 'production',
            // Release tracking (set via build process)
            release: import.meta.env.VITE_APP_VERSION || 'unknown',
            // Don't send errors from localhost
            allowUrls: [/placementbridge\.org/],
            // Ignore common non-actionable errors
            ignoreErrors: [
                'ResizeObserver loop limit exceeded',
                'ResizeObserver loop completed with undelivered notifications',
                'Non-Error promise rejection captured',
                'Network request failed',
                'Failed to fetch',
                'Load failed',
                'ChunkLoadError',
            ],
        });

        isInitialized = true;
        console.log('[Sentry] Initialized successfully');
    } catch (error) {
        console.error('[Sentry] Failed to initialize:', error);
    }
}

/**
 * Capture an exception with optional context
 */
export function captureException(
    error: Error,
    context?: {
        tags?: Record<string, string>;
        extra?: Record<string, unknown>;
        user?: { id?: string; email?: string };
    }
): void {
    if (!isInitialized) {
        console.error('[Error captured but Sentry not initialized]:', error);
        return;
    }

    if (context?.user) {
        Sentry.setUser(context.user);
    }

    Sentry.captureException(error, {
        tags: context?.tags,
        extra: context?.extra,
    });
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info'
): void {
    if (!isInitialized) {
        console.log(`[${level}] ${message}`);
        return;
    }

    Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, unknown>
): void {
    if (!isInitialized) return;

    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
    });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string } | null): void {
    if (!isInitialized) return;

    if (user) {
        Sentry.setUser(user);
    } else {
        Sentry.setUser(null);
    }
}

// Export the Sentry ErrorBoundary for use in React
export const SentryErrorBoundary = Sentry.ErrorBoundary;
