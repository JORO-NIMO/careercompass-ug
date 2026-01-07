# Vercel Deployment Setup Guide

This guide will help you set up automatic deployment to Vercel via GitHub Actions.

## Prerequisites

- A Vercel account ([sign up here](https://vercel.com/signup))
- Repository admin access to configure GitHub secrets
- Node.js 18+ for local development

## Setup Steps

### 1. Create a Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository (`JORO-NIMO/careercompass-ug`)
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### 2. Get Your Vercel Credentials

#### A. Get Vercel Token
1. Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Give it a name (e.g., "GitHub Actions")
4. For **Scope**, select the personal or team account that owns this project and keep the default **Full Access** permissions so the GitHub Actions workflow can deploy.
5. Copy the token (you won't see it again!)

#### B. Get Project IDs
1. Go to your project in Vercel Dashboard
2. Click "Settings"
3. Under "General", find:
   - **Project ID**: Copy this value
4. Under your profile/org settings, find:
   - **Organization ID** (or Team ID): Copy this value

### 3. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click "New repository secret" and add the following:

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel authentication token | Vercel Account Settings → Tokens |
| `VERCEL_ORG_ID` | Your Vercel organization/team ID | Vercel Settings → General |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | Vercel Project Settings → General |
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | Supabase Dashboard → Project Settings → API |

### 4. Configure Environment Variables in Vercel

1. Go to your Vercel project settings
2. Navigate to **Settings → Environment Variables**
3. Add the following variables for all environments (Production, Preview, Development):
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable key

### 5. Trigger Deployment

Once everything is configured, deployment will happen automatically:

#### Automatic Deployment
- **Push to `main` branch**: Triggers production deployment
- **Manual trigger**: Go to Actions tab → "Vercel Deployment" → "Run workflow"

#### Monitor Deployment
1. **GitHub Actions**: Check the Actions tab in your repository
2. **Vercel Dashboard**: Monitor deployment progress and logs
3. **Deployment URL**: Find in the GitHub Actions output or Vercel dashboard

## Workflow Configuration

The workflow is defined in `.github/workflows/vercel-deploy.yml` and includes:

- ✅ Checkout code
- ✅ Install dependencies
- ✅ Build application with environment variables
- ✅ Deploy to Vercel production

## Troubleshooting

### Deployment Fails with "Invalid token"
- Verify `VERCEL_TOKEN` is correctly set in GitHub secrets
- Token may have expired - generate a new one from Vercel

### Build Fails with Missing Environment Variables
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set in both:
  - GitHub repository secrets
  - Vercel project environment variables

### Wrong Project Getting Deployed
- Double-check `VERCEL_PROJECT_ID` matches your project
- Verify `VERCEL_ORG_ID` is correct

### Deployment Succeeds but Site Doesn't Work
- Check browser console for errors
- Verify environment variables are correctly set in Vercel
- Check that Supabase keys are valid

## Local Testing

Before deploying, test the build locally:

```bash
# Install dependencies
npm ci

# Set environment variables
export VITE_SUPABASE_URL="your-supabase-url"
export VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-key"

# Build the application
npm run build

# Preview the build
npm run preview
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions for Vercel](https://github.com/marketplace/actions/vercel-action)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Project Documentation](./DEPLOYMENT.md)

## Support

If you encounter issues:
1. Check GitHub Actions logs for detailed error messages
2. Review Vercel deployment logs in the dashboard
3. Verify all secrets and environment variables are correctly configured
4. Ensure your Vercel account has sufficient permissions
