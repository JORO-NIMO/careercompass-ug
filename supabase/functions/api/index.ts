import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors } from '../_shared/auth.ts';

serve(async (req) => {
  // Handle CORS preflight - crucial for browser calls
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const path = url.pathname;

  // Extract the route options
  const pathParts = path.split('/').filter(Boolean);

  // Find the route segment that matches a known handler or is after 'api'
  // This handles paths like /functions/v1/api/jobs -> jobs
  let route = pathParts[0];

  // If invoked via Supabase Functions, path includes /functions/v1/api/...
  // We want the part after 'api' if present, or just the last part if feasible
  const apiIndex = pathParts.indexOf('api');
  if (apiIndex !== -1 && apiIndex < pathParts.length - 1) {
    route = pathParts[apiIndex + 1];
  }

  if (!route) {
    return new Response(JSON.stringify({ error: "No route specified" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Dynamically import the appropriate handler based on the route
    const handler = await import(`./${route}/index.ts`);

    // Forward the request to the specific route handler
    return await handler.default(req);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Route not found or handler error",
        route,
        message: error.message
      }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
});
