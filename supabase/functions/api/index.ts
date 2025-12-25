// Supabase Edge Function Router (Deno)
// 
// This is the main entry point for the `api` edge function.
// It routes incoming requests to the appropriate subdirectory handler based on the URL path.
//
// Example routing:
//   /api/ads        → ./ads/index.ts
//   /api/jobs       → ./jobs/index.ts
//   /api/listings   → ./listings/index.ts
//   /api/companies  → ./companies/index.ts
//
// Supported routes (subdirectories):
//   - ads, admin_ads, admin_boosts, admin_bullets, admin_listings
//   - admin_notifications, analytics_proxy, books, boosts, boosts_maintenance
//   - bullets, careers, companies, courses, jobs, listings, notifications
//   - notifications_proxy, notifications_read, user_companies
//
// Each subdirectory must have an index.ts file that exports a default async function
// accepting a Request and returning a Response.

import { corsHeaders, handleCors } from '../_shared/auth.ts';

// Whitelist of allowed routes to prevent path traversal attacks
const ALLOWED_ROUTES = new Set([
  'ads',
  'admin_ads',
  'admin_boosts',
  'admin_bullets',
  'admin_listings',
  'admin_notifications',
  'analytics_proxy',
  'books',
  'boosts',
  'boosts_maintenance',
  'bullets',
  'careers',
  'companies',
  'courses',
  'jobs',
  'listings',
  'notifications',
  'notifications_proxy',
  'notifications_read',
  'user_companies',
]);

export default async function (req: Request): Promise<Response> {
  // Handle CORS preflight requests (OPTIONS method)
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse the URL to extract the route
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Find the 'api' segment and get the next segment as the route
    const apiIndex = pathSegments.indexOf('api');
    const route = apiIndex !== -1 && pathSegments[apiIndex + 1] 
      ? pathSegments[apiIndex + 1] 
      : null;

    // If no route is specified, return available routes info
    if (!route) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'No route specified',
          message: 'Please specify a route in the path (e.g., /api/ads, /api/jobs, /api/listings)'
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Validate route against whitelist to prevent path traversal
    if (!ALLOWED_ROUTES.has(route)) {
      console.error(`Attempted access to invalid route: ${route}`);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Route not found',
          route: route
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Dynamically import the handler for the specified route
    let handler;
    try {
      const module = await import(`./${route}/index.ts`);
      handler = module.default;
      
      if (typeof handler !== 'function') {
        throw new Error('Handler module does not export a default function');
      }
    } catch (importError) {
      console.error(`Failed to import handler for route '${route}':`, importError);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Route not found',
          route: route
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Forward the request to the handler
    const response = await handler(req);
    return response;

  } catch (error) {
    console.error('API router error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
}
