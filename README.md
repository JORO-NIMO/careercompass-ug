# CareerCompass-UG

This repository contains the CareerCompass-UG web application: a Vite + React + TypeScript frontend using Tailwind CSS and a Supabase backend. The project provides user-facing pages for students, mentors, and employers and includes integrations for authentication, data storage, and real-time features.

This README replaces earlier scaffolded content and adds a detailed implementation plan for extending the platform with three major subsystems:

- Notifications system (in-app + email + scheduled jobs + preference center)
- Feedback & Analytics pipeline (events, admin dashboard, engagement metrics)
- Monetization layer (boosted/paid listings, payment integration, role-based access)

Below you'll find a practical specification, database schema suggestions, API endpoints, front-end components, admin UI changes, privacy/security notes, migration steps, and a prioritized implementation checklist.

## Table of contents

- Project overview
- Goals for the platform extension
- High-level architecture
- Database schema changes (suggested)
- API / backend endpoints
- Frontend changes & pages
- Payments and Boost Engine
- Analytics & Events tracking
- Admin interfaces
- Security, privacy, and compliance
- Migration & deployment notes
- Next steps and prioritized checklist

## Project overview

Current stack (found in the repo):

- Vite + React (TypeScript)
- Tailwind CSS + shadcn-ui (Radix + components)
- Supabase (Auth, Database, generated types)
- React Router, TanStack Query, Sonner/Toaster for UI

The sections below describe how to build the requested features while integrating with the existing stack.

## Quick start

- Install dependencies: npm ci
- Local development: npm run dev
- Type check: npm run type-check
- Production build: npm run build

## Deployment

- Netlify: build command npm run build, publish dist (SPA redirect handled via netlify.toml).
- Vercel: install npm ci, build npm run build, output dist, SPA rewrite to /index.html via vercel.json.

## Goals for the platform extension

Deliver the following capabilities:

- Full Notifications system: in-app + email + scheduled jobs, user preferences, notification history, admin broadcast and targeted alerts.
- Feedback module: collect ratings, issue reports, suggestions, and anonymous comments; store them with user or session linkage.
- Analytics pipeline: track events (logins, page views, CTA clicks, assessment steps, bookings, downloads, searches), and expose admin dashboards for engagement and funnel analysis.
- Monetization: paid boosted listings for mentors/employers with payment integration (card + mobile money) and a Boost Engine to increase visibility/ranking for paid posts.
- Role-based access control (RBAC): student, mentor, employer, admin, with admin tools to manage features/boosters.

## High-level architecture

- Frontend: React components and pages in `src/` integrated with existing layout and routing.
- Backend: Use Supabase Postgres + Edge Functions (or a small server) to run scheduled jobs, payment webhooks, analytics ingestion, and secure admin actions.
- Background jobs: scheduled tasks (via Supabase Scheduled Functions / cron / worker) to send scheduled notifications and process boosts.
- Email: transactional email provider (SendGrid / Postmark / Supabase Email) to send notification emails.
- Payments: Stripe for cards + Stripe-supported mobile money (or local gateway like Flutterwave / Paystack) for mobile payments. Use secure server endpoints and webhooks to capture events and finalize boosts.

## Suggested database schema changes

Add the following tables (examples shown as SQL fragments — adapt to your migration tooling and use `supabase/migrations/`):

1) notifications

```sql
CREATE TABLE public.notifications (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NULL, -- null for broadcasts
	type text NOT NULL, -- 'reminder','session','deadline','admin_alert', etc.
	title text NOT NULL,
	body text,
	metadata jsonb DEFAULT '{}',
	channel text[] DEFAULT ARRAY['in_app'], -- ['in_app','email','sms']
	scheduled_at timestamptz NULL,
	sent_at timestamptz NULL,
	read boolean DEFAULT false,
	created_at timestamptz DEFAULT now()
);
```

2) notification_preferences

```sql
CREATE TABLE public.notification_preferences (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
	preferences jsonb NOT NULL, -- e.g. { "session": {"email":true,"in_app":true}, ... }
	updated_at timestamptz DEFAULT now()
);
```

3) scheduled_jobs (to track pending jobs and retries)

```sql
CREATE TABLE public.scheduled_jobs (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	job_type text,
	payload jsonb,
	run_at timestamptz,
	status text DEFAULT 'pending', -- pending/processing/completed/failed
	attempts int DEFAULT 0,
	last_error text,
	created_at timestamptz DEFAULT now()
);
```

