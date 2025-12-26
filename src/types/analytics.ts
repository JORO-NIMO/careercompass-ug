import type { JsonValue } from '@/lib/api-client';

export type AnalyticsActionName =
  | 'cta.click'
  | 'assessment.step'
  | 'mentorship.booked'
  | 'resume.download'
  | 'search.query'
  | 'listing.boosted';

export type AnalyticsEventName =
  | 'user.login'
  | 'page.view'
  | `action.${AnalyticsActionName}`;

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
