/**
 * Opportunity Types
 * Core type definitions for the opportunity ingestion system
 */

// Opportunity type classification
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
  | 'other';

// Field/sector classification
export type OpportunityField =
  | 'ICT / Technology'
  | 'Engineering'
  | 'Business'
  | 'Health'
  | 'Agriculture'
  | 'Education'
  | 'Development / NGO'
  | 'Finance'
  | 'Law'
  | 'Media / Communications'
  | 'Arts / Creative'
  | 'Science / Research'
  | 'Environment'
  | 'Government / Policy'
  | 'General'
  | 'Other';

// Raw RSS feed item before processing
export interface RssFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  description?: string;
  creator?: string;
  categories?: string[];
  guid?: string;
  isoDate?: string;
}

// Processed opportunity ready for storage
export interface Opportunity {
  id?: string;
  title: string;
  organization: string | null;
  description: string | null;
  url: string;
  source: string;
  type: OpportunityType | null;
  field: OpportunityField | null;
  country: string | null;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
  embedding?: number[] | null;
}

// RSS source configuration
export interface RssSource {
  id?: string;
  name: string;
  url: string;
  is_active: boolean;
  last_fetched_at?: string;
  last_error?: string;
  items_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Ingestion log entry
export interface IngestionLog {
  id?: string;
  source_id?: string;
  source_url: string;
  status: 'running' | 'completed' | 'failed';
  items_fetched: number;
  items_inserted: number;
  items_skipped: number;
  items_failed: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

// Classification result
export interface ClassificationResult {
  type: OpportunityType | null;
  field: OpportunityField | null;
  country: string | null;
  confidence: number;
}

// Search parameters
export interface SearchParams {
  query?: string;
  type?: OpportunityType;
  field?: string;
  country?: string;
  limit?: number;
  offset?: number;
}

// Search result with similarity score
export interface OpportunitySearchResult extends Opportunity {
  similarity?: number;
  rank?: number;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Ingestion batch result
export interface IngestionResult {
  source: string;
  fetched: number;
  inserted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

// Embedding request
export interface EmbeddingRequest {
  id: string;
  text: string;
}

// Embedding response
export interface EmbeddingResponse {
  id: string;
  embedding: number[];
}
