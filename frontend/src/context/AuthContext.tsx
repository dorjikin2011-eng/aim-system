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
    // ✅ Check for existing session on mount
    const checkSession = async () => {
      try {
        console.log('🔍 Checking for existing session...');
        const response = await getCurrentUser();
        
        if (response?.user) {
          console.log('✅ Existing session found for:', response.user.email);
          const userData = response.user;
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            agency_id: userData.agency_id,
          });
        } else {
          console.log('ℹ️ No existing session');
          setUser(null);
        }
      } catch (error) {
        console.log('❌ Session check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []); // RUNS EXACTLY ONCE ON MOUNT

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('🔑 Attempting login for:', email);
      
      const response = await apiLogin({ email, password });
      
      console.log('✅ Login response:', response);
      
      if (response?.user) {
        const userData = response.user;
        console.log('✅ User data from login:', userData);
        
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          agency_id: userData.agency_id,
        });

        setLoading(false);
      } else {
        throw new Error('Login response missing user data');
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
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