// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  agency_id: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        console.log('🔍 Checking for existing session...');
        const response = await getCurrentUser();
        
        // Handle different response formats
        const userData = response?.user || response?.data?.user || response;
        
        if (userData && userData.id) {
          console.log('✅ Existing session found for:', userData.email);
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            agency_id: userData.agency_id || userData.agencyId || null,
          });
        } else {
          console.log('ℹ️ No existing session');
          setUser(null);
        }
      } catch (error: any) {
        console.log('❌ Session check failed:', error?.message || error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
  setLoading(true);
  try {
    console.log('🔑 Attempting login for:', email);
    
    const response = await apiLogin(email, password);
    
    console.log('✅ RAW Login response:', JSON.stringify(response, null, 2));
    
    // Extract user and token
    const userData = response?.user || response?.data?.user || response;
    const token = response?.token;
    
    if (userData && userData.id) {
      console.log('✅ User data from login:', userData);
      
      // Store token if provided
      if (token) {
        localStorage.setItem('token', token);
        console.log('✅ Token stored in localStorage');
      }
      
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        agency_id: userData.agency_id || userData.agencyId || null,
      });
    } else {
      console.error('❌ No user data found in response:', response);
      throw new Error('Login response missing user data');
    }
  } catch (err: any) {
    console.error('❌ Login error:', err);
    throw new Error(err?.message || 'Login failed. Please check your credentials.');
  } finally {
    setLoading(false);
  }
};

  const logout = async () => {
    setLoading(true);
    try {
      await apiLogout();
    } catch (err: any) {
      console.error('Logout error:', err?.message || err);
    } finally {
      // Clear user state and token regardless of API response
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};