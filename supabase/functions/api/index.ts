// Supabase Edge Function Router (Deno)
// Consolidated entry point for the `api` function.

import { handleCors, corsHeaders } from '../_shared/auth.ts';

// Route handlers
import adminAdsHandler from './admin_ads/index.ts';
import adminBoostsHandler from './admin_boosts/index.ts';
import adminBulletsHandler from './admin_bullets/index.ts';
import adminListingsHandler from './admin_listings/index.ts';
import adminNotificationsHandler from './admin_notifications/index.ts';
import adsHandler from './ads/index.ts';
import analyticsProxyHandler from './analytics_proxy/index.ts';
import booksHandler from './books/index.ts';
import boostsHandler from './boosts/index.ts';
import boostsMaintenanceHandler from './boosts_maintenance/index.ts';
import bulletsHandler from './bullets/index.ts';
import companiesHandler from './companies/index.ts';
import coursesHandler from './courses/index.ts';
import listingsHandler from './listings/index.ts';
import notificationsHandler from './notifications/index.ts';
import notificationsProxyHandler from './notifications_proxy/index.ts';
import notificationsReadHandler from './notifications_read/index.ts';
import profilesHandler from './profiles/index.ts';
import userHandler from './user/index.ts';

// Route map
// @ts-ignore - Handlers are dynamically imported and typed in their own files
const routeHandlers: Record<string, any> = {
  'admin_ads': adminAdsHandler,
  'admin_boosts': adminBoostsHandler,
  'admin_bullets': adminBulletsHandler,
  'admin_listings': adminListingsHandler,
  'admin_notifications': adminNotificationsHandler,
  'ads': adsHandler,
  'analytics_proxy': analyticsProxyHandler,
  'books': booksHandler,
  'boosts': boostsHandler,
  'boosts_maintenance': boostsMaintenanceHandler,
  'bullets': bulletsHandler,
  'companies': companiesHandler,
  'courses': coursesHandler,
  'listings': listingsHandler,
  'notifications': notificationsHandler,
  'notifications_proxy': notificationsProxyHandler,
  'notifications_read': notificationsReadHandler,
  'profiles': profilesHandler,
  'user': userHandler,
};

// @ts-ignore - Deno is a global in Supabase Edge Functions
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const apiIndex = pathParts.indexOf('api');

    let route = '';
    if (apiIndex !== -1 && apiIndex < pathParts.length - 1) {
      route = pathParts[apiIndex + 1];
    }

    if (!route) {
      return new Response(JSON.stringify({ error: "No route specified" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const handler = routeHandlers[route];
    if (!handler) {
      return new Response(
        JSON.stringify({
          error: "Route not found",
          route,
          availableRoutes: Object.keys(routeHandlers),
        }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const response = await handler(req);

    // Ensure CORS headers are present
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (!response.headers.has(key)) {
        response.headers.set(key, value);
      }
    });

    return response;
  } catch (error) {
    console.error(`[api router] Error:`, error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
      }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
