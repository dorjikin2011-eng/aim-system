// frontend/src/pages/admin/DashboardHome.tsx
import { useState, useEffect } from 'react';
import { useAdminStats } from '../../context/AdminStatsContext';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import StatCard from '../../components/StatCard';
import { 
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
  EyeIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface AgencyAssignment {
  agency_id: string;
  agency_name: string;
  sector: string;
  officer_id: string;
  officer_name: string;
  officer_email: string;
  assessment_status: string;
  overall_score: number;
  progress: number;
  last_updated: string;
  fiscal_year: string;
}

interface Officer {
  id: string;
  name: string;
  email: string;
  assignment_count: number;
}

export default function DashboardHome() {
  const { stats, recentActivity, loading: statsLoading, error } = useAdminStats();
  const { loading: authLoading } = useAuth();
  
  // Additional state for assigned agencies
  const [assignedAgencies, setAssignedAgencies] = useState<AgencyAssignment[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingOverallReport, setGeneratingOverallReport] = useState(false);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  // Fetch assigned agencies data
  const fetchAssignedAgencies = async () => {
    setLoadingAssigned(true);
    try {
      const url = selectedOfficer && selectedOfficer !== 'all'
        ? `${API_BASE}/api/admin/assigned-agencies?officerId=${selectedOfficer}`
        : `${API_BASE}/api/admin/assigned-agencies`;
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch assigned agencies');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setAssignedAgencies(result.data.assignedAgencies || []);
        setOfficers(result.data.officers || []);
        setDashboardStats(result.data.stats || null);
      }
    } catch (err) {
      console.error('Error fetching assigned agencies:', err);
    } finally {
      setLoadingAssigned(false);
    }
  };

  useEffect(() => {
    fetchAssignedAgencies();
  }, [selectedOfficer]);

  // Handle agency report generation
  const handleAgencyReport = async () => {
    if (!selectedAgency) {
      alert('Please select an agency');
      return;
    }
    
    setGeneratingReport(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/assessments/report/${selectedAgency}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
          reportWindow.document.write(generateReportHTML(result.data));
          reportWindow.document.close();
        } else {
          alert('Popup blocked. Please allow popups for this site.');
        }
      } else {
        alert('Failed to generate report: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Handle overall report generation
  const handleOverallReport = async () => {
    setGeneratingOverallReport(true);
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;
    
    try {
      const response = await fetch(`${API_BASE}/api/reports/overall?fy=${fiscalYear}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to generate overall report');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
          reportWindow.document.write(generateOverallReportHTML(result.data));
          reportWindow.document.close();
        } else {
          alert('Popup blocked. Please allow popups for this site.');
        }
      } else {
        alert('Failed to generate overall report: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating overall report:', error);
      alert('Failed to generate overall report. Please try again.');
    } finally {
      setGeneratingOverallReport(false);
    }
  };

  // Helper function to generate agency report HTML
  const generateReportHTML = (data: any) => {
    const getScoreColor = (score: number, max: number) => {
      const percentage = (score / max) * 100;
      if (percentage >= 80) return '#16a34a';
      if (percentage >= 50) return '#ca8a04';
      return '#dc2626';
    };
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AIMS Assessment Report - ${data.agency.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f3f4f6; padding: 30px; }
          .report-container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .report-header { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 30px 40px; }
          .report-header h1 { font-size: 32px; margin-bottom: 10px; }
          .agency-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 40px; margin-top: 15px; }
          .report-content { padding: 40px; }
          .score-hero { background: #f8fafc; border-radius: 16px; padding: 30px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .score-value { font-size: 64px; font-weight: 700; }
          .section-title { font-size: 20px; font-weight: 600; margin: 30px 0 20px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f1f5f9; padding: 12px; text-align: left; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .footer { margin-top: 40px; padding: 20px; text-align: center; color: #94a3b8; }
          .print-button { position: fixed; bottom: 30px; right: 30px; background: #2563eb; color: white; padding: 12px 24px; border-radius: 50px; cursor: pointer; border: none; font-size: 14px; }
          .print-button:hover { background: #1d4ed8; }
          @media print { .print-button { display: none; } }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="report-header">
            <h1>AIMS Assessment Report</h1>
            <div class="agency-badge">${data.agency.name} • ${data.agency.sector}</div>
          </div>
          <div class="report-content">
            <div class="score-hero">
              <div>
                <div style="font-size: 14px; color: #64748b;">Overall AIMS Score</div>
                <div class="score-value">${data.summary.percentage}%</div>
                <div>${data.summary.total_score}/${data.summary.total_max_score} points</div>
              </div>
              <div>
                <div style="font-size: 14px; color: #64748b;">Integrity Level</div>
                <div style="font-size: 24px; font-weight: 600;">${data.summary.integrity_level}</div>
              </div>
            </div>
            <h2 class="section-title">Indicator Performance</h2>
            <table>
              <thead><tr><th>Indicator</th><th>Category</th><th>Score</th><th>Max</th><th>%</th></tr></thead>
              <tbody>
                ${data.indicators.map((ind: any) => {
                  const percentage = ind.max_score ? ((ind.score / ind.max_score) * 100).toFixed(1) : '0';
                  let categoryDisplay = ind.category;
                  if (ind.category === 'integrity_promotion') categoryDisplay = 'Integrity Promotion';
                  else if (ind.category === 'corruption_accountability') categoryDisplay = 'Corruption Accountability';
                  return `
                    <tr>
                      <td><strong>${ind.indicator_name}</strong></td>
                      <td>${categoryDisplay}</td>
                      <td style="color: ${getScoreColor(ind.score, ind.max_score)}; font-weight: 600;">${ind.score}</td>
                      <td>${ind.max_score}</td>
                      <td>${percentage}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div class="footer">
              <p>Report generated on ${new Date().toLocaleString()}</p>
              <p>AIMS Assessment Framework v3.0 • Anti-Corruption Commission</p>
            </div>
          </div>
        </div>
        <button class="print-button" onclick="window.print()">🖨️ Print Report</button>
      </body>
      </html>
    `;
  };

  // Helper function for overall report
  const generateOverallReportHTML = (data: any) => {
    const agencies = data.assessments || data.agencies || [];
    const summary = data.summary || {};
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Overall AIMS Assessment Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f3f4f6; padding: 30px; }
          .report-container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .report-header { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 30px 40px; }
          .report-header h1 { font-size: 32px; margin-bottom: 10px; }
          .report-content { padding: 40px; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { background: #f8fafc; padding: 20px; text-align: center; border-radius: 12px; }
          .stat-value { font-size: 32px; font-weight: 700; color: #1e3a8a; }
          .section-title { font-size: 20px; font-weight: 600; margin: 30px 0 20px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f1f5f9; padding: 12px; text-align: left; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .footer { margin-top: 40px; padding: 20px; text-align: center; color: #94a3b8; }
          .print-button { position: fixed; bottom: 30px; right: 30px; background: #2563eb; color: white; padding: 12px 24px; border-radius: 50px; cursor: pointer; border: none; }
          @media print { .print-button { display: none; } }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="report-header">
            <h1>Overall AIMS Assessment Report</h1>
            <div>Anti-Corruption Commission • Prevention Division</div>
          </div>
          <div class="report-content">
            <div class="stats-grid">
              <div class="stat-card"><div class="stat-value">${summary.totalAgencies || agencies.length}</div><div>Total Agencies</div></div>
              <div class="stat-card"><div class="stat-value">${summary.finalizedCount || agencies.filter((a: any) => a.status === 'FINALIZED').length}</div><div>Finalized</div></div>
              <div class="stat-card"><div class="stat-value">${summary.averageScore ? summary.averageScore.toFixed(1) : '0'}%</div><div>Average Score</div></div>
            </div>
            <h2 class="section-title">Agency Performance Summary</h2>
            <table>
              <thead><tr><th>Agency</th><th>Sector</th><th>Status</th><th>Score</th><th>Integrity Level</th></tr></thead>
              <tbody>
                ${agencies.map((agency: any) => {
                  const score = agency.score || agency.overall_score || 0;
                  let level = 'Needs Improvement';
                  if (score >= 80) level = 'High Integrity';
                  else if (score >= 50) level = 'Medium Integrity';
                  return `<tr><td><strong>${agency.agency_name || agency.name}</strong></td><td>${agency.sector}</td><td>${agency.status}</td><td>${score.toFixed(1)}%</td><td>${level}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
            <div class="footer">
              <p>Report generated on ${new Date().toLocaleString()}</p>
              <p>AIMS Assessment Framework v3.0 • Anti-Corruption Commission</p>
            </div>
          </div>
        </div>
        <button class="print-button" onclick="window.print()">🖨️ Print Report</button>
      </body>
      </html>
    `;
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      FINALIZED: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-amber-100 text-amber-800',
      DRAFT: 'bg-gray-100 text-gray-800',
      NOT_STARTED: 'bg-gray-100 text-gray-800'
    };
    const labels: Record<string, string> = {
      FINALIZED: 'Finalized',
      COMPLETED: 'Completed',
      IN_PROGRESS: 'In Progress',
      DRAFT: 'Draft',
      NOT_STARTED: 'Not Started'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Show auth loader while session is being established
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

  // Show dashboard loader only after auth is complete
  if (statsLoading || loadingAssigned) {
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
    return (
      <div className="p-8 text-red-600 bg-red-50 rounded">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-gray-600 bg-gray-50 rounded">
        <strong>No data available</strong>
        <p className="mt-2">Stats data is not loaded.</p>
      </div>
    );
  }

  // Calculate additional stats for cards
  const assignedCount = dashboardStats?.assigned_agencies || 0;
  const finalizedCount = dashboardStats?.finalized_assessments || 0;
  const pendingCount = dashboardStats?.pending_assessments || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AIMS Admin Dashboard</h1>
        <p className="text-gray-600">
          Last updated: {new Date().toLocaleString('en-BT')}
        </p>
      </div>

      {/* Stats Grid - Enhanced */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
  <StatCard
    title="Total Agencies"
    value={stats.agencies}
    icon={<BuildingOfficeIcon className="h-6 w-6" />}
    color="blue"
    onClick={() => window.location.href = '/admin/agencies'}
  />
  <StatCard
    title="Assigned Agencies"
    value={assignedCount}
    icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
    color="green"
  />
  <StatCard
    title="Finalized"
    value={finalizedCount}
    icon={<CheckCircleIcon className="h-6 w-6" />}
    color="green"
  />
  <StatCard
    title="Pending"
    value={pendingCount}
    icon={<ClockIcon className="h-6 w-6" />}
    color="red"
  />
  <StatCard
    title="Active Officers"
    value={dashboardStats?.active_officers || 0}
    icon={<UserGroupIcon className="h-6 w-6" />}
    color="blue"
  />
  <StatCard
    title="Avg Workload"
    value={dashboardStats?.avg_workload || 0}
    icon={<DocumentCheckIcon className="h-6 w-6" />}
    color="gray"
  />
</div>

      {/* Report Generation Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Report Generation</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agency Report */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Agency Report</h3>
            <p className="text-sm text-gray-600 mb-3">
              Generate detailed assessment report for a specific agency
            </p>
            <div className="flex items-center space-x-2">
              <select
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                disabled={generatingReport}
              >
                <option value="">Select an agency...</option>
                {assignedAgencies.map(agency => (
                  <option key={agency.agency_id} value={agency.agency_id}>
                    {agency.agency_name} ({agency.officer_name})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAgencyReport}
                disabled={!selectedAgency || generatingReport}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center"
              >
                {generatingReport ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                )}
                Generate
              </button>
            </div>
          </div>
          
          {/* Overall Report */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Overall Report</h3>
            <p className="text-sm text-gray-600 mb-3">
              Generate summary report for all assigned agencies
            </p>
            <button
              onClick={handleOverallReport}
              disabled={generatingOverallReport}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center justify-center"
            >
              {generatingOverallReport ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Generate Overall Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Agencies Table Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center">
              <UserGroupIcon className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Assigned Agencies</h2>
            </div>
            
            {/* Filter by Officer */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <select
                value={selectedOfficer}
                onChange={(e) => setSelectedOfficer(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Officers</option>
                {officers.map(officer => (
                  <option key={officer.id} value={officer.id}>
                    {officer.name} ({officer.assignment_count} agencies)
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSelectedOfficer('all')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {assignedAgencies.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No assigned agencies found</p>
              <p className="text-sm text-gray-400 mt-1">
                {selectedOfficer !== 'all' ? 'Try changing the officer filter' : 'Contact administrator to assign agencies'}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sector</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prevention Officer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignedAgencies.map((agency) => (
                  <tr key={agency.agency_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{agency.agency_name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{agency.sector}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{agency.officer_name}</div>
                      <div className="text-xs text-gray-500">{agency.officer_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={agency.assessment_status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${agency.progress >= 70 ? 'bg-green-600' : agency.progress >= 30 ? 'bg-amber-600' : 'bg-red-600'}`}
                            style={{ width: `${agency.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{agency.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {agency.last_updated ? new Date(agency.last_updated).toLocaleDateString() : '--'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedAgency(agency.agency_id);
                          setTimeout(() => handleAgencyReport(), 100);
                        }}
                        className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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