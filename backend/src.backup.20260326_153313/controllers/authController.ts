// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import UserService from '../services/userService';
import { assertUserRole, User } from '../types';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    console.log('\n=== LOGIN ATTEMPT ===');
    console.log('Email:', email);

    // ⚠️ TEMPORARILY DISABLE LOCK CHECKS - columns might not exist
    try {
      const isLocked = await UserService.isAccountLocked(email);
      if (isLocked) {
        const lockTime = await UserService.getLockTimeRemaining(email);
        return res.status(423).json({ 
          error: `Account is temporarily locked. Please try again in ${lockTime} minutes or contact your administrator.`
        });
      }
    } catch (lockError) {
      const error = lockError as Error;
      console.warn('Lock check failed (columns might not exist):', error.message);
      // Continue with login if lock checks fail
    }

    // Find user
    const user = await UserService.findByEmail(email) as User | null;
    
    // ✅ ADD DEBUG LOGGING HERE
    console.log('User found:', !!user);
    if (user) {
      console.log('User properties:', Object.keys(user));
      console.log('User status:', user.status);
      console.log('User is_active:', user.is_active);
      console.log('User status === "active":', user.status === 'active');
    }
    
    if (!user) {
      try {
        await UserService.incrementLoginAttempts(email);
      } catch (attemptError) {
        const error = attemptError as Error;
        console.warn('Failed to increment login attempts:', error.message);
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ✅ FIX: Check both status and is_active
    const isActive = user.status === 'active' || user.is_active === true || user.is_active === 1;
    
    console.log('Active check:', {
      status: user.status,
      is_active: user.is_active,
      result: isActive
    });
    
    if (!isActive) {
      console.log('❌ Account not active');
      return res.status(403).json({ 
        error: 'Account is deactivated. Please contact your administrator.' 
      });
    }

    // Verify password - add debug logging
    console.log('Password hash exists:', !!user.password_hash);
    console.log('Password hash length:', user.password_hash?.length);
    
    
    if (!user.password_hash) {
      console.error('User has no password hash:', email);
      return res.status(500).json({ error: 'Account configuration error. Please contact administrator.' });
    }
    // Right before line 73, add:
console.log('DEBUG - Raw password hash string:', JSON.stringify(user.password_hash));
console.log('DEBUG - Password hash char codes:');
for (let i = 0; i < user.password_hash.length; i++) {
  console.log(`  [${i}]: '${user.password_hash[i]}' (${user.password_hash.charCodeAt(i)})`);
}
    
    // With this tested version:
const hashToCompare = user.password_hash.trim(); // Trim any whitespace
console.log('Comparing with hash:', hashToCompare);
console.log('Hash length for comparison:', hashToCompare.length);

const isMatch = await bcrypt.compare(password, hashToCompare);
console.log('Password match result:', isMatch);
    
    
    if (!isMatch) {
      try {
        await UserService.incrementLoginAttempts(email);
      } catch (attemptError) {
        const error = attemptError as Error;
        console.warn('Failed to increment login attempts:', error.message);
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate and cast role
    const role = assertUserRole(user.role);
    console.log('User role validated:', role);

    // Reset login attempts and update last login
    try {
      await UserService.updateLastLogin(user.id);
    } catch (updateError) {
      const error = updateError as Error;
      console.warn('Failed to update last login:', error.message);
      // Continue anyway - this is not critical
    }

    // Get user for session (without sensitive info)
    const authUser = await UserService.getAuthUser(email);
    if (!authUser) {
      return res.status(500).json({ error: 'Failed to load user profile' });
    }

    // Set session data
    req.session.user = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role,
      agency_id: authUser.agency_id || null,
      department: authUser.department,
      phone: authUser.phone,
      profile_image: authUser.profile_image,
      last_login: authUser.last_login
    };

    // Save session before responding
req.session.save((err) => {
  if (err) {
    console.error('Session save error:', err);
    return res.status(500).json({ 
      error: 'Authentication succeeded but session failed' 
    });
  }
  
  console.log('✅ Session saved successfully');
  console.log('✅ Session ID:', req.sessionID);
  console.log('✅ Session user:', req.session.user);
  
  
  res.json({ 
    success: true, 
    user: req.session.user,
    message: 'Login successful',
    sessionId: req.sessionID
  });
});

  } catch (err: any) {
    console.error('Login error:', err);
    console.error('Error stack:', err.stack);
    
    if (err.message?.includes('Invalid role')) {
      return res.status(500).json({ 
        error: 'User account has invalid role configuration' 
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error during login',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    
    // Clear session cookie (use your actual session cookie name)
    res.clearCookie('aims.sid'); // ✅ CHANGED from 'connect.sid'
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
};

export const getCurrentUser = (req: Request, res: Response) => {
  if (req.session.user) {
    res.json({ 
      success: true, 
      user: req.session.user 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Not authenticated' 
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  
  // Validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false,
      error: 'Current password and new password are required' 
    });
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({ 
      success: false,
      error: 'New password must be at least 8 characters long' 
    });
  }

  // Check password strength
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumbers = /\d/.test(newPassword);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return res.status(400).json({
      success: false,
      error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    });
  }

  try {
    // Check if user is authenticated
    if (!req.session?.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated' 
      });
    }

    const currentUser = req.session.user;

    // Verify current password
    const isPasswordValid = await UserService.verifyPassword(currentUser.id, currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }

    // Check if new password is same as old
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    // Update password
    await UserService.updatePassword(currentUser.id, newPassword);

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to change password' 
    });
  }
};

