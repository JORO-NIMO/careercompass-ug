import type { JsonValue } from '@/lib/api-client';

export type AnalyticsActionName =
  | 'cta.click'
  | 'assessment.step'
  | 'mentorship.booked'
  | 'resume.download'
  | 'search.query'
  | 'listing.boosted'
  | 'listing.flagged'
  | 'listing.cleared'
  | 'listing.deleted';

export type AnalyticsEventName =
  | 'user.login'
  | 'page.view'
  | `action.${AnalyticsActionName}`
  | 'assistant.open'
  | 'assistant.ask'
  | 'assistant.response'
  | 'assistant.error';

type SerializableContext = Record<string, JsonValue>;

type AnalyticsEventPropsMap = {
  'user.login': { method?: string } & SerializableContext;
  'page.view': { path: string; title?: string };
  'action.cta.click': { cta_id: string; context?: SerializableContext };
  'action.assessment.step': {
    assessment_id: string;
    step: number;
    session_id?: string;
    user_id?: string;
  };
  'action.mentorship.booked': {
    session_id: string;
    mentor_id: string;
    user_id: string;
  };
  'action.resume.download': {
    post_id: string;
    user_id: string;
  };
  'action.search.query': {
    query: string;
    filters?: SerializableContext;
  };
  'action.listing.boosted': {
    post_id: string;
    boost_id: string;
    poster_id: string;
  };
  'action.listing.flagged': {
    listing_id: string;
    reason?: string;
    user_id?: string;
  };
  'action.listing.cleared': {
    listing_id: string;
    user_id?: string;
  };
  'action.listing.deleted': {
    listing_id: string;
    user_id?: string;
  };
  'assistant.open': { page: string; suggestions_count?: number };
  'assistant.ask': { page: string; question: string; source?: 'manual' | 'suggestion' };
  'assistant.response': {
    page: string;
    provider?: string;
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    elapsed_ms?: number;
  };
  'assistant.error': { page: string; error?: string };
};

export type AnalyticsEventPayload<Name extends AnalyticsEventName> = AnalyticsEventPropsMap[Name];

export type AnalyticsEventEnvelope<Name extends AnalyticsEventName = AnalyticsEventName> = {
  event_name: Name;
  props: AnalyticsEventPayload<Name>;
  user_id?: string;
  session_id?: string;
  timestamp?: string;
};

export type AnalyticsActionEventName = Extract<AnalyticsEventName, `action.${string}`>;
export type AnalyticsActionPayload<Name extends AnalyticsActionName> = AnalyticsEventPayload<`action.${Name}`>;

interface CreateAnalyticsEventOptions {
  userId?: string;
  sessionId?: string;
  timestamp?: string;
}

export function createAnalyticsEvent<Name extends AnalyticsEventName>(
  name: Name,
  props: AnalyticsEventPayload<Name>,
  options: CreateAnalyticsEventOptions = {},
): AnalyticsEventEnvelope<Name> {
  return {
    event_name: name,
    props,
    user_id: options.userId,
    session_id: options.sessionId,
    timestamp: options.timestamp ?? new Date().toISOString(),
  };
}
