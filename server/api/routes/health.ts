/**
 * Health Check Routes
 * Endpoints for monitoring server and service health
 */

import { Router, Request, Response } from 'express';
import { checkSupabaseHealth } from '../../utils/supabase.js';
import { isEmbeddingServiceAvailable } from '../../services/embeddingService.js';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req: Request, res: Response) => {
  const supabaseHealthy = await checkSupabaseHealth();
  const embeddingsAvailable = isEmbeddingServiceAvailable();
  
  const healthy = supabaseHealthy;
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseHealthy ? 'connected' : 'disconnected',
      embeddings: embeddingsAvailable ? 'available' : 'not configured',
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * GET /health/ready
 * Readiness check for load balancers
 */
router.get('/ready', async (req: Request, res: Response) => {
  const supabaseHealthy = await checkSupabaseHealth();
  
  if (supabaseHealthy) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

/**
 * GET /health/live
 * Liveness check
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

export default router;
