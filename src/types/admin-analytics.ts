// TypeScript interfaces for admin analytics

export interface AnalyticsOverview {
  totalUsers: number;
  totalEmployers: number;
  newSignups: { daily: number; weekly: number; monthly: number };
  totalPlacements: number;
  applications: number;
  successfulPlacements: number;
}

export interface TimeSeriesPoint {
  date: string; // ISO date
  value: number;
}

export interface TopEntity {
  id: string;
  name: string;
  count: number;
}

export interface AdminAnalyticsResponse {
  overview: AnalyticsOverview;
  signupsSeries: TimeSeriesPoint[];
  placementsSeries: TimeSeriesPoint[];
  topCompanies: TopEntity[];
}
