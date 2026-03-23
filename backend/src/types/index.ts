// /backend/src/types/index.ts

// User Role Types
export type UserRole =
  | 'commissioner'
  | 'director'
  | 'system_admin'
  | 'prevention_officer'
  | 'agency_head'
  | 'focal_person';

export const VALID_ROLES: UserRole[] = [
  'commissioner',
  'director',
  'system_admin',
  'prevention_officer',
  'agency_head',
  'focal_person'
];

export function assertUserRole(role: string): UserRole {
  if (!VALID_ROLES.includes(role as UserRole)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return role as UserRole;
}

// Database User Interface (with sensitive data)
export interface DBUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agency_id?: string;
  password_hash: string;
  created_at?: string;
  updated_at?: string;
  
  // Password reset fields
  password_reset_token?: string;
  password_reset_expires?: string;
  last_password_change?: string;
  
  // Account lockout fields
  last_login?: string;
  login_attempts?: number;
  lock_until?: string;
  is_active?: boolean;
  
  // Profile fields
  department?: string;
  phone?: string;
  profile_image?: string;
}

// Public User Interface (without sensitive data)
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agency_id?: string;
  department?: string;
  phone?: string;
  profile_image?: string;
  last_login?: string;
  is_active?: boolean;
}

// Session User Interface - MUST match express-session.d.ts exactly!
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agency_id: string | null;
  department?: string;
  phone?: string;
  profile_image?: string;
  last_login?: string;
}

// Request/Response types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterUserData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  agency_id?: string;
  department?: string;
  phone?: string;
}

export interface UpdateUserData {
  name?: string;
  department?: string;
  phone?: string;
  profile_image?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

// Response types
export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  error?: string;
}

// ✅ DO NOT redeclare express-session here - it's already in express-session.d.ts
// Remove any declare module 'express-session' blocks from this file