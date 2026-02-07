/**
 * API Server
 * Express server with REST endpoints for opportunities
 */

import express, { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import opportunitiesRouter from './routes/opportunities.js';
import ingestionRouter from './routes/ingestion.js';
import healthRouter from './routes/health.js';
import { createModuleLogger } from '../utils/logger.js';
import { defaultRateLimiter } from '../utils/rateLimiter.js';
import { initRedisCache } from '../utils/cache.js';

const logger = createModuleLogger('api');

// Initialize Redis cache (non-blocking)
initRedisCache();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply default rate limiter to all routes
app.use(defaultRateLimiter);

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      query: req.query,
    });
  });
  
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/opportunities', opportunitiesRouter);
app.use('/ingestion', ingestionRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Opportunity Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      opportunities: '/opportunities',
      search: '/opportunities/search',
      ingestion: '/ingestion',
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Start server
export function startServer(port: number = config.port): void {
  app.listen(port, () => {
    logger.info(`API server started on port ${port}`);
    console.log(`🚀 Opportunity Backend API running at http://localhost:${port}`);
  });
}

// Export app for testing
export { app };

// Start if run directly
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  startServer();
}
