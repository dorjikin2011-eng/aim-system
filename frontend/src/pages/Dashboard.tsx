import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // System admins go to /admin, others stay here
      if (user.role === 'system_admin') {
        navigate('/admin', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  if (loading || !user || user.role === 'system_admin') {
    return <div className="p-6">Redirecting...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">AIMS Dashboard</h1>
      <p className="mt-2">Welcome, <strong>{user.name}</strong>!</p>
      <p>Role: {user.role}</p>
      <p>Agency: {user.agency_id || 'N/A'}</p>
    </div>
  );
}