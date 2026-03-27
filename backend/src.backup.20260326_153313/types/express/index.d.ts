import 'express-session';
import { UserRole } from '../index';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      agencyId: string | null;
    };
  }
}
