//frontend/src/pages/director/DirectorDashboard.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BuildingOfficeIcon, ShieldCheckIcon, ExclamationTriangleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import ScoreDistribution from '../../components/commission/ScoreDistribution';
import SectorPerformance from '../../components/commission/SectorPerformance';
import TopBottomAgencies from '../../components/commission/TopBottomAgencies';
import KpiSummary from '../../components/commission/KpiSummary';
import RecentActivity from '../../components/commission/RecentActivity';
import WorkflowStatus from '../../components/commission/WorkflowStatus';
// ✅ Add imports for password change
import ChangePasswordModal from '../../components/ChangePasswordModal';

interface DashboardData {
  summary: {
    totalAgencies: number;
    highIntegrity: number;
    mediumIntegrity: number;
    lowIntegrity: number;
    avgNationalScore: number;
    pendingSubmissions: number;
  };
  scoreDistribution: Array<{
    integrityLevel: string;
    count: number;
  }>;
  sectorPerformance: Array<{
    sector: string;
    agencyCount: number;
    avgScore: number;
    minScore: number;
    maxScore: number;
  }>;
  topAgencies: Array<{
    agencyName: string;
    sector: string;
    score: number;
  }>;
  bottomAgencies: Array<{
    agencyName: string;
    sector: string;
    score: number;
  }>;
  kpis: {
    iccsImplementationRate: number;
    trainingCompletionRate: number;
    adComplianceRate: number;
    atrTimelinessRate: number;
  };
  recentActivity: Array<{
    action: string;
    actor: string;
    agency: string;
    timestamp: string;
  }>;
  workflowStatus: Array<{
    status: string;
    count: number;
    rawStatus: string;
  }>;
}

export default function DirectorDashboard() {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ✅ Add state for password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/director/dashboard', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading Director Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>No dashboard data available</p>
      </div>
    );
  }

  const { summary, kpis, scoreDistribution, sectorPerformance, topAgencies, bottomAgencies, recentActivity, workflowStatus } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Director Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome, <strong>{user?.name || 'Director'}</strong>! Overview of national AIMS compliance.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            {/* ✅ Add Password Change button */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Change Password
            </button>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
              Logout
            </button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Agencies</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalAgencies}</p>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-lg shadow p-6 ${getScoreBgColor(90)}`}>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">High Integrity</p>
                <p className={`text-2xl font-bold ${getScoreColor(90)}`}>{summary.highIntegrity}</p>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-lg shadow p-6 ${getScoreBgColor(70)}`}>
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <BuildingOfficeIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Medium Integrity</p>
                <p className={`text-2xl font-bold ${getScoreColor(70)}`}>{summary.mediumIntegrity}</p>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-lg shadow p-6 ${getScoreBgColor(40)}`}>
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Integrity</p>
                <p className={`text-2xl font-bold ${getScoreColor(40)}`}>{summary.lowIntegrity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8">
          {/* KPI Summary */}
          <KpiSummary kpis={kpis} />

          {/* Score Distribution */}
          <ScoreDistribution data={scoreDistribution} />

          {/* Sector Performance */}
          <SectorPerformance data={sectorPerformance} />

          {/* Top & Bottom Agencies */}
          <TopBottomAgencies topAgencies={topAgencies} bottomAgencies={bottomAgencies} />

          {/* Workflow Status */}
          <WorkflowStatus workflowData={workflowStatus} />

          {/* Recent Activity */}
          <RecentActivity activities={recentActivity} />
        </div>

        <footer className="mt-12 pt-4 border-t border-gray-200 text-xs text-gray-500">
          Director Dashboard - AIMS National Compliance Monitoring • Last updated: {new Date().toLocaleString()}
        </footer>
        
        {/* ✅ Add ChangePasswordModal */}
        <ChangePasswordModal 
          isOpen={showPasswordModal} 
          onClose={() => setShowPasswordModal(false)} 
        />
      </div>
    </div>
  );
}