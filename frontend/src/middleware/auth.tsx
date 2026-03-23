import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireAuthProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export const RequireAuth = ({ children, allowedRoles }: RequireAuthProps) => {
  const { user, loading } = useAuth();

  // ✅ Show nothing while loading to prevent redirect loop
  if (loading) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Allow 'admin' role to access 'system_admin' routes
  if (allowedRoles) {
    const hasAccess = allowedRoles.includes(user.role) || 
                     (allowedRoles.includes('system_admin') && user.role === 'admin');
    
    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};