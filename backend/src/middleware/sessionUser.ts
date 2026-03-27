// backend/src/middleware/sessionUser.ts
import { Request, Response, NextFunction } from 'express';

export const attachSessionUser = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  console.log('🔍 attachSessionUser middleware running');
  console.log('   Session ID:', req.sessionID);
  console.log('   Session exists:', !!req.session);
  
  // Use type assertion to access the user property
  const sessionUser = (req.session as any)?.user;
  console.log('   Session user exists:', !!sessionUser);
  
  if (sessionUser) {
    console.log('   ✅ Attaching user to req.user:', sessionUser.email);
    (req as any).user = sessionUser;
  } else {
    console.log('   ❌ No user in session');
    console.log('   Session data:', JSON.stringify(req.session, null, 2));
  }
  
  next();
};