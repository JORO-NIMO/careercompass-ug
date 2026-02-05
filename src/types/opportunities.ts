/**
 * Opportunity Types
 * Type definitions for the opportunities system
 */

export type OpportunityType = 
  | 'job'
  | 'internship'
  | 'scholarship'
  | 'fellowship'
  | 'training'
  | 'grant'
  | 'competition'
  | 'volunteer'
  | 'conference'
  | 'online_course'
  | 'other';

export interface Opportunity {
  id: string;
  title: string;
  description?: string;
  url: string;
  type?: OpportunityType;
  field?: string;
  country?: string;
  organization?: string;
  deadline?: string;
  image_url?: string;
  source_url?: string;
  published_at?: string;
  created_at: string;
  updated_at?: string;
  embedding?: number[];
}

export interface OpportunitySubscription {
  id: string;
  user_id: string;
  criteria: SubscriptionCriteria;
  channels: ('email' | 'push' | 'in_app')[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SubscriptionCriteria {
  types?: OpportunityType[];
  fields?: string[];
  countries?: string[];
  keywords?: string[];
}

export interface OpportunityNotification {
  id: string;
  user_id: string;
  subscription_id: string;
  opportunity_id: string;
  channel: 'email' | 'push' | 'in_app';
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  created_at: string;
}

export interface OpportunitySearchParams {
  query?: string;
  type?: OpportunityType;
  field?: string;
  country?: string;
  limit?: number;
  offset?: number;
}

export interface OpportunityStats {
  total: number;
  byType: Record<OpportunityType, number>;
  byCountry: Record<string, number>;
  byField: Record<string, number>;
  recentCount: number;
}
