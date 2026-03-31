//frontend/src/context/AdminStatsContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface AdminStats {
  agencies: number;
  users: {
    total: number;
    commissioners: number;
    directors: number;
    focal_persons: number;
    prevention_officers: number;
  };
  activeDeclarations: number;
  approvedThisMonth: {
    count: number;
    avgScore: number;
  };
  overdueReviews: number;
  recentAuditLogs: number;
}

interface RecentActivity {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
}

interface AdminStatsContextType {
  stats: AdminStats | null;
  recentActivity: RecentActivity[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const AdminStatsContext = createContext<AdminStatsContextType | undefined>(undefined);

export function AdminStatsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
  console.log('🔄 fetchStats called');
  console.log('   authLoading:', authLoading);
  console.log('   user:', user);
  console.log('   user.role:', user?.role);
  
  // ✅ Only fetch if auth is complete AND user is system_admin or admin
  if (authLoading || !user || (user.role !== 'system_admin' && user.role !== 'admin')) {
    console.log('   ❌ Skipping fetch - auth not ready or wrong role');
    setLoading(false);
    return;
  }

  console.log('   ✅ Proceeding with stats fetch');
  
  try {
    setLoading(true);
    const res = await axios.get('${API_BASE}/api/admin/stats', {
  withCredentials: true
});

    console.log('   ✅ Stats API response:', res.data);
    setStats(res.data.stats);
    setRecentActivity(res.data.recentActivity);
    setError(null);
  } catch (err: any) {
    console.log('   ❌ Stats fetch error:', err.response?.status, err.response?.data);
    // ✅ Suppress 401 during auth transition
    if (err.response?.status !== 401) {
      setError(err.response?.data?.error || 'Failed to load admin stats');
    }
  } finally {
    setLoading(false);
  }
};

  // Fetch on auth change + interval
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [user, authLoading]); // ✅ Critical: depend on auth state

  return (
    <AdminStatsContext.Provider value={{
      stats,
      recentActivity,
      loading,
      error,
      refresh: fetchStats
    }}>
      {children}
    </AdminStatsContext.Provider>
  );
}

export const useAdminStats = () => {
  const context = useContext(AdminStatsContext);
  if (!context) throw new Error('useAdminStats must be used within AdminStatsProvider');
  return context;
};