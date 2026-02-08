Summary (Jan 28, 2026)

Key Findings

- Secrets exposure risk: `.env` contains `HCAPTCHA_SECRET`. Ensure `.env` is not committed and rotate the secret if leaked.
- Service role usage: Edge Functions use Supabase service role and bypass RLS. Most routes perform explicit auth/role checks; keep consistent everywhere.
- CORS policy: Global `Access-Control-Allow-Origin: *` on functions. Prefer restricting origin in production.
- Rate limiting: Present on `verify-hcaptcha` only. Added rate limiting for `analytics_proxy` and `notifications_proxy` to mitigate abuse.
- Payments webhook: Proper signature verification (Stripe/Paystack) and timing-safe checks. Good.
- Storage of PII: `CVBuilder` stores CV data in localStorage; acceptable but increases risk if XSS exists. No `dangerouslySetInnerHTML` found in sampled code; continue monitoring.
- External APIs: OpenAI, PostHog, Brevo, OneSignal used server-side with env-configured keys. Ensure keys are set in Supabase secrets and never exposed to client.

Recommendations

- Git hygiene: Keep `.env` out of version control; rotate `HCAPTCHA_SECRET`. Use environment providers (Supabase/Vercel).
- Tighten CORS: Replace `*` with your production domain for `Access-Control-Allow-Origin`.
- Expand rate limiting: Apply per-user/IP limits to all mutating endpoints.
- Validate inputs: Keep trimming/length checks; validate types and bounds on all API payloads.
- Review RPC functions: Ensure `create_boost_from_payment` uses parameterized queries.
- CSP: Add a production Content Security Policy to reduce XSS risk.

Patched Files

- `.gitignore`: Added to exclude `.env` and common artifacts.
- `supabase/functions/api/analytics_proxy/index.ts`: Added rate limit.
- `supabase/functions/api/notifications_proxy/index.ts`: Added rate limit.
- `public/sw.js`: Restrict notification URL handling to http(s).

Next Steps

- Rotate `HCAPTCHA_SECRET` and re-deploy function `verify-hcaptcha` via Supabase.
- Confirm all env keys are stored in Supabase/Vercel secrets.
- Optionally restrict CORS origins in `supabase/functions/_shared/auth.ts`.