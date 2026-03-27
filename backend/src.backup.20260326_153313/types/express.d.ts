// backend/src/types/express.d.ts
import { UserRole } from '../models/user'; // or wherever your UserRole is defined

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: UserRole;
       agency_id: string | null;
    }

    interface Request {
      user?: Express.User;
    }
  }
}