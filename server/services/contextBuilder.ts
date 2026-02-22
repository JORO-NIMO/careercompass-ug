/**
 * contextBuilder Service
 * Aggregates user context for AI requests
 */

import { getUserProfile } from './database';
import { getSessionCache } from './cache';
import { getRecentActivity } from './logger';

export interface UserContext {
  role?: string;
  interests?: string[];
  recent_searches?: string[];
  preferred_tone?: string;
  experience_level?: string;
  location?: string;
  session_context?: Record<string, any>;
}

/**
 * Build user context object for AI prompt enrichment
 * @param userId - User identifier
 * @param sessionId - Session identifier
 */
export async function contextBuilder(userId: string, sessionId?: string): Promise<UserContext> {
  const profile = await getUserProfile(userId);
  const session = sessionId ? await getSessionCache(sessionId) : {};
  const activity = await getRecentActivity(userId, 10);

  // Summarize and sanitize context
  const context: UserContext = {
    role: profile?.role,
    interests: profile?.interests,
    recent_searches: activity?.searches || [],
    preferred_tone: profile?.preferred_tone,
    experience_level: profile?.experience_level,
    location: profile?.location,
    session_context: session || {},
  };

  // Limit context size
  Object.keys(context).forEach(key => {
    if (Array.isArray(context[key]) && context[key].length > 5) {
      context[key] = context[key].slice(0, 5);
    }
  });

  return context;
}
