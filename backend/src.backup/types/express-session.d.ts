// backend/src/types/express-session.d.ts
import type { UserRole } from './types'; // ✅ point to your actual types.ts

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      agency_id: string | null; // ✅ use snake_case to match DB column
      department?: string;
      phone?: string;
      profile_image?: string;
      last_login?: string;
    };
  }
}