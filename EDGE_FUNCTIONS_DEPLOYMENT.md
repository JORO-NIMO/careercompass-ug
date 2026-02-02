# 🚀 Edge Functions Deployment Guide

**CareerCompass-UG - Production Deployment**  
**Date**: January 27, 2026

---

## ✅ TASK 1: DEBUG LOG REMOVAL - COMPLETE!

**File**: `src/pages/FindPlacements.tsx` (Line 14)

**Status**: ✅ **DONE** - Debug log removed

**Before**:
```typescript
const handleSearch = (filters: PlacementFilters) => {
    console.log("Search filters updated:", filters); // ❌ Debug log
};
```

**After**:
```typescript
const handleSearch = (filters: PlacementFilters) => {
    // Search filters are applied through the FeaturedPlacements component ✅
};
```

---

## 📦 TASK 2: EDGE FUNCTIONS DEPLOYMENT

### Prerequisites

Since Supabase CLI is not installed on your system, you have 2 options:

#### **Option A: Install Supabase CLI** (Recommended)

```powershell
# Install via npm globally
npm install -g supabase

# Or via Scoop (Windows package manager)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download from: https://github.com/supabase/cli/releases
```

#### **Option B: Deploy via Supabase Dashboard** (Manual)

1. Go to https://supabase.com/dashboard/project/xicdxswrtdassnlurnmp
2. Navigate to **Edge Functions** section
3. For each function folder, create and upload the code

---

## 🎯 DEPLOY ALL FUNCTIONS (Option A - CLI)

### Step 1: Login to Supabase
```powershell
cd E:\careercampuss\careercompass-ug
supabase login
```

### Step 2: Link Your Project
```powershell
supabase link --project-ref xicdxswrtdassnlurnmp
```

### Step 3: Deploy All Functions
```powershell
supabase functions deploy
```

This will deploy all 10 edge functions:
- ✅ analyze-profile
- ✅ api
- ✅ chat-ai
- ✅ crawl-target (disabled)
- ✅ embeddings (disabled)
- ✅ events
- ✅ notifications
- ✅ opportunity-notifications
- ✅ payments_webhook
- ✅ process-document
- ✅ verify-hcaptcha

---

## 🔧 INDIVIDUAL FUNCTION DEPLOYMENT

If you want to deploy specific functions:

```powershell
# Deploy chat-ai function
supabase functions deploy chat-ai

# Deploy events function
supabase functions deploy events

# Deploy notifications function
supabase functions deploy notifications

# Deploy payments webhook
supabase functions deploy payments_webhook

# Deploy all active functions (skip disabled ones)
supabase functions deploy analyze-profile api chat-ai events notifications opportunity-notifications payments_webhook process-document verify-hcaptcha
```

---

## 🔐 ENVIRONMENT VARIABLES (Required)

Before deploying, set these environment variables:

```powershell
# Set OpenAI API Key (for chat-ai function)
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Set Stripe Webhook Secret (for payments)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-secret

# Set Paystack Webhook Secret (for payments)
supabase secrets set PAYSTACK_WEBHOOK_SECRET=your-secret

# Set hCaptcha Secret (for verification)
supabase secrets set HCAPTCHA_SECRET=your-secret

# Verify secrets are set
supabase secrets list
```

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify each function:

### 1. Chat-AI Function
```powershell
# Test the function
curl -X POST https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/chat-ai \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about internships"}'

# Expected response: {"response": "...career advice..."}
```

### 2. Events Function
```powershell
# Test analytics event
curl -X POST https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/events \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"events": [{"event_type": "page_view", "user_id": "test"}]}'
```

### 3. Check Function Logs
```powershell
# View logs for chat-ai
supabase functions logs chat-ai

# View logs for all functions
supabase functions logs
```

---

## 🎯 QUICK DEPLOYMENT (All Steps)

```powershell
# 1. Install CLI (if not installed)
npm install -g supabase

# 2. Login
supabase login

# 3. Link project
supabase link --project-ref xicdxswrtdassnlurnmp

# 4. Set environment variables
supabase secrets set OPENAI_API_KEY=sk-your-key-here
supabase secrets set HCAPTCHA_SECRET=<your-hcaptcha-secret>

# 5. Deploy all functions
supabase functions deploy

# 6. Verify deployment
supabase functions list

# Done! ✅
```

---

## 🚨 TROUBLESHOOTING

### Issue: "supabase: command not found"
**Solution**: Install Supabase CLI using one of the methods above

### Issue: "Failed to deploy function"
**Solution**: Check function logs
```powershell
supabase functions logs function-name --tail 50
```

### Issue: "Environment variable not set"
**Solution**: Set the required secrets
```powershell
supabase secrets set VARIABLE_NAME=value
```

### Issue: "Authentication failed"
**Solution**: Login again
```powershell
supabase logout
supabase login
```

---

## 📊 DEPLOYMENT STATUS

| Task | Status | Time | Notes |
|------|--------|------|-------|
| Remove Debug Log | ✅ DONE | 2 min | FindPlacements.tsx cleaned |
| Install Supabase CLI | ⏳ PENDING | 2 min | Run: `npm install -g supabase` |
| Set Environment Variables | ⏳ PENDING | 3 min | Need OPENAI_API_KEY |
| Deploy Functions | ⏳ PENDING | 5 min | Run: `supabase functions deploy` |
| Verify Deployment | ⏳ PENDING | 3 min | Test endpoints |

**Total Estimated Time**: 15 minutes

---

## 🎉 NEXT STEPS

After deploying edge functions:

1. ✅ **Test the Chat-AI feature**
   - Go to `/opportunities-chat`
   - Send a test message
   - Verify AI responds correctly

2. ✅ **Test Analytics**
   - Navigate through the site
   - Check analytics dashboard
   - Verify events are tracked

3. ✅ **Test Notifications**
   - Create a new listing
   - Verify notifications sent
   - Check notification preferences

4. ✅ **Go Live!**
   - Deploy frontend to Vercel
   - Monitor Sentry dashboard
   - Watch for errors

---

## 📚 USEFUL COMMANDS

```powershell
# List all functions
supabase functions list

# Delete a function
supabase functions delete function-name

# View function details
supabase functions describe chat-ai

# Download function logs
supabase functions logs chat-ai > logs.txt

# Check project status
supabase status

# Pull latest from Supabase
supabase db pull
```

---

## 💡 ALTERNATIVE: Deploy via Dashboard

If you prefer not to use CLI:

1. Open https://supabase.com/dashboard/project/xicdxswrtdassnlurnmp/functions
2. Click "New Function"
3. For each function in `supabase/functions/`:
   - Copy the index.ts content
   - Paste in dashboard editor
   - Click "Deploy"

---

## ✅ SUMMARY

**What We Did**:
1. ✅ Removed debug log from FindPlacements.tsx
2. 📝 Created deployment guide for edge functions

**What You Need to Do**:
1. Install Supabase CLI: `npm install -g supabase`
2. Set OPENAI_API_KEY: `supabase secrets set OPENAI_API_KEY=sk-xxx`
3. Deploy functions: `supabase functions deploy`
4. Test and verify

**Estimated Total Time**: 15-20 minutes

---

**Ready to deploy? Run the commands above! 🚀**
