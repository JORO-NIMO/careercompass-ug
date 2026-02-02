import { supabase } from '@/integrations/supabase/client';
import type {
  ChatAgentRequest,
  ChatAgentResponse,
  ChatMessage,
  PlacementResult,
  SearchPlacementsArgs,
  MatchProfileArgs,
  SubscribeAlertsArgs,
} from '@/types/chat';

/**
 * Chat Agent Service
 * Handles communication with the chat-agent Edge Function and local tool execution
 */

const CHAT_AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`;

/**
 * Send a message to the chat agent
 */
export async function sendChatMessage(request: ChatAgentRequest): Promise<ChatAgentResponse> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(CHAT_AGENT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat agent error: ${error}`);
  }

  return response.json();
}

/**
 * Search placements using RPC
 */
export async function searchPlacements(args: SearchPlacementsArgs): Promise<PlacementResult[]> {
  const { data, error } = await supabase.rpc('search_placements', {
    p_query: args.query || '',
    p_region: args.region || null,
    p_industry: args.industry || null,
    p_flagged: false,
    p_limit: args.limit || 5,
    p_offset: 0,
  });

  if (error) throw error;
  return (data || []) as PlacementResult[];
}

/**
 * Get personalized job matches
 */
export async function matchProfile(args: MatchProfileArgs): Promise<PlacementResult[]> {
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user?.id;

  if (!userId) {
    // Fallback to general search for anonymous users
    return searchPlacements({ limit: args.limit || 5 });
  }

  const { data, error } = await supabase.rpc('match_profile_to_jobs', {
    p_user_id: userId,
    p_limit: args.limit || 5,
  });

  if (error) throw error;
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.placement_id as string,
    position_title: row.position_title as string,
    company_name: row.company_name as string,
    region: row.region as string,
    industry: row.industry as string,
    match_score: row.match_score as number,
    match_reasons: row.match_reasons as string[],
  }));
}

/**
 * Get placement details by ID
 */
export async function getPlacementDetails(id: string): Promise<PlacementResult | null> {
  const { data, error } = await supabase
    .from('placements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as PlacementResult;
}

/**
 * Subscribe to job alerts
 */
export async function subscribeToAlerts(args: SubscribeAlertsArgs): Promise<string> {
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user?.id;

  if (!userId) {
    throw new Error('Please sign in to subscribe to alerts');
  }

  const { data, error } = await supabase.rpc('subscribe_job_alerts', {
    p_user_id: userId,
    p_criteria: args.criteria,
    p_channels: args.channels,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Verify a source URL (basic implementation - can be enhanced with Edge Function)
 */
export async function verifySource(url: string): Promise<{
  verified: boolean;
  score: number;
  signals: string[];
}> {
  try {
    const urlObj = new URL(url);
    const signals: string[] = [];
    let score = 0;

    // HTTPS check
    if (urlObj.protocol === 'https:') {
      signals.push('Uses secure HTTPS connection');
      score += 25;
    } else {
      signals.push('Warning: Does not use HTTPS');
    }

    // Known job board domains
    const trustedDomains = [
      'linkedin.com',
      'indeed.com',
      'glassdoor.com',
      'brightermonday.co.ug',
      'fuzu.com',
      'jobwebuganda.com',
    ];

    if (trustedDomains.some((d) => urlObj.hostname.endsWith(d))) {
      signals.push('Recognized job platform');
      score += 50;
    }

    // Domain age and reputation would require external API
    // For now, add base score for valid URL
    if (urlObj.hostname.length > 3) {
      signals.push('Valid domain format');
      score += 15;
    }

    return {
      verified: score >= 50,
      score,
      signals,
    };
  } catch {
    return {
      verified: false,
      score: 0,
      signals: ['Invalid URL format'],
    };
  }
}

/**
 * Execute a tool call locally
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'searchPlacements':
      return searchPlacements(args as SearchPlacementsArgs);
    case 'matchProfile':
      return matchProfile(args as MatchProfileArgs);
    case 'getPlacementDetails':
      return getPlacementDetails(args.id as string);
    case 'subscribeAlerts':
      return subscribeToAlerts(args as SubscribeAlertsArgs);
    case 'verifySource':
      return verifySource(args.url as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Format placement results for display
 */
export function formatPlacementsForDisplay(placements: PlacementResult[]): string {
  if (placements.length === 0) {
    return 'No placements found matching your criteria.';
  }

  return placements
    .map((p, i) => {
      const matchInfo = p.match_score
        ? ` (${Math.round(p.match_score * 100)}% match${p.match_reasons?.length ? ': ' + p.match_reasons.join(', ') : ''})`
        : '';
      return `${i + 1}. **${p.position_title}** at ${p.company_name}${matchInfo}\n   📍 ${p.region} | 🏢 ${p.industry}${p.deadline ? ` | ⏰ Deadline: ${new Date(p.deadline).toLocaleDateString()}` : ''}`;
    })
    .join('\n\n');
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a chat message
 */
export function createMessage(
  role: ChatMessage['role'],
  content: string,
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role,
    content,
    createdAt: new Date(),
  };
}
