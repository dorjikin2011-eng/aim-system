// backend/src/types/express.d.ts

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        agency_id?: string | null;
        department?: string;
        phone?: string;
        profile_image?: string;
      };
    }
  }
}

export {};