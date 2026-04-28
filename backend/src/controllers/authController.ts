// backend/src/controllers/authController.ts

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserService from '../services/userService';
import { assertUserRole, User } from '../types';

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || '5389de5bc7a704e2ee793a5b9cf2eae316bf2ddc8cd5e58c55967760f04cbd4b';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    console.log('\n=== LOGIN ATTEMPT ===');
    console.log('Email:', email);

    // Lock checks
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
      console.warn('Lock check failed:', error.message);
    }

    // Find user
    const user = await UserService.findByEmail(email) as User | null;
    
    console.log('User found:', !!user);
    if (user) {
      console.log('User properties:', Object.keys(user));
      console.log('User is_active:', user.is_active);
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

    // Check only is_active (no status column)
    const isActive = user.is_active === true || user.is_active === 1;
    
    console.log('Active check:', {
      is_active: user.is_active,
      result: isActive
    });
    
    if (!isActive) {
      console.log('❌ Account not active');
      return res.status(403).json({ 
        error: 'Account is deactivated. Please contact your administrator.' 
      });
    }

    // Verify password
    console.log('Password hash exists:', !!user.password_hash);
    console.log('Password hash length:', user.password_hash?.length);
    
    if (!user.password_hash) {
      console.error('User has no password hash:', email);
      return res.status(500).json({ error: 'Account configuration error. Please contact administrator.' });
    }
    
    const hashToCompare = user.password_hash.trim();
    console.log('Comparing with hash length:', hashToCompare.length);

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
    }

    // Get user for session (without sensitive info)
    const authUser = await UserService.getAuthUser(email);
    if (!authUser) {
      return res.status(500).json({ error: 'Failed to load user profile' });
    }

    // Set session data with type assertion
    (req.session as any).user = {
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

    // Save session before responding (promisified for Vercel serverless)
    try {
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log('✅ Session saved successfully');
            console.log('✅ Session ID:', req.sessionID);
            console.log('✅ Session user:', (req.session as any).user);
            resolve();
          }
        });
      });
    } catch (saveErr) {
      console.warn('Session save failed, but continuing with JWT...');
    }

    // Generate JWT token as fallback for Vercel serverless
    const jwtToken = jwt.sign(
      { 
        id: authUser.id, 
        email: authUser.email, 
        role: role,
        name: authUser.name,
        agency_id: authUser.agency_id || null
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ JWT token generated for user:', authUser.email);

    res.json({ 
      success: true, 
      user: (req.session as any).user,
      token: jwtToken,
      message: 'Login successful',
      sessionId: req.sessionID
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
    
    res.clearCookie('aims.sid');
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
};

export const getCurrentUser = (req: Request, res: Response) => {
  // First try to get user from session
  if ((req.session as any).user) {
    return res.json({ 
      success: true, 
      user: (req.session as any).user 
    });
  }
  
  // Then try to get from Authorization header (JWT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return res.json({ 
        success: true, 
        user: {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          agency_id: decoded.agency_id || null
        }
      });
    } catch (err) {
      console.error('JWT verification failed:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  res.status(401).json({ 
    success: false, 
    error: 'Not authenticated' 
  });
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  
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
    let userId: string | null = null;
    
    // Try to get user from session first
    if ((req.session as any)?.user) {
      userId = (req.session as any).user.id;
    } else {
      // Try JWT token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.id;
        } catch (err) {
          console.error('JWT verification failed:', err);
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated' 
      });
    }

    const isPasswordValid = await UserService.verifyPassword(userId, currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    await UserService.updatePassword(userId, newPassword);

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

export const updateProfile = async (req: Request, res: Response) => {
  const { name, department, phone, profile_image } = req.body;

  try {
    let userId: string | null = null;
    
    // Try to get user from session first
    if ((req.session as any)?.user) {
      userId = (req.session as any).user.id;
    } else {
      // Try JWT token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.id;
        } catch (err) {
          console.error('JWT verification failed:', err);
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated' 
      });
    }

    if (!name && !department && !phone && !profile_image) {
      return res.status(400).json({
        success: false,
        error: 'At least one field must be updated'
      });
    }

    await UserService.updateProfile(userId, {
      name,
      department,
      phone,
      profile_image
    });

    // Update session if it exists
    if ((req.session as any)?.user) {
      if (name) (req.session as any).user.name = name;
      if (department) (req.session as any).user.department = department;
      if (phone) (req.session as any).user.phone = phone;
      if (profile_image) (req.session as any).user.profile_image = profile_image;

      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: (req.session as any).user || { id: userId, name, department, phone, profile_image }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

export const getUserStatus = async (req: Request, res: Response) => {
  try {
    let email: string | null = null;
    
    // Try to get user from session first
    if ((req.session as any)?.user) {
      email = (req.session as any).user.email;
    } else {
      // Try JWT token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          email = decoded.email;
        } catch (err) {
          console.error('JWT verification failed:', err);
        }
      }
    }

    if (!email) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const user = await UserService.findByEmail(email) as User | null;
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let isLocked = false;
    let lockTimeRemaining = 0;
    try {
      isLocked = await UserService.isAccountLocked(email);
      lockTimeRemaining = await UserService.getLockTimeRemaining(email);
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
        is_active: user.is_active === true || user.is_active === 1,
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

export const validateSession = async (req: Request, res: Response) => {
  try {
    let currentUser: any = null;
    
    // Try to get user from session first
    if ((req.session as any)?.user) {
      currentUser = (req.session as any).user;
    } else {
      // Try JWT token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          currentUser = decoded;
        } catch (err) {
          console.error('JWT verification failed:', err);
        }
      }
    }

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const authUser = await UserService.getAuthUserById(currentUser.id);
    if (!authUser) {
      if (req.session) {
        req.session.destroy(() => {});
      }
      return res.status(401).json({
        success: false,
        error: 'User not found or account deactivated'
      });
    }

    const user = await UserService.findById(currentUser.id) as User | null;
    const isActive = user?.is_active === true || user?.is_active === 1;
    
    if (!isActive) {
      if (req.session) {
        req.session.destroy(() => {});
      }
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Update session if it exists
    if ((req.session as any).user) {
      (req.session as any).user = {
        ...(req.session as any).user,
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
    }

    // Generate new JWT token
    const newJwtToken = jwt.sign(
      { 
        id: authUser.id, 
        email: authUser.email, 
        role: authUser.role,
        name: authUser.name,
        agency_id: authUser.agency_id || null
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      user: (req.session as any).user || currentUser,
      token: newJwtToken,
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

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const userIdString = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdString) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const authUser = await UserService.getAuthUserById(userIdString);
    if (!authUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let sessionUser = (req.session as any)?.user;
    let isSelf = false;
    let isAdmin = false;

    if (sessionUser) {
      isSelf = sessionUser.id === userId;
      isAdmin = sessionUser.role === 'system_admin';
    } else {
      // Try JWT token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          isSelf = decoded.id === userId;
          isAdmin = decoded.role === 'system_admin';
        } catch (err) {
          console.error('JWT verification failed:', err);
        }
      }
    }

    const userData = {
      id: authUser.id,
      name: authUser.name,
      department: authUser.department,
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