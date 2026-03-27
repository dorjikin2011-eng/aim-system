// backend/api/index.ts
import { Request, Response } from 'express';
import app from '../server';

/**
 * Vercel serverless function wrapper for Express app
 */
export default function handler(req: Request, res: Response) {
  app(req as any, res as any);
};