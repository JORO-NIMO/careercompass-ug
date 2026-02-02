# Deployment Checklist - Agentic Platform Features

This checklist covers everything needed to deploy the new agentic AI features.

## Prerequisites

- [ ] Supabase project with Pro plan (for Edge Functions and pgvector)
- [ ] OpenAI API key with credits
- [ ] n8n instance (self-hosted or cloud)
- [ ] Africa's Talking account (for SMS in East Africa)
- [ ] Domain with email forwarding capability (for newsletter ingestion)

---

## 1. Database Migrations

Run these migrations in order via **Supabase SQL Editor** (Dashboard → SQL Editor → New Query):

### Migration 1: Search Indexes
```sql
-- File: supabase/migrations/20260130_add_placements_search_indexes.sql
-- Run this first to enable fast search
```

### Migration 2: Admin Filters RPC
```sql
-- File: supabase/migrations/20260130_admin_distinct_filters.sql
```

### Migration 3: Agentic Platform Core
```sql
-- File: supabase/migrations/20260131_agentic_platform_rpcs.sql
-- Creates: job_alerts table, search_placements RPC, match_profile_to_jobs RPC
```

### Migration 4: CV Ingestion & Analytics
```sql
-- File: supabase/migrations/20260131_cv_ingestion_and_analytics.sql
-- Creates: profile embedding columns, workflow_logs, notification_delivery_logs
-- Note: Requires pgvector extension (enabled by default on Supabase Pro)
```

### Migration 5: Email Ingestion
```sql
-- File: supabase/migrations/20260131_email_ingestion.sql
-- Creates: ingested_emails, email_sources tables
```

**To run each migration:**
1. Open the .sql file in your editor
2. Copy the entire contents
3. Paste in Supabase SQL Editor
4. Click "Run"

---

## 2. Supabase Edge Functions

Deploy each Edge Function:

```powershell
cd e:\careercampuss\careercompass-ug

# Deploy chat agent (AI-powered job search)
npx supabase functions deploy chat-agent --project-ref xicdxswrtdassnlurnmp

# Deploy CV parser (profile enrichment with embeddings)
npx supabase functions deploy parse-cv --project-ref xicdxswrtdassnlurnmp

# Deploy email parser (newsletter job extraction)
npx supabase functions deploy parse-email --project-ref xicdxswrtdassnlurnmp
```

---

## 3. Supabase Secrets

Set these secrets in Supabase Dashboard → Edge Functions → Secrets:

| Secret Name | Description | Where to get it |
|-------------|-------------|-----------------|
| `OPENAI_API_KEY` | OpenAI API key | https://platform.openai.com/api-keys |
| `AFRICAS_TALKING_API_KEY` | SMS provider API key | https://account.africastalking.com |
| `AFRICAS_TALKING_USERNAME` | SMS provider username | Africa's Talking dashboard |

**Or via CLI:**
```powershell
npx supabase secrets set OPENAI_API_KEY=sk-your-key-here --project-ref xicdxswrtdassnlurnmp
npx supabase secrets set AFRICAS_TALKING_API_KEY=your-at-key --project-ref xicdxswrtdassnlurnmp
npx supabase secrets set AFRICAS_TALKING_USERNAME=your-username --project-ref xicdxswrtdassnlurnmp
```

---

## 4. Storage Bucket for CVs

Create a storage bucket for CV uploads:

1. Go to Supabase Dashboard → Storage
2. Click "New Bucket"
3. Name: `cvs`
4. Public: **No** (keep private)
5. Add RLS policy:

```sql
-- Allow users to upload their own CVs
CREATE POLICY "Users can upload own CVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own CVs
CREATE POLICY "Users can read own CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role full access
CREATE POLICY "Service role full access to CVs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'cvs')
WITH CHECK (bucket_id = 'cvs');
```

---

## 5. n8n Workflow Setup

### Option A: Self-hosted n8n (Recommended for Africa)

