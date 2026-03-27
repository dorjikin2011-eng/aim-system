// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!(req.session as any).user || (req.session as any).user.role !== 'system_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Require any authenticated user
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Optional: expose for downstream handlers
  (req as any).user = user;

  next();
};

/**
 * Require a specific role
 */
export const requireRole = (roles: string | string[]) => {
  // Convert single role to array for consistency
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes((req as any).user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

