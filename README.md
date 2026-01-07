# CareerCompass-UG

CareerCompass-UG is a Vite + React + TypeScript web application that helps Ugandan learners, graduates, and employers connect around placements, learning pathways, and admin workflows. The frontend uses Tailwind CSS with shadcn-ui components, while Supabase powers authentication, persistence, and real-time features.

This document reflects the project status as of December 2025.

## Feature Highlights

- Student Talent Profile with Supabase-backed save/preview, availability, institution lookup, and FAQ guidance
- Feedback centre with category, rating, and anonymous submission options stored in Supabase
- Employer onboarding that allows missing websites, raises admin notifications, and provides guidance instead of “bullet spend” widgets
- **Opportunity Feed**: Verified placements, internships, and fellowships aggregated from trusted local and regional sources.
- **Learning & Growth Hub**: Curated courses, scholarships, and resources to bridge skill gaps.
- **Career Insights**: CV guides, interview preparation tips, and labor market trends specific to Uganda.

## Recent Improvements

- Normalised student location via region/district selectors using a curated Uganda district catalogue
- Added local storage caching for extended profile details (CV, bio, region, district)
- Hardened company submission flow to message admins on missing digital presence
- Enhanced feedback modal to capture sentiment, metadata, and optional anonymity
- Replaced spend bullet UI with actionable text guidance for companies
- Updated footer CTA to launch an email prefill for partnership outreach

## Tech Stack

- React 18 with TypeScript and Vite
- Tailwind CSS + shadcn-ui (Radix primitives)
- Supabase Auth, Database, and Functions
- TanStack Query for async state, React Router for routing
- Lucide icons, Sonner toasts, Recharts for analytics visuals

## Getting Started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and populate Supabase keys
3. Start development server: `npm run dev`
4. Type-check: `npm run type-check`
5. Build for production: `npm run build`

Additional scripts:

- `npm run lint` / `npm run lint:fix`
- `npm run build:dev` for development-mode bundling
- `npm run preview` for a local production preview
- Supabase helpers: `npm run db:migrate`, `npm run db:reset`, `npm run functions:deploy`

## Environment Variables

Required client variables (see `.env.example`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server/Edge-only variables (if deploying functions):

- `SUPABASE_SERVICE_ROLE_KEY`
- Payment, email, and webhook secrets as relevant to your deployment

## Project Structure Overview

- `src/pages` — route-level pages such as StudentProfile, AdminDashboard, JobFeed
- `src/components` — shared layout (Header, Footer), onboarding, cards, and UI primitives
- `src/hooks` — Supabase auth helper, toast utilities, responsive helpers
- `src/services` — integrations (Adzuna, Coursera, JSearch, Open Library)
- `src/lib` — shared utilities including the Uganda district catalogue and institute listings
- `supabase` — configuration, migrations, and edge functions

## Data Flows

- **Profiles**: Upserted to Supabase `profiles` table; extended fields cached locally for smoother edits
- **Feedback**: Submitted via modal to Supabase `feedback` table with category, rating, and metadata
- **Notifications**: Admin alerts for missing company websites use the `notifications` edge helper (see `src/services`)

## Known Issues & Follow-Up Work

- Investigate and eliminate intermittent “request failed” resource errors reported on Find Talent flows
- Extend Find Talent search with district filters leveraging the new Uganda district data
- Finalise newsletter subscription flow (pending backend endpoint wiring)
- Document Supabase deployment and environment setup in more depth
- Re-run `npm run build` and address any outstanding TypeScript build failures

## Contributing

1. Fork the repository and create a feature branch
2. Run linting and type checks before opening a pull request
3. Provide context in PR descriptions, including Supabase migrations or config changes

## License

Internal project. Rights reserved unless explicitly stated otherwise.
