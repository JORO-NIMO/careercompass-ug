# 🚀 CareerCompass AI Platform - Complete Setup Checklist

## Current Status Analysis

Based on codebase analysis, here's everything that needs to be configured:

---

## 🔴 CRITICAL - Must Do First

### 1. Supabase Secrets (Edge Functions won't work without these)

Run these commands to set required secrets:

```powershell
# OpenAI - Required for AI chat, CV parsing, job extraction
npx supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here --project-ref xicdxswrtdassnlurnmp

# Africa's Talking - Required for SMS notifications (optional if not using SMS)
npx supabase secrets set AFRICAS_TALKING_API_KEY=your-at-key --project-ref xicdxswrtdassnlurnmp
npx supabase secrets set AFRICAS_TALKING_USERNAME=your-at-username --project-ref xicdxswrtdassnlurnmp
```

**Where to get keys:**
- OpenAI: https://platform.openai.com/api-keys
- Africa's Talking: https://account.africastalking.com

---

### 2. Database Migrations (Run in SQL Editor)

Go to **Supabase Dashboard → SQL Editor** and run these migrations **IN ORDER**:

| # | Migration File | What It Does | Status |
|---|----------------|--------------|--------|
| 1 | `20260130_add_placements_search_indexes.sql` | pg_trgm indexes for fast search | ⏳ |
| 2 | `20260130_admin_distinct_filters.sql` | Admin filter RPCs | ⏳ |
| 3 | `20260131_agentic_platform_rpcs.sql` | `search_placements`, `match_profile_to_jobs`, `job_alerts` table | ⏳ |
| 4 | `20260131_cv_ingestion_and_analytics.sql` | Profile embeddings, `workflow_logs`, analytics RPCs | ⏳ |
| 5 | `20260131_email_ingestion.sql` | Email ingestion tables and trust scoring | ⏳ |
| 6 | `20260131_pg_cron_schedules.sql` | Scheduled job automation | ⏳ |

**How to run:**
1. Open each `.sql` file in VS Code
2. Copy entire contents
3. Paste in Supabase SQL Editor
4. Click "Run"
5. Check for errors

---

### 3. Deploy Edge Functions

These are already deployed based on your terminal history, but verify:

```powershell
# Deploy all AI-related functions
npx supabase functions deploy chat-agent --project-ref xicdxswrtdassnlurnmp
npx supabase functions deploy parse-cv --project-ref xicdxswrtdassnlurnmp
npx supabase functions deploy parse-email --project-ref xicdxswrtdassnlurnmp
npx supabase functions deploy ingest-jobs --project-ref xicdxswrtdassnlurnmp
npx supabase functions deploy match-notify --project-ref xicdxswrtdassnlurnmp
```

---

## 🟡 IMPORTANT - Feature Enablement

### 4. Storage Bucket for CVs

Create in **Supabase Dashboard → Storage**:

```sql
-- Or run this SQL to create bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cvs', 'cvs', false)
ON CONFLICT DO NOTHING;

-- Add RLS policy for user CV uploads
CREATE POLICY "Users can upload own CVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

### 5. GitHub Actions Secrets (For Backup Scheduler)

Go to **GitHub Repo → Settings → Secrets → Actions** and add:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL` | `https://xicdxswrtdassnlurnmp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key from Supabase Dashboard → Settings → API |

---

### 6. Vercel Environment Variables

In **Vercel Dashboard → Project → Settings → Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | `https://xicdxswrtdassnlurnmp.supabase.co` | Already set |
| `VITE_SUPABASE_ANON_KEY` | Your anon key | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | For Vercel cron jobs |
| `CRON_SECRET` | Generate a random string | For cron auth |

---

## 🟢 OPTIONAL - Enhanced Features

### 7. Push Notifications (Web Push)

```powershell
# Generate VAPID keys
npx web-push generate-vapid-keys

# Set in Supabase
npx supabase secrets set VAPID_PUBLIC_KEY=your-public-key --project-ref xicdxswrtdassnlurnmp
npx supabase secrets set VAPID_PRIVATE_KEY=your-private-key --project-ref xicdxswrtdassnlurnmp

# Add to Vercel
# VITE_VAPID_PUBLIC_KEY=your-public-key
```

---

### 8. Email Ingestion (Newsletter Jobs)

1. Create a dedicated email: `jobs@yourcompany.com`
2. Subscribe to job newsletters (BrighterMonday, LinkedIn, etc.)
3. Set up email forwarding to trigger the `parse-email` function

---

## 📋 Quick Verification Checklist

After setup, test each feature:

### AI Chat
```bash
# Test chat-agent function
curl -X POST "https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/chat-agent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"message": "Find me internships in Kampala"}'
```

### Job Ingestion
```bash
# Test ingest-jobs function
curl -X POST "https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/ingest-jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Database Search
```sql
-- Test in SQL Editor
SELECT * FROM search_placements('software', NULL, NULL, 10);
```

---

## 🎯 Priority Order (Do This Today)

1. **Set OPENAI_API_KEY** (5 minutes)
   ```powershell
   npx supabase secrets set OPENAI_API_KEY=sk-xxx --project-ref xicdxswrtdassnlurnmp
   ```

2. **Run agentic migrations** (10 minutes)
   - Copy `20260131_agentic_platform_rpcs.sql` to SQL Editor
   - Run it

3. **Test chat widget** (2 minutes)
   - Open your deployed site
   - Click the chat bubble
   - Ask "Find software internships"

4. **Run remaining migrations** (15 minutes)
   - CV ingestion migration
   - Email ingestion migration
   - pg_cron migration

5. **Add GitHub secrets** (5 minutes)
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

---

## 🔧 Troubleshooting

### "Function returned error"
- Check Supabase Dashboard → Edge Functions → Logs
- Usually means missing secret (OPENAI_API_KEY)

### "RPC not found"
- Migration not run - run the relevant .sql file in SQL Editor

### "Permission denied"
- RLS policy issue - check migration ran completely

### "No jobs found"
- ingest-jobs hasn't run yet
- Manually trigger: call the function via curl

---

## 💰 Estimated Costs

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Supabase Pro | $25 | Required for Edge Functions + pg_cron |
| OpenAI API | $5-20 | ~$0.002 per chat message |
| Africa's Talking | Pay-per-SMS | ~UGX 50 per SMS |
| Vercel | Free-$20 | Depends on traffic |
| GitHub Actions | Free | 2000 mins/month for private repos |

**Total: ~$30-65/month** for a production AI platform.
