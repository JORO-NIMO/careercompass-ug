## Summary

- Deploy Supabase Edge Functions and add post-deploy endpoint verification
- Fix CSP to allow blob workers and vercel.live frames/websockets
- Set Vercel cron to daily (Hobby-compliant)
- Fix curated listings JSON-LD placement inside component

## Changes

- CI: Enhance `.github/workflows/deploy-edge-functions.yml` with verify job (access-control, ai-usage-alerts, chat-agent)
- CSP: Update `vercel.json` headers to include `worker-src 'self' blob:`, `frame-src vercel.live`, and `connect-src wss://*.vercel.live`
- Vercel Cron: Adjust `/cron/match-notify` to run once/day
- UI: Move `<JobPostingJsonLd />` inside `FeaturedPlacements` component

## Deployment Checklist

- [ ] GitHub Actions secrets are set:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_PROJECT_REF`
  - `SUPABASE_URL` (used by verify step)
  - Optional: `OPENAI_API_KEY`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, `MODEL_OVERRIDE`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run "Deploy Supabase Edge Functions" workflow (or merge to `main`)
- [ ] Confirm verify job passes (200/403 for `access-control`, 200 for `ai-usage-alerts`, 200 for `chat-agent`)
- [ ] Redeploy Vercel to apply CSP + cron
- [ ] Validate:
  - `/access-control` returns JSON (200/403)
  - No CSP errors for blob worker or `vercel.live`

## Security

- No secrets committed; all keys sourced from Actions secrets
- CSP tightened to explicit domains; frames limited to `hcaptcha` and `vercel.live`

## Testing

- Actions verify step curls endpoints and fails fast on errors
- Manual browser check for CSP and `/access-control` rewrite

## Rollback

- Revert this PR
- Temporarily disable cron rewrites in `vercel.json` if needed
## Summary

- Deploy Supabase Edge Functions and add post-deploy endpoint verification
- Fix CSP to allow blob workers and vercel.live frames/websockets
- Set Vercel cron to daily (Hobby-compliant)
- Fix curated listings JSON-LD placement inside component

## Changes

- CI: Enhance `.github/workflows/deploy-edge-functions.yml` with verify job (access-control, ai-usage-alerts, chat-agent)
- CSP: Update `vercel.json` headers to include `worker-src 'self' blob:`, `frame-src vercel.live`, and `connect-src wss://*.vercel.live`
- Vercel Cron: Adjust `/cron/match-notify` to run once/day
- UI: Move `<JobPostingJsonLd />` inside `FeaturedPlacements` component

## Deployment Checklist

- [ ] GitHub Actions secrets are set:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_PROJECT_REF`
  - `SUPABASE_URL` (used by verify step)
  - Optional: `OPENAI_API_KEY`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, `MODEL_OVERRIDE`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run "Deploy Supabase Edge Functions" workflow (or merge to `main`)
- [ ] Confirm verify job passes (200/403 for `access-control`, 200 for `ai-usage-alerts`, 200 for `chat-agent`)
- [ ] Redeploy Vercel to apply CSP + cron
- [ ] Validate:
  - `/access-control` returns JSON (200/403)
  - No CSP errors for blob worker or `vercel.live`

## Security

- No secrets committed; all keys sourced from Actions secrets
- CSP tightened to explicit domains; frames limited to `hcaptcha` and `vercel.live`

## Testing

- Actions verify step curls endpoints and fails fast on errors
- Manual browser check for CSP and `/access-control` rewrite

## Rollback

- Revert this PR
- Temporarily disable cron rewrites in `vercel.json` if needed
# Deploy Edge Functions + CSP fixes + Daily Cron

## Summary
- Add post-deploy endpoint verification in GitHub Actions.
- Fix Content Security Policy to allow `vercel.live` frames/websockets and blob workers.
- Adjust Vercel cron schedules to daily (Hobby compliance).
- Fix `curatedListings` JSON-LD rendering within component.

## Changes
- Workflow: `.github/workflows/deploy-edge-functions.yml` adds a `verify` job (access-control, ai-usage-alerts, chat-agent).
- CSP: [vercel.json](vercel.json) updates `script-src`, `worker-src`, `child-src`, `connect-src`, and `frame-src`.
- Cron: [vercel.json](vercel.json) sets `/cron/match-notify` to daily.
- UI: [src/components/FeaturedPlacements.tsx](src/components/FeaturedPlacements.tsx) moves JSON-LD inside the component.

## Pre-merge Checklist
- [ ] Set GitHub repo secrets for Actions:
  - `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`
  - Optional: `OPENAI_API_KEY`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, `MODEL_OVERRIDE`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Confirm Vercel project builds for this branch (or enable preview deployments).

## Post-merge Actions
- [ ] Trigger “Deploy Supabase Edge Functions” in Actions (or wait for push to `main`).
- [ ] Verify endpoints (Actions verify job):
  - `access-control`: 200 or 403
  - `ai-usage-alerts`: 200
  - `chat-agent (POST)`: 200
- [ ] Redeploy Vercel (if not automatic) to apply CSP + cron.
- [ ] Manually test:
  - https://placementbridge.org/access-control → JSON 200/403
  - https://YOUR_REF.supabase.co/functions/v1/access-control → JSON 200/403
  - Browser console → No CSP violations for blob workers or `vercel.live`.

## Notes
- Hobby plans require daily-only cron; non-daily schedules will fail deployment.
- If any functions require auth in verification, add `SUPABASE_ANON_KEY` and auth headers to the workflow.