/**
 * Centralized API client with error handling and type safety
 */
import type { AnalyticsEventEnvelope } from '@/types/analytics';
import type { NotificationPayload } from '@/types/notifications';
const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const fallbackBase = typeof window !== 'undefined' ? window.location.origin : '';
const apiBase = (() => {
  if (!rawApiBase) {
    return fallbackBase.replace(/\/+$/, '');
  }
  try {
    const normalized = new URL(rawApiBase).toString();
    return normalized.replace(/\/+$/, '');
  } catch (error) {
    console.warn('Invalid VITE_API_BASE_URL provided, falling back to window.location.origin.', error);
    return fallbackBase.replace(/\/+$/, '');
  }
})();

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!apiBase) {
    return normalizedPath;
  }
  return `${apiBase}${normalizedPath}`;
}


export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    const errorData = (isJson ? await response.json().catch(() => ({})) : {}) as Record<string, unknown>;
    throw new ApiError(
      errorData.message || errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (isJson) {
    const jsonBody = (await response.json().catch(() => null)) as unknown;
    return jsonBody as T;
  }

  const textBody = await response.text();
  return textBody as unknown as T;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(resolveApiUrl(path));
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

async function request<T>(
  path: string,
  { params, headers, ...options }: RequestOptions = {}
): Promise<T> {
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  return handleResponse<T>(response);
}

// API client methods
export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T, TBody extends JsonValue | Record<string, JsonValue> = JsonValue>(path: string, data?: TBody, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),

  put: <T, TBody extends JsonValue | Record<string, JsonValue> = JsonValue>(path: string, data?: TBody, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),

  patch: <T, TBody extends JsonValue | Record<string, JsonValue> = JsonValue>(path: string, data?: TBody, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

// Specific API methods
export const api = {
  // Jobs
  searchJobs: (query: string, provider: 'jsearch' | 'adzuna' = 'jsearch') =>
    apiClient.get('/api/jobs', { params: { query, provider } }),

  // Courses
  getCourses: (limit = 20) =>
    apiClient.get('/api/courses', { params: { limit } }),

  // Books
  searchBooks: (q: string, limit = 20) =>
    apiClient.get('/api/books', { params: { q, limit } }),

  // Careers
  searchCareers: (q: string) =>
    apiClient.get('/api/careers', { params: { q } }),

  getCareerByCode: (code: string) =>
    apiClient.get('/api/careers', { params: { code } }),

  // Analytics
  trackEvent: <Name extends AnalyticsEventEnvelope['event_name']>(event: AnalyticsEventEnvelope<Name>) =>
    apiClient.post('/api/analytics', event),

  trackEvents: (events: AnalyticsEventEnvelope[]) =>
    apiClient.post('/api/analytics', { events }),

  // Notifications
  sendNotification: (notification: NotificationPayload) =>
    apiClient.post('/api/notifications', notification),

  // Feedback
  submitFeedback: (feedback: {
    rating?: number;
    category?: string;
    message: string;
    anonymous?: boolean;
  }) => apiClient.post('/api/feedback', feedback),
};
