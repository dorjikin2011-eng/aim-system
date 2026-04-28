// frontend/src/pages/admin/AdminDashboard.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import DashboardHome from './DashboardHome';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth(); // ✅ Get loading state
  const navigate = useNavigate();

  // ✅ Show auth loader while session is being established
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Redirect non-admin away
  useEffect(() => {
    // ✅ Only redirect after auth is loaded and user exists
    if (!authLoading && user) {
      const allowedRoles = ['admin', 'system_admin', 'viewer'];
      if (!allowedRoles.includes(user.role)) {
        switch (user.role) {
          case 'prevention_officer':
            navigate('/prevention');
            break;
          case 'commissioner':
            navigate('/commission');
            break;
          case 'director':
            navigate('/director');
            break;
          case 'agency_head':
            navigate('/hoa');
            break;
          case 'focal_person':
            navigate('/focal');
            break;
          default:
            navigate('/unauthorized');
        }
      }
    }
  }, [user, authLoading, navigate]);

  // ✅ Show loading while waiting for user (after auth check)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // ✅ Render dashboard for admin
  return (
    <AdminLayout>
      <DashboardHome />
    </AdminLayout>
  );
}