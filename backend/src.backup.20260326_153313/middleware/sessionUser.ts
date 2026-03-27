//backend/src/middleware/sessionUser.ts
import { Request, Response, NextFunction } from 'express';

export const attachSessionUser = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  console.log('🔍 attachSessionUser middleware running');
  console.log('   Session ID:', req.sessionID);
  console.log('   Session exists:', !!req.session);
  console.log('   Session user exists:', !!req.session?.user);
  
  if (req.session?.user) {
    console.log('   ✅ Attaching user to req.user:', req.session.user.email);
    req.user = req.session.user;
  } else {
    console.log('   ❌ No user in session');
    console.log('   Session data:', JSON.stringify(req.session, null, 2));
  }
  
  next();
};