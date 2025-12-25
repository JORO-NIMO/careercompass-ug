import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Extract the route from the path (e.g., /ads, /jobs, etc.)
  const pathParts = path.split('/').filter(Boolean);
  const route = pathParts[0];

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
