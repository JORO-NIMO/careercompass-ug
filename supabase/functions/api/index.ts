import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, corsHeaders } from './_shared/auth.ts';
import { jsonError, jsonSuccess } from './_shared/responses.ts';

// Static imports for all route handlers
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
import careersHandler from './careers/index.ts';
import companiesHandler from './companies/index.ts';
import coursesHandler from './courses/index.ts';
import jobsHandler from './jobs/index.ts';
import listingsHandler from './listings/index.ts';
import notificationsHandler from './notifications/index.ts';
import notificationsProxyHandler from './notifications_proxy/index.ts';
import notificationsReadHandler from './notifications_read/index.ts';
import profilesHandler from './profiles/index.ts';
import userHandler from './user/index.ts';

// Route map for O(1) lookup
const routeHandlers: Record<string, (req: Request) => Promise<Response>> = {
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
  'careers': careersHandler,
  'companies': companiesHandler,
  'courses': coursesHandler,
  'jobs': jobsHandler,
  'listings': listingsHandler,
  'notifications': notificationsHandler,
  'notifications_proxy': notificationsProxyHandler,
  'notifications_read': notificationsReadHandler,
  'profiles': profilesHandler,
  'user': userHandler,
};

Deno.serve(async (req) => {
  // Handle CORS preflight - crucial for browser calls
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const path = url.pathname;

  // Extract the route segment after 'api'
  const pathParts = path.split('/').filter(Boolean);

  const apiIndex = pathParts.indexOf('api');
  let route = '';

  if (apiIndex !== -1 && apiIndex < pathParts.length - 1) {
    const remainingParts = pathParts.slice(apiIndex + 1);

    for (let i = remainingParts.length; i > 0; i--) {
      const candidate = remainingParts.slice(0, i).join('_');
      if (routeHandlers[candidate]) {
        route = candidate;
        break;
      }
    }

    if (!route && remainingParts.length > 0) {
      route = remainingParts[0];
    }
  } else if (pathParts.length > 0) {
    route = pathParts[0];
  }

  if (!route) {
    return new Response(JSON.stringify({ error: "No route specified" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      },
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
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      },
    });
  }

  try {
    const response = await handler(req);
    // Ensure all success responses also have CORS headers if they don't already
    if (response) {
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (!response.headers.has(key)) {
          response.headers.set(key, value);
        }
      });
    }
    return response;
  } catch (error) {
    console.error(`[api router] Handler error for route '${route}':`, error);

    const errorDetails: Record<string, unknown> = {
      error: "Handler error",
      route,
      message: error instanceof Error ? error.message : String(error),
    };

    if (error instanceof Error && error.stack) {
      errorDetails.stack = error.stack.split('\n').slice(0, 5);
    }

    return new Response(
      JSON.stringify(errorDetails), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      },
    });
  }
});
