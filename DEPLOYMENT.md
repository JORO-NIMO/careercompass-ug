# Deployment Guide for CareerCompass-UG

## Prerequisites

- Node.js 18+ installed
- Supabase CLI installed (`npm install -g supabase`)
- GitHub account (for CI/CD)
- Netlify account (for hosting) or Supabase hosting
- Required API keys (see `.env.example`)

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd careercompass-ug
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in required variables in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:8080`

### 4. Supabase Local Development (Optional)

```bash
supabase start
supabase db reset  # Apply all migrations
```

## Database Setup

### 1. Link to Supabase Project

```bash
supabase link --project-ref your-project-ref
```

### 2. Run Migrations

```bash
supabase db push
```

This will create all required tables, indexes, and RLS policies.

### 3. Verify Migrations

```bash
supabase migration list
```

### 4. Create Admin User

Run the admin setup script:

```bash
node scripts/set_admin.mjs your-email@example.com
```

## Edge Functions Deployment

### 1. Set Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions, add:

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
BREVO_API_KEY=...
JSEARCH_API_KEY=...
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
```

### 2. Deploy All Functions

```bash
supabase functions deploy
```

### 3. Deploy Specific Function

```bash
supabase functions deploy payments_webhook
```

## Production Deployment

### Option 1: Netlify (Recommended)

#### A. Via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

#### B. Via GitHub Integration

1. Push code to GitHub
2. Connect repository in Netlify dashboard
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy automatically on push

### Option 2: Supabase Hosting

```bash
supabase deploy
```

### Option 3: Vercel

#### A. Via Vercel CLI

```bash
npm install -g vercel
vercel --prod
```

#### B. Via GitHub Actions (Recommended)

1. Connect your repository to Vercel:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Note down your Project ID and Organization ID from project settings

2. Add required secrets in GitHub repository settings:
   ```
   VERCEL_TOKEN          # Get from Vercel Account Settings → Tokens
   VERCEL_ORG_ID         # From Vercel project settings
   VERCEL_PROJECT_ID     # From Vercel project settings
   ```

3. Push to `main` branch to trigger automatic deployment:
   ```bash
   git push origin main
   ```

4. Monitor deployment in GitHub Actions tab and Vercel dashboard

## GitHub Actions CI/CD

### Required Secrets

Add these secrets in GitHub repository settings:

#### For Netlify Deployment:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
```

#### For Vercel Deployment:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

### Workflow Triggers

- **Pull Requests**: Runs linting and type checking
- **Push to `develop`**: Deploys to staging (Netlify)
- **Push to `main`**: Deploys to production on both Netlify and Vercel (both workflows are triggered; disable one if you only want a single production deployment target)

### Manual Migration Deployment

Go to Actions → Database Migrations → Run workflow

## Post-Deployment Checklist

### 1. Verify Environment Variables

```bash
# Check if all required vars are set
grep "VITE_SUPABASE_URL" .env.local
```

### 2. Test Database Connectivity

```bash
# In browser console
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.from('profiles').select('count');
console.log(data, error);
```

### 3. Verify RLS Policies

Test that users can only access their own data:

```sql
-- In Supabase SQL Editor
SELECT * FROM notifications WHERE user_id = auth.uid();
```

### 4. Test Edge Functions

```bash
curl -X POST https://your-project.supabase.co/functions/v1/events \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"events":[{"event_name":"test"}]}'
```

### 5. Configure Webhooks

#### Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/payments_webhook`
3. Select events: `charge.succeeded`, `charge.failed`
4. Copy webhook secret to Supabase secrets

#### Paystack Webhook (Optional)

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add URL: `https://your-project.supabase.co/functions/v1/payments_webhook`
3. Copy webhook secret to Supabase secrets

### 6. Test Analytics Tracking

Visit your site and check Supabase dashboard:

```sql
SELECT * FROM analytics_events ORDER BY timestamp DESC LIMIT 10;
```

### 7. Monitor Error Logs

Check Supabase Edge Function logs:

```bash
supabase functions logs payments_webhook
```

## Monitoring & Maintenance

### Health Checks

Create a simple health check endpoint:

```bash
curl https://your-domain.com/
# Should return 200 OK
```

### Database Maintenance

Run weekly:

```sql
-- Vacuum and analyze tables
VACUUM ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE 'pg_toast%';
```

### Performance Monitoring

1. Enable Supabase performance insights
2. Monitor slow queries in dashboard
3. Check Edge Function response times

## Rollback Procedure

### Revert Code Deployment

```bash
# Netlify
netlify rollback

# Or redeploy previous commit
git revert HEAD
git push
```

### Revert Database Migration

```bash
# Create down migration
supabase migration new revert_last_change

# Edit SQL to undo changes, then
supabase db push
```

## Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Edge Functions Not Working

```bash
# Check logs
supabase functions logs function-name --project-ref your-ref

# Redeploy
supabase functions deploy function-name
```

### RLS Policy Issues

```sql
-- Temporarily disable RLS for debugging (NEVER in production)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### Environment Variables Not Loading

```bash
# Verify in build logs
echo $VITE_SUPABASE_URL

# Clear Netlify cache
netlify build --clear-cache
```

## Security Checklist

- [ ] All RLS policies enabled
- [ ] Service role key not exposed to client
- [ ] HTTPS enforced on all endpoints
- [ ] Webhook signatures verified
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Error messages don't leak sensitive data
- [ ] Admin routes protected server-side

## Performance Optimization

- [ ] Database indexes created
- [ ] Code splitting enabled (lazy loading)
- [ ] Static assets cached
- [ ] CDN configured
- [ ] Image optimization enabled
- [ ] Analytics batching configured
- [ ] Connection pooling enabled

## Backup Strategy

### Automated Backups

Supabase provides automatic daily backups. Configure in dashboard:
- Retention: 7 days minimum
- Point-in-time recovery enabled

### Manual Backup

```bash
# Export database
supabase db dump -f backup.sql

# Export Edge Functions
git archive -o functions-backup.zip HEAD supabase/functions/
```

## Support & Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Netlify Documentation](https://docs.netlify.com/)
- Project README: See README.md for architecture details
