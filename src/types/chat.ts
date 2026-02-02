// Chat types for agentic platform
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: ToolName;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: ToolName;
  result: unknown;
  error?: string;
}

export type ToolName =
  | 'searchPlacements'
  | 'matchProfile'
  | 'getPlacementDetails'
  | 'subscribeAlerts'
  | 'verifySource';

export interface SearchPlacementsArgs {
  query?: string;
  region?: string;
  industry?: string;
  limit?: number;
}

export interface MatchProfileArgs {
  limit?: number;
}

export interface GetPlacementDetailsArgs {
  id: string;
}

export interface SubscribeAlertsArgs {
  criteria: {
    regions?: string[];
    industries?: string[];
    keywords?: string[];
  };
  channels: ('push' | 'email' | 'sms')[];
}

export interface VerifySourceArgs {
  url: string;
}

export interface PlacementResult {
  id: string;
  position_title: string;
  company_name: string;
  description?: string;
  region: string;
  industry: string;
  stipend?: string;
  available_slots?: number;
  deadline?: string;
  application_link?: string;
  match_score?: number;
  match_reasons?: string[];
}

export interface ChatSession {
  id: string;
  userId?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatAgentRequest {
  sessionId?: string;
  message: string;
  context?: {
    userId?: string;
    currentPage?: string;
  };
}

export interface ChatAgentResponse {
  sessionId: string;
  message: ChatMessage;
  suggestions?: string[];
  usage?: {
    provider: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    elapsedMs?: number;
  };
}

// Tool definitions for LLM
export const TOOL_DEFINITIONS = [
  {
    name: 'searchPlacements',
    description: 'Search for job placements, internships, and opportunities. Use this when the user asks about finding jobs, placements, or opportunities.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (job title, company name, or keywords)',
        },
        region: {
          type: 'string',
          description: 'Filter by region/location',
        },
        industry: {
          type: 'string',
          description: 'Filter by industry (e.g., Technology, Finance, Healthcare)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
        },
      },
    },
  },
  {
    name: 'matchProfile',
    description: 'Get personalized job recommendations based on the user\'s profile, skills, and interests. Use this when the user asks for recommendations or "jobs for me".',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of recommendations (default: 5)',
        },
      },
    },
  },
  {
    name: 'getPlacementDetails',
    description: 'Get detailed information about a specific placement. Use this when the user asks about a particular job.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The placement ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'subscribeAlerts',
    description: 'Subscribe the user to job alerts based on their preferences. Use this when the user wants notifications for new jobs.',
    parameters: {
      type: 'object',
      properties: {
        criteria: {
          type: 'object',
          properties: {
            regions: { type: 'array', items: { type: 'string' } },
            industries: { type: 'array', items: { type: 'string' } },
            keywords: { type: 'array', items: { type: 'string' } },
          },
        },
        channels: {
          type: 'array',
          items: { type: 'string', enum: ['push', 'email', 'sms'] },
          description: 'Notification channels',
        },
      },
      required: ['criteria', 'channels'],
    },
  },
  {
    name: 'verifySource',
    description: 'Verify the legitimacy of a job posting or company website. Use this when the user asks if something is legitimate.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to verify',
        },
      },
      required: ['url'],
    },
  },
] as const;
