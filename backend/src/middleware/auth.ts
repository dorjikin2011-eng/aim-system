// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
//import { UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || '5389de5bc7a704e2ee793a5b9cf2eae316bf2ddc8cd5e58c55967760f04cbd4b';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user || (req.session as any)?.user;
  if (!user || user.role !== 'system_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Require any authenticated user (checks session OR JWT token)
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // First check session
  let user = (req.session as any)?.user;

  // If no session user, check JWT token in Authorization header
  if (!user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          agency_id: decoded.agency_id || null
        };
        // Attach to session for future requests
        (req.session as any).user = user;
        console.log('✅ JWT authenticated user:', user.email);
      } catch (err) {
        console.error('❌ JWT verification failed:', err);
      }
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Expose for downstream handlers
  (req as any).user = user;

  next();
};

/**
 * Require a specific role
 */
export const requireRole = (roles: string | string[]) => {
  // Convert single role to array for consistency
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // First ensure user is authenticated with JWT support
    await requireAuth(req, res, async () => {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    });
  };
};

/**
 * Require write access (prevents viewer roles from modifying data)
 */
export const requireWriteAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Viewer role cannot modify data
  if (user.role === 'viewer') {
    return res.status(403).json({ 
      success: false,
      error: 'Viewer accounts cannot modify data. Read-only access only.' 
    });
  }
  
  next();
};

