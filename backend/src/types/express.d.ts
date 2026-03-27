// backend/src/types/express.d.ts

import { UserRole } from '../models/user'; // adjust path if needed

// Use module augmentation to extend Express types
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: UserRole;
      agency_id: string | null;
    };
  }
}