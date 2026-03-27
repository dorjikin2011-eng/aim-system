// /backend/src/types/user.ts

export type UserRole = 
  | 'system_admin' 
  | 'commissioner' 
  | 'director' 
  | 'prevention_officer' 
  | 'agency_head' 
  | 'focal_person';

export interface User {
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

// For session/user context (without sensitive info)
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agency_id?: string;
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

export interface UpdateProfileData {
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
  user?: AuthUser;
  error?: string;
}

export interface UserResponse {
  success: boolean;
  data?: User | AuthUser;
  error?: string;
}

export interface UsersResponse {
  success: boolean;
  data?: AuthUser[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

// Password reset token interface
export interface PasswordResetToken {
  id: string;
  token: string;
  email: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

// User status interface
export interface UserStatus {
  is_locked: boolean;
  lock_time_remaining?: number; // in minutes
  login_attempts: number;
  is_active: boolean;
}

// User stats for admin dashboard
export interface UserStats {
  total_users: number;
  active_users: number;
  locked_users: number;
  users_by_role: Record<UserRole, number>;
}