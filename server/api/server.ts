/**
 * API Server
 * Express server with REST endpoints for opportunities
 */

import express, { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";
import opportunitiesRouter from "./routes/opportunities.js";
import ingestionRouter from "./routes/ingestion.js";
import healthRouter from "./routes/health.js";
import { createModuleLogger } from "../utils/logger.js";
import { defaultRateLimiter } from "../utils/rateLimiter.js";
import { initRedisCache } from "../utils/cache.js";
import { redactSensitiveQuery } from "../utils/security.js";

const logger = createModuleLogger("api");

// Initialize Redis cache (non-blocking)
initRedisCache();

// Create Express app
const app: any = express();

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (config.corsAllowedOrigins.length === 0) {
    return config.nodeEnv !== "production";
  }

  return config.corsAllowedOrigins.includes(origin);
}

// Middleware
app.use(express.json());

// Apply default rate limiter to all routes
app.use(defaultRateLimiter);

// Basic security headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  next();
});

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin =
    typeof req.headers.origin === "string" ? req.headers.origin : undefined;

  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({
      success: false,
      error: "Origin not allowed",
    });
  }

  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      query: redactSensitiveQuery(req.query as Record<string, unknown>),
    });
  });

  next();
});

// Routes
app.use("/health", healthRouter);
app.use("/opportunities", opportunitiesRouter);
app.use("/ingestion", ingestionRouter);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Opportunity Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      opportunities: "/opportunities",
      search: "/opportunities/search",
      ingestion: "/ingestion",
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    success: false,
    error:
      config.nodeEnv === "production" ? "Internal server error" : err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Not found",
  });
});

// Start server
export function startServer(port: number = config.port): void {
  app.listen(port, () => {
    logger.info(`API server started on port ${port}`);
    console.log(
      `🚀 Opportunity Backend API running at http://localhost:${port}`,
    );
  });
}

// Export app for testing
export { app };

// Start if run directly
if (
  process.argv[1]?.endsWith("server.ts") ||
  process.argv[1]?.endsWith("server.js")
) {
  startServer();
}
