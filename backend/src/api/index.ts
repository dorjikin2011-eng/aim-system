// backend/api/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server';

/**
 * Vercel serverless function wrapper for Express app
 */
export default (req: VercelRequest, res: VercelResponse) => {
  app(req as any, res as any);
};