```bash
# Docker Compose
docker run -d --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-password \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

### Option B: n8n Cloud
Sign up at https://n8n.io/cloud

### Import Workflows

1. Open n8n (http://localhost:5678 or your cloud URL)
2. Go to Workflows → Import from File
3. Import these files:
   - `n8n/workflows/job-ingest.json` - Job scraping pipeline (runs every 6 hours)
   - `n8n/workflows/match-notify.json` - User matching and notifications
   - `n8n/workflows/email-ingest.json` - Newsletter ingestion (runs every 2 hours)

### Configure n8n Credentials

In n8n, create these credentials:

1. **Supabase HTTP Header Auth**
   - Name: `Supabase API`
   - Header Name: `apikey`
   - Header Value: Your Supabase anon key

2. **IMAP** (for email ingestion)
   - Host: Your mail server
   - Email: jobs@yourdomain.com
   - Password: Your email password

3. **Gmail OAuth** (alternative to IMAP)
   - Follow n8n's Gmail setup guide

### Set n8n Environment Variables

```bash
# Required for workflows
SUPABASE_URL=https://xicdxswrtdassnlurnmp.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 6. Frontend Environment Variables

Ensure your Vercel/deployment has these:

```env
VITE_SUPABASE_URL=https://xicdxswrtdassnlurnmp.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key  # For push notifications
```

---

## 7. Enable Push Notifications

1. Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

2. Add to Supabase secrets:
```powershell
npx supabase secrets set VAPID_PUBLIC_KEY=your-public-key --project-ref xicdxswrtdassnlurnmp
npx supabase secrets set VAPID_PRIVATE_KEY=your-private-key --project-ref xicdxswrtdassnlurnmp
```

3. Update `VITE_VAPID_PUBLIC_KEY` in Vercel

---

## 8. Email Ingestion Setup

### Option A: Dedicated Email Address
1. Create an email like `jobs@careercompass.ug`
2. Subscribe it to job newsletters (LinkedIn, BrighterMonday, etc.)
3. Configure IMAP credentials in n8n

### Option B: Gmail Forwarding
1. Create a Gmail filter to forward job emails
2. Use Gmail OAuth in n8n

### Add Trusted Sources
Run in SQL Editor to add more trusted email sources:

```sql
INSERT INTO public.email_sources (email_pattern, source_name, source_type, trust_score) VALUES
  ('@yourcompany.com', 'Your Company', 'company', 0.95),
  ('@anotherjobboard.com', 'Another Job Board', 'job_board', 0.8);
```

---

## 9. Test Each Feature

### Test Chat Agent
1. Open your deployed site
2. Click the chat bubble
3. Try: "Find me internships in Kampala"

### Test CV Upload
1. Go to Profile page
2. Upload a PDF CV
3. Verify skills are extracted

### Test Job Matching
1. Subscribe to job alerts via chat: "Notify me about software jobs"
2. Trigger matching manually:
```bash
curl -X POST https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/match-notify \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Test Admin Analytics
1. Go to /admin/workflows
2. Verify dashboards show data

---

## 10. Monitoring & Alerts

### Supabase Logs
- Dashboard → Edge Functions → Logs

### n8n Execution History
- n8n → Executions → View all

### Set Up Alerts (Optional)

Add Slack/email notifications in n8n workflows when:
- Job ingestion fails
- Notification delivery rate drops below 80%
- Workflow errors exceed threshold

---

## Deployment Order Summary

1. ✅ Run all database migrations
2. ✅ Create storage bucket
3. ✅ Set Supabase secrets
4. ✅ Deploy Edge Functions
5. ✅ Set up n8n with credentials
6. ✅ Import n8n workflows
7. ✅ Update frontend env vars
8. ✅ Deploy frontend to Vercel
9. ✅ Test each feature
10. ✅ Subscribe email to newsletters

---

## Estimated Costs

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Supabase Pro | $25 | Required for Edge Functions |
| OpenAI API | $5-20 | Based on usage |
| Africa's Talking SMS | Pay-per-SMS | ~UGX 50 per SMS |
| n8n Cloud | $20+ | Or self-host for free |
| Vercel | Free-$20 | Depends on traffic |

**Total: ~$50-80/month** for a production-ready agentic platform.

---

## Troubleshooting

### Edge Function not responding
- Check logs in Supabase Dashboard
- Verify secrets are set correctly
- Ensure function is deployed

### CV parsing fails
- Verify OpenAI API key has credits
- Check file size is under 5MB
- Ensure storage bucket exists

### n8n workflows not running
- Check n8n is accessible
- Verify credentials are configured
- Check execution logs for errors

### SMS not sending
- Verify Africa's Talking credentials
- Check phone number format (+256...)
- Ensure account has credits
