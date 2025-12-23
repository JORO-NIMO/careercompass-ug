# Quick Reference Guide

## Common Commands

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Check code quality
npm run type-check       # Check TypeScript types
```

### Database
```bash
npm run db:migrate       # Apply migrations to remote DB
npm run db:reset         # Reset local database
supabase migration new   # Create new migration
```

### Edge Functions
```bash
npm run functions:deploy # Deploy all functions
npm run functions:logs   # View function logs
supabase functions serve # Test locally
```

### Testing
```bash
npm test                 # Run tests (when added)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## Project Structure

```
careercompass-ug/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── ErrorBoundary.tsx
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.tsx
│   │   ├── usePageTracking.ts
│   │   └── use-toast.ts
│   ├── lib/                # Utilities and config
│   │   ├── env.ts          # Environment validation
│   │   ├── api-client.ts   # API client
│   │   ├── analytics.ts    # Analytics service
│   │   ├── validations.ts  # Zod schemas
│   │   └── utils.ts
│   ├── pages/              # Route components
│   │   ├── Index.tsx
│   │   ├── FindPlacements.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── ...
│   ├── services/           # External API services
│   │   ├── jsearchService.ts
│   │   ├── courseraService.ts
│   │   └── ...
│   ├── integrations/
│   │   └── supabase/       # Supabase client & types
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── events/
│   │   ├── notifications/
│   │   ├── payments_webhook/
│   │   └── api/
│   └── migrations/         # Database migrations
├── .github/
│   └── workflows/          # CI/CD pipelines
├── scripts/                # Utility scripts
└── public/                 # Static assets
```

## Key Files

### Configuration
- `tsconfig.json` - TypeScript config (strict mode enabled)
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS config
- `.env.local` - Local environment variables
- `.env.example` - Environment variable template

### Documentation
- `README.md` - Project overview
- `DEPLOYMENT.md` - Deployment instructions
- `PRODUCTION_READY.md` - Production checklist
- `PROJECT_STATUS.md` - Current status
- `QUICK_REFERENCE.md` - This file

## Environment Variables

### Required (Client-side)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
```

### Optional (Client-side)
```env
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_PAYMENTS=true
VITE_FEATURE_NOTIFICATIONS=true
```

### Server-side (Supabase secrets)
```env
SUPABASE_SERVICE_ROLE_KEY=xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
BREVO_API_KEY=xxx
```

## Common Tasks

### Create a New Page
1. Create file in `src/pages/NewPage.tsx`
2. Add lazy import in `src/App.tsx`
3. Add route in `<Routes>` section

### Add New API Endpoint
1. Create Edge Function: `supabase functions new my-function`
2. Implement logic in `index.ts`
3. Deploy: `supabase functions deploy my-function`

### Create Database Migration
1. Create migration: `supabase migration new my_change`
2. Write SQL in generated file
3. Apply: `supabase db push`

### Add Validation Schema
1. Add schema to `src/lib/validations.ts`
2. Export type
3. Use in component with `zodResolver`

### Track Analytics Event
```typescript
import { trackEvent } from '@/lib/analytics';

trackEvent('button.clicked', { 
  button_id: 'signup',
  page: 'home'
});
```

## Debugging

### Check Environment
```typescript
import { env } from '@/lib/env';
console.log(env); // View loaded config
```

### Check Database
```bash
supabase db inspect
supabase db branches list
```

### Check Edge Function Logs
```bash
supabase functions logs function-name --project-ref xxx
```

### Clear Build Cache
```bash
rm -rf node_modules/.vite
npm run build
```

## Useful Links

- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev)
- [Shadcn UI](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com)
- [Zod Validation](https://zod.dev)

## Git Workflow

### Feature Branch
```bash
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
# Create PR on GitHub
```

### Hotfix
```bash
git checkout -b hotfix/fix-issue
# Fix issue
git add .
git commit -m "fix: resolve issue"
git push origin hotfix/fix-issue
```

## Deployment

### To Staging (develop branch)
```bash
git push origin develop
# Automatic deployment via GitHub Actions
```

### To Production (main branch)
```bash
git checkout main
git merge develop
git push origin main
# Automatic deployment via GitHub Actions
```

### Manual Deployment
```bash
npm run build
netlify deploy --prod
```

## Support

### Common Issues

**"Missing environment variable"**
- Check `.env.local` exists and has all required vars
- Restart dev server after changing env vars

**"Module not found"**
- Check import path uses `@/` alias
- Run `npm install` to ensure deps are installed

**"Type error" after migration**
- Run `supabase gen types typescript` to regenerate types
- Update imports if table structure changed

**Build fails**
- Run `npm run type-check` to see specific errors
- Check `tsconfig.json` for strict mode issues
- Clear cache: `rm -rf node_modules/.vite`

### Getting Help

1. Check documentation files (README, DEPLOYMENT, etc.)
2. Review inline code comments
3. Check Supabase dashboard logs
4. Review GitHub Actions logs for CI/CD issues

## Performance Tips

- Use React.memo for expensive components
- Implement virtualization for long lists
- Use TanStack Query for data fetching
- Lazy load heavy components
- Optimize images (use WebP)
- Monitor bundle size with `npm run build --mode analyze`

## Security Best Practices

- Never commit `.env.local`
- Use RLS policies for all tables
- Validate all inputs with Zod
- Keep dependencies updated
- Enable 2FA on accounts
- Review Supabase logs regularly
- Use service role key only server-side

---

**Last Updated**: December 23, 2025  
**Version**: 1.0.0