// New function: Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  const { name, department, phone, profile_image } = req.body;

  try {
    // Check if user is authenticated
    if (!req.session?.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated' 
      });
    }

    const currentUser = req.session.user;

    // Validate input
    if (!name && !department && !phone && !profile_image) {
      return res.status(400).json({
        success: false,
        error: 'At least one field must be updated'
      });
    }

    // Update profile
    await UserService.updateProfile(currentUser.id, {
      name,
      department,
      phone,
      profile_image
    });

    // Update session user data
    if (name) req.session.user.name = name;
    if (department) req.session.user.department = department;
    if (phone) req.session.user.phone = phone;
    if (profile_image) req.session.user.profile_image = profile_image;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: req.session.user
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

// New function: Check user status (locked, attempts, etc.)
export const getUserStatus = async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.session?.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const currentUser = req.session.user;

    // Get user with status info
    const user = await UserService.findByEmail(currentUser.email) as User | null;
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Try to get lock status, but don't fail if columns don't exist
    let isLocked = false;
    let lockTimeRemaining = 0;
    try {
      isLocked = await UserService.isAccountLocked(currentUser.email);
      lockTimeRemaining = await UserService.getLockTimeRemaining(currentUser.email);
    } catch (lockError) {
      const error = lockError as Error;
      console.warn('Lock status check failed:', error.message);
    }

    res.json({
      success: true,
      data: {
        is_locked: isLocked,
        lock_time_remaining: lockTimeRemaining,
        login_attempts: user.login_attempts || 0,
        is_active: user.status === 'active' || user.is_active === true || user.is_active === 1,
        last_login: user.last_login,
        last_password_change: user.password_changed_at
      }
    });

  } catch (error) {
    console.error('Get user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user status'
    });
  }
};

// New function: Validate session/refresh user data
export const validateSession = async (req: Request, res: Response) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const currentUser = req.session.user;

    // Refresh user data from database
    const authUser = await UserService.getAuthUserById(currentUser.id);
    if (!authUser) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        error: 'User not found or account deactivated'
      });
    }

    // Check if user is still active
    const user = await UserService.findById(currentUser.id) as User | null;
    const isActive = user?.status === 'active' || user?.is_active === true || user?.is_active === 1;
    
    if (!isActive) {
      req.session.destroy(() => {});
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Update session with latest data
    req.session.user = {
      ...req.session.user,
      name: authUser.name,
      department: authUser.department,
      phone: authUser.phone,
      profile_image: authUser.profile_image,
      last_login: authUser.last_login
    };

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
    });

    res.json({
      success: true,
      user: req.session.user,
      message: 'Session is valid'
    });

  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate session'
    });
  }
};

// New function: Get user profile (public info)
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get public user info
    const authUser = await UserService.getAuthUserById(userId);
    if (!authUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if requesting user has permission
    const isSelf = req.session?.user?.id === userId;
    const isAdmin = req.session?.user?.role === 'system_admin';

    // Return appropriate data based on permissions
    const userData = {
      id: authUser.id,
      name: authUser.name,
      department: authUser.department,
      // Only include email and phone for self or admin
      ...((isSelf || isAdmin) && { email: authUser.email }),
      ...((isSelf || isAdmin) && { phone: authUser.phone }),
      profile_image: authUser.profile_image,
      role: authUser.role,
      agency_id: authUser.agency_id
    };

    res.json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
};