4) feedback

```sql
CREATE TABLE public.feedback (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NULL,
	session_id text NULL,
	rating int NULL, -- 1..5
	category text NULL, -- 'bug', 'idea', 'praise', 'other'
	message text NOT NULL,
	anonymous boolean DEFAULT false,
	metadata jsonb DEFAULT '{}',
	created_at timestamptz DEFAULT now()
);
```

5) analytics_events

```sql
CREATE TABLE public.analytics_events (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NULL,
	session_id text NULL,
	event_name text NOT NULL,
	props jsonb DEFAULT '{}',
	timestamp timestamptz DEFAULT now()
);
```

6) payments & transactions

```sql
CREATE TABLE public.payments (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL,
	amount_cents int NOT NULL,
	currency text NOT NULL,
	provider text NOT NULL, -- 'stripe', 'paystack', etc
	provider_charge_id text,
	status text NOT NULL, -- 'pending','succeeded','failed'
	metadata jsonb DEFAULT '{}',
	created_at timestamptz DEFAULT now()
);

CREATE TABLE public.boosts (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	post_id uuid NOT NULL, -- the listing id
	poster_id uuid NOT NULL,
	boost_until timestamptz NOT NULL,
	multiplier float DEFAULT 1.0,
	created_at timestamptz DEFAULT now()
);
```

7) feature_flags (for controlled rollouts)

```sql
CREATE TABLE public.feature_flags (
	key text PRIMARY KEY,
	enabled boolean DEFAULT false,
	config jsonb DEFAULT '{}',
	updated_at timestamptz DEFAULT now()
);
```

Ensure you add indexes on `analytics_events(event_name, timestamp)` and other high-cardinality columns as needed.

## Backend / API endpoints (suggested)

- POST /api/notifications/send — internal endpoint to create/send notification(s).
- GET /api/notifications?user_id=... — paginated notification history.
- PATCH /api/notifications/:id/read — mark as read.
- POST /api/notification-preferences — set user preferences.
- POST /api/feedback — submit feedback (accepts user_id or anonymous).
- POST /api/events — ingest analytics events (small endpoint; batch mode supported).
- POST /api/payments/create — create payment intent (server-side, talks to Stripe/Paystack).
- POST /api/payments/webhook — webhook endpoint to receive payment confirmations and update `payments` and `boosts`.
- GET /api/admin/analytics — aggregated metrics for admin dashboard (requires admin role).
- POST /api/admin/broadcast — send broadcast notifications to segments.

Implementation notes:

- Use Supabase Edge Functions or a small server (Node/Express) to host endpoints that require secrets (Stripe keys, mobile money credentials).
- Webhooks must be secured and idempotent.
- Provide a batch ingestion endpoint for analytics to avoid spamming the DB per-event; accept a few events per request.

## Frontend changes & pages

Add or update these pages/components in `src/`:

- `Notifications` components:
	- `NotificationBell` (global header icon + unread count)
	- `NotificationsPanel` (dropdown for recent items)
	- `/notifications` page: full notification history with filters (email/in-app, types) and mark-read actions.
	- `NotificationPreferences` page/section under user profile (toggle channels per type).

- `Feedback` components:
	- `FeedbackModal` (small feedback widget available globally)
	- `/feedback` page for submitting and viewing status (and for admins to review)

- `Analytics` admin pages:
	- `/admin/analytics` — charts & tables for page usage, user flow, drop-offs, top mentors, top posts, CTRs, completion rates.
	- Use lightweight charting (Recharts is already in deps) and paginated tables.

- `Payments` UX:
	- `BoostPost` flow on employer/mentor post creation page with amount, duration, and CTA.
	- Payment modal to collect payment method (Stripe Elements / redirect to provider), then show success/receipt.

- Company media management:
	- `UserDashboard` company cards include a media library for approved companies.
	- Uploads accept images or PDFs up to 5MB and store files in the `company-media` bucket via `/api/companies/:companyId/media`.

- `RBAC` UI updates:
	- Role selection flows for mentor and employer onboarding.
	- Admin-only pages are guarded by `useAuth().isAdmin` and server-side checks.

Design & UX notes:

