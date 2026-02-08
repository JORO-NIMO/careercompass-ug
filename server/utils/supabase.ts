/**
 * Supabase Client
 * Service role client for backend operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { logger } from './logger.js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      config.supabaseUrl,
      config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    logger.info('Supabase client initialized');
  }
  return supabaseClient;
}

/**
 * Check Supabase connection health
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('rss_sources').select('count').limit(1);
    if (error) {
      logger.error('Supabase health check failed', { error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('Supabase health check error', { error: err });
    return false;
  }
}

/**
 * Export client instance
 */
export const supabase = getSupabaseClient();
