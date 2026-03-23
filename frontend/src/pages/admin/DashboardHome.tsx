// frontend/src/pages/admin/DashboardHome.tsx
import { useAdminStats } from '../../context/AdminStatsContext';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import { 
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function DashboardHome() {
  const { stats, recentActivity, loading: statsLoading, error } = useAdminStats();
  const { loading: authLoading } = useAuth();

  // ✅ ADD CONSOLE LOGS
  console.log('📊 DashboardHome - authLoading:', authLoading);
  console.log('📊 DashboardHome - statsLoading:', statsLoading);
  console.log('📊 DashboardHome - stats:', stats);
  console.log('📊 DashboardHome - error:', error);
  console.log('📊 DashboardHome - recentActivity:', recentActivity);

  // Show auth loader while session is being established
  if (authLoading) {
    console.log('⏳ Showing auth loader');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show dashboard loader only after auth is complete
  if (statsLoading) {
    console.log('⏳ Showing stats loader');
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start">
                  <div className="h-2 w-2 bg-gray-200 rounded-full mt-1.5 mr-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Error:', error);
    return (
      <div className="p-8 text-red-600 bg-red-50 rounded">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!stats) {
    console.log('⚠️ No stats data');
    return (
      <div className="p-8 text-gray-600 bg-gray-50 rounded">
        <strong>No data available</strong>
        <p className="mt-2">Stats data is not loaded.</p>
      </div>
    );
  }

  console.log('✅ Rendering dashboard content');
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AIMS Admin Dashboard</h1>
        <p className="text-gray-600">
          Last updated: {new Date().toLocaleString('en-BT')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Agencies"
          value={stats.agencies}
          icon={<BuildingOfficeIcon className="h-6 w-6" />}
          color="blue"
          onClick={() => window.location.href = '/admin/agencies'}
        />
        <StatCard
          title="Users"
          value={stats.users.total}
          icon={<UserGroupIcon className="h-6 w-6" />}
          color="gray"
          onClick={() => window.location.href = '/admin/users'}
        />
        <StatCard
          title="Active Declarations"
          value={stats.activeDeclarations}
          icon={<DocumentCheckIcon className="h-6 w-6" />}
          color="gray"
          onClick={() => window.location.href = '/admin/declarations'}
        />
        <StatCard
          title="Approved This Month"
          value={`${stats.approvedThisMonth.count} (${stats.approvedThisMonth.avgScore}/100)`}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="green"
          onClick={() => window.location.href = '/admin/reports'}
        />
        <StatCard
          title="Overdue Reviews"
          value={stats.overdueReviews}
          icon={<ExclamationCircleIcon className="h-6 w-6" />}
          color={stats.overdueReviews > 0 ? 'red' : 'gray'}
          onClick={() => window.location.href = '/admin/declarations?status=overdue'}
        />
        <StatCard
          title="Logs (24h)"
          value={stats.recentAuditLogs}
          icon={<ShieldCheckIcon className="h-6 w-6" />}
          color="gray"
          onClick={() => window.location.href = '/admin/logs'}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-gray-500">No recent activity</p>
          ) : (
            recentActivity.map((item) => (
              <div key={item.id} className="flex items-start text-sm">
                <div className="flex-shrink-0 mt-0.5 h-2 w-2 rounded-full bg-blue-500"></div>
                <p className="ml-3">
                  <span className="font-medium">{item.actor}</span> {item.action} 
                  {item.target && ` (${item.target})`} • {item.time}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}