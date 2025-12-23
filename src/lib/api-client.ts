/**
 * Centralized API client with error handling and type safety
 */
import { env } from './env';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
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
    const errorData = isJson ? await response.json().catch(() => ({})) : {};
    throw new ApiError(
      errorData.message || errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return isJson ? response.json() : response.text() as Promise<T>;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(path, window.location.origin);
  
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

  post: <T>(path: string, data?: any, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(data) }),

  put: <T>(path: string, data?: any, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(data) }),

  patch: <T>(path: string, data?: any, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(data) }),

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
  trackEvent: (event: { event_name: string; props?: Record<string, any> }) =>
    apiClient.post('/api/analytics', event),

  trackEvents: (events: Array<{ event_name: string; props?: Record<string, any> }>) =>
    apiClient.post('/api/analytics', { events }),

  // Notifications
  sendNotification: (notification: {
    user_id?: string;
    type: string;
    title: string;
    body?: string;
    channel?: string[];
  }) => apiClient.post('/api/notifications', notification),

  // Feedback
  submitFeedback: (feedback: {
    rating?: number;
    category?: string;
    message: string;
    anonymous?: boolean;
  }) => apiClient.post('/api/feedback', feedback),
};
