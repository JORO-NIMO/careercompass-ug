/**
 * Zod validation schemas for forms and API requests
 */
import { z } from 'zod';

// User authentication schemas
export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
});

// Placement schemas
export const placementSchema = z.object({
  position_title: z.string().min(3, 'Position title must be at least 3 characters'),
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  region: z.string().min(2, 'Region is required'),
  industry: z.string().min(2, 'Industry is required'),
  stipend: z.string().optional(),
  available_slots: z.number().int().positive('Must be a positive number'),
});

// Feedback schemas
export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  category: z.enum(['bug', 'idea', 'praise', 'other']).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  anonymous: z.boolean().default(false),
});

// Notification schemas
export const notificationSchema = z.object({
  user_id: z.string().uuid().optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  channel: z.array(z.enum(['in_app', 'email', 'push'])).default(['in_app']),
  scheduled_at: z.string().datetime().optional(),
});

// Analytics event schemas
export const analyticsEventSchema = z.object({
  event_name: z.string().min(1),
  user_id: z.string().uuid().optional(),
  session_id: z.string().optional(),
  props: z.record(z.any()).default({}),
  timestamp: z.string().datetime().optional(),
});

// Payment schemas
export const paymentIntentSchema = z.object({
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3),
  post_id: z.string().uuid(),
  boost_duration_days: z.number().int().positive().max(90),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type PlacementInput = z.infer<typeof placementSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
