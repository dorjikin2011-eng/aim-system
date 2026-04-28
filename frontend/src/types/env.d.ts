// frontend/src/types/env.d.ts
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV: 'development' | 'production' | 'test';
      readonly NEXT_PUBLIC_API_BASE?: string;
    }
  }
}