- Keep mobile-first responsive design using existing Tailwind utilities and container patterns.
- Use clear CTAs (“Boost listing”, “Send Feedback”, “Enable email reminders”).
- Make notification preference toggles easy: enable/disable per channel per type.

## Payments & Boost Engine

- Use Stripe for card payments and Stripe-supported mobile money where available; for Uganda consider Flutterwave or Paystack as alternatives which support mobile money (MTN, Airtel) and card.
- Flow: create server-side payment intent -> confirm on client (Stripe Elements or hosted flow) -> webhook updates `payments` table and activates `boosts` row.
- Boost Engine: ranking multiplier applied during listing queries. Example: when querying placements, join or check `boosts` and compute ranking score as base_score + boost_multiplier * boost_factor, order by score, and show boosted badge.
- Ensure boosts have an expiry and are re-evaluated by a scheduled job.

## Analytics & Events tracking

Define canonical events (name + props):

- `user.login` { user_id }
- `page.view` { path, title }
- `cta.click` { cta_id, context }
- `assessment.step` { assessment_id, step, user_id/session_id }
- `mentorship.booked` { session_id, mentor_id, user_id }
- `resume.download` { post_id, user_id }
- `search.query` { query, filters }
- `listing.boosted` { post_id, boost_id, poster_id }

Implementation:

- Frontend: send events to `/api/events` in batches with lightweight debounce.
- Backend: store raw events in `analytics_events`, build materialized views or nightly aggregates for performance.
- Admin Dashboard: precompute funnel metrics and provide filters by date range, role, and feature flag.

## Admin interfaces

Create admin UIs (guarded) for:

- Notifications management: create broadcast rules, preview messages, schedule jobs.
- Feedback management: view, filter, mark processed, export CSV.
- Analytics: charts, filters, and detailed event lists.
- Payments & Boosts: view transactions, refund or revoke boosts, manual activation.
- Feature flags: toggle features per environment or segment.

## Security and privacy

- Do not rely on client-side role checks for security — enforce permissions server-side (RLS or server endpoints with admin verification).
- Store only necessary personal data; provide opt-out and data deletion flows.
- Secure webhooks (verify Stripe/Paystack signatures) and make endpoints idempotent.
- For analytics, support opt-out and respect `Do Not Track` if required.

## Migration & deployment notes

- Add SQL migration files under `supabase/migrations/` for all new tables.
- Add required environment variables to your deployment (example `.env.example`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY= # only on server
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYMENT_PROVIDER_KEY=
EMAIL_PROVIDER_API_KEY=
```

- Provision background job runner or use Supabase Scheduled Functions to run jobs every minute/hour for sending scheduled notifications and processing boost expirations.
- Ensure a Supabase storage bucket named `company-media` exists (or set `COMPANY_MEDIA_BUCKET`) and keep it public if you rely on direct URLs. Enforce the 5 MB limit and allow only image/* or application/pdf MIME types across Edge Functions and the client.

## Next steps (prioritized)

1. Create DB migrations for `notifications`, `notification_preferences`, `scheduled_jobs`, `feedback`, `analytics_events`, `payments`, `boosts`, `feature_flags`.
2. Implement server endpoints (Edge Functions or a small server) for notifications, events ingestion, payments, and webhooks.
3. Add frontend components: NotificationBell, Notifications page, NotificationPreferences, Feedback widget/modal, and Boost flow UI.
4. Wire payment provider (Stripe + local mobile money provider) with test keys and webhooks; implement webhook handlers that update DB and activate boosts.
5. Implement scheduled jobs to process `scheduled_jobs` and send notifications via in-app + email.
6. Add admin dashboards for analytics, notifications, feedback, and boosts.
7. Add CI checks to run lint, tsc, and build; add basic unit tests for critical flows.

## How I can help next

- I can scaffold the DB migration SQL files in `supabase/migrations/` for the tables above.
- I can create the server Edge Functions skeletons (notifications, events ingestion, payments webhook) and client-side API wrappers.
- I can add example React components/pages for Notifications, Notification Preferences, Feedback modal, and a minimal Admin Analytics page with mock charts.

Tell me which deliverable you want first and I will implement it in the repo (migrations, backend endpoints, or frontend scaffolding). 

## Credits and references

- This README is an internal project-spec document for implementing Notifications, Feedback, Analytics and Monetization in CareerCompass-UG. It replaces any previous Lovable scaffold notes.
