// frontend/src/pages/admin/AssignmentManager.tsx - UPDATED WITH FY SUPPORT
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  ClipboardIcon,
  PlusCircleIcon,
  TrashIcon,
  EyeIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface PreventionOfficer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  assignment_count: number;
}

interface Agency {
  id: string;
  name: string;
  sector: string;
  hoa_name?: string;
  hoa_email?: string;
}

interface Assignment {
  id: string;
  prevention_officer_id: string;
  agency_id: string;
  officer_name: string;
  officer_email: string;
  agency_name: string;
  agency_sector: string;
  assigned_by_name: string;
  assigned_at: string;
  notes?: string;
  status: string;
  fiscal_year?: string;  // ← ADDED
}

interface AssignmentStats {
  total_agencies: number;
  assigned_agencies: number;
  active_officers: number;
  total_officers: number;
}

export default function AssignmentManager() {
  const [activeTab, setActiveTab] = useState<'assign' | 'view' | 'stats'>('assign');
  const [officers, setOfficers] = useState<PreventionOfficer[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Fiscal Year State
  const [selectedFY, setSelectedFY] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  });
  
  const navigate = useNavigate();

  // Generate available fiscal years (past 2, current, next 2)
  const generateFiscalYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      years.push(`${startYear}-${endYear.toString().slice(-2)}`);
    }
    return years;
  };

  useEffect(() => {
    fetchData();
  }, [selectedFY]); // Re-fetch when FY changes

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      const [officersRes, agenciesRes, assignmentsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/assignments/available-officers`, { credentials: 'include', headers }),
        fetch(`${API_BASE}/api/admin/assignments/unassigned-agencies`, { credentials: 'include', headers }),
        fetch(`${API_BASE}/api/admin/assignments/by-fy/${selectedFY}`, { credentials: 'include', headers }), // ← UPDATED: FY-specific
        fetch(`${API_BASE}/api/admin/assignments/stats`, { credentials: 'include', headers })
      ]);

      if (!officersRes.ok || !agenciesRes.ok || !assignmentsRes.ok || !statsRes.ok) {
        const errorMsg = 'Failed to fetch assignment data';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const officersData = await officersRes.json();
      const agenciesData = await agenciesRes.json();
      const assignmentsData = await assignmentsRes.json();
      const statsData = await statsRes.json();

      if (officersData.success !== false) setOfficers(officersData.officers || officersData.data || []);
      if (agenciesData.success !== false) setAgencies(agenciesData.agencies || agenciesData.data || []);
      if (assignmentsData.success !== false) setAssignments(assignmentsData.assignments || assignmentsData.data || []);
      if (statsData.success !== false) setStats(statsData.stats || statsData.data || null);

    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOfficer || !selectedAgency) {
      setError('Please select both an officer and an agency');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/assignments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          prevention_officer_id: selectedOfficer,
          agency_id: selectedAgency,
          fiscal_year: selectedFY, // ← ADDED: Include fiscal year
          notes: assignmentNotes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to assign agency');
      }

      if (data.success || data.id) {
        setSuccessMessage(`✅ Agency assigned successfully for FY ${selectedFY}!`);
        setSelectedOfficer('');
        setSelectedAgency('');
        setAssignmentNotes('');
        await fetchData();
        setTimeout(() => setActiveTab('view'), 1500);
      } else {
        throw new Error(data.error || 'Assignment failed');
      }

    } catch (err: any) {
      console.error('Assignment error:', err);
      setError(err.message || 'Failed to assign agency');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('⚠️ Are you sure you want to remove this assignment?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/assignments/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to remove assignment');
      }

      if (data.success) {
        setSuccessMessage('✅ Assignment removed successfully');
        setAssignments(assignments.filter(a => a.id !== assignmentId));
        await fetchData();
        setTimeout(() => setSuccessMessage(''), 3000);
      }

    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to remove assignment');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getOfficerAssignments = (officerId: string) => {
    return assignments.filter(a => a.prevention_officer_id === officerId);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Assignment Manager</h1>
          <p className="text-gray-600 mt-1">Assign agencies to prevention officers for assessment</p>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="mt-4 sm:mt-0 text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back to Dashboard
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Agencies</p>
                <p className="text-xl font-semibold">{stats.total_agencies}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <ClipboardIcon className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Assigned Agencies</p>
                <p className="text-xl font-semibold">{stats.assigned_agencies}</p>
                <p className="text-xs text-gray-500">
                  {stats.total_agencies > 0 
                    ? `${Math.round((stats.assigned_agencies / stats.total_agencies) * 100)}% coverage`
                    : 'No agencies'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Active Officers</p>
                <p className="text-xl font-semibold">{stats.active_officers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Avg. Workload</p>
                <p className="text-xl font-semibold">
                  {stats.active_officers > 0 
                    ? (stats.assigned_agencies / stats.active_officers).toFixed(1)
                    : '0'
                  }
                </p>
                <p className="text-xs text-gray-500">agencies per officer</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fiscal Year Selector */}
      <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center space-x-4">
          <CalendarIcon className="h-5 w-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Fiscal Year:</label>
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {generateFiscalYears().map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-500">
          Showing assignments for FY {selectedFY}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-200">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md border border-green-200">
          <p className="font-medium">Success:</p>
          <p>{successMessage}</p>
        </div>
      )}

      <div className="mb-6 border-b">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('assign')}
            className={`py-2 px-4 font-medium text-sm ${activeTab === 'assign' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <PlusCircleIcon className="inline-block h-4 w-4 mr-1" />
            Assign Agency
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`py-2 px-4 font-medium text-sm ${activeTab === 'view' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <EyeIcon className="inline-block h-4 w-4 mr-1" />
            View Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-4 font-medium text-sm ${activeTab === 'stats' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ChartBarIcon className="inline-block h-4 w-4 mr-1" />
            Workload Stats
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'assign' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Assign Agency to Prevention Officer for FY {selectedFY}</h2>
            
            <form onSubmit={handleAssignAgency} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prevention Officer *
                  </label>
                  <select
                    required
                    value={selectedOfficer}
                    onChange={(e) => setSelectedOfficer(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an officer</option>
                    {officers.map(officer => (
                      <option key={officer.id} value={officer.id}>
                        {officer.name} ({officer.email}) - {officer.assignment_count} assignments
                      </option>
                    ))}
                  </select>
                  {selectedOfficer && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <p className="text-blue-700">
                        Selected: {officers.find(o => o.id === selectedOfficer)?.name}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agency to Assign *
                  </label>
                  <select
                    required
                    value={selectedAgency}
                    onChange={(e) => setSelectedAgency(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an agency</option>
                    {agencies.map(agency => (
                      <option key={agency.id} value={agency.id}>
                        {agency.name} ({agency.sector}) - HoA: {agency.hoa_name || 'Not assigned'}
                      </option>
                    ))}
                  </select>
                  {selectedAgency && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                      <p className="text-green-700">
                        Selected: {agencies.find(a => a.id === selectedAgency)?.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Notes (Optional)
                </label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any special instructions or notes..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !selectedOfficer || !selectedAgency}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <PlusCircleIcon className="h-5 w-5 mr-2" />
                      Assign Agency for FY {selectedFY}
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Available Officers</p>
                  <p className="text-xl font-semibold">{officers.length}</p>
                  <p className="text-xs text-gray-500 mt-1">For FY {selectedFY}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Unassigned Agencies</p>
                  <p className="text-xl font-semibold">{agencies.length}</p>
                  <p className="text-xs text-gray-500 mt-1">For FY {selectedFY}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'view' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Assignments for FY {selectedFY}</h2>
              <button
                onClick={fetchData}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Refresh
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No assignments found for FY {selectedFY}.</p>
                <p className="text-sm mt-2">Go to the Assign tab to create assignments.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Officer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiscal Year</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments.map(assignment => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{assignment.officer_name}</p>
                            <p className="text-sm text-gray-500">{assignment.officer_email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{assignment.agency_name}</p>
                            <p className="text-sm text-gray-500">{assignment.agency_sector}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {assignment.fiscal_year || selectedFY}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{assignment.assigned_by_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            assignment.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium flex items-center"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Workload Distribution for FY {selectedFY}</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Officer Workload</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-sm font-medium text-gray-600 pb-2">Officer</th>
                        <th className="text-left text-sm font-medium text-gray-600 pb-2">Assigned Agencies</th>
                        <th className="text-left text-sm font-medium text-gray-600 pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {officers.map(officer => {
                        const assignedCount = getOfficerAssignments(officer.id).length;
                        return (
                          <tr key={officer.id} className="border-b border-gray-200 last:border-0">
                            <td className="py-2">
                              <p className="font-medium">{officer.name}</p>
                              <p className="text-xs text-gray-500">{officer.email}</p>
                            </td>
                            <td className="py-2">
                              <div className="flex items-center">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  assignedCount === 0 
                                    ? 'bg-gray-100 text-gray-800'
                                    : assignedCount <= 3
                                    ? 'bg-green-100 text-green-800'
                                    : assignedCount <= 5
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {assignedCount} agencies
                                </span>
                              </div>
                            </td>
                            <td className="py-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                assignedCount === 0 
                                  ? 'bg-gray-100 text-gray-800'
                                  : assignedCount <= 3
                                  ? 'bg-green-100 text-green-800'
                                  : assignedCount <= 5
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {assignedCount === 0 ? 'Available' : 
                                 assignedCount <= 3 ? 'Good' : 
                                 assignedCount <= 5 ? 'Moderate' : 'Heavy'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Agency Assignment Status for FY {selectedFY}</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Assigned Agencies</span>
                      <span className="text-xl font-bold">{assignments.length}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: stats && stats.total_agencies > 0 
                            ? `${(assignments.length / stats.total_agencies) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <p className="text-sm text-blue-700 mt-2">
                      {stats && stats.total_agencies > 0 
                        ? `${Math.round((assignments.length / stats.total_agencies) * 100)}% of agencies assigned for FY ${selectedFY}`
                        : 'No agencies available'
                      }
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Unassigned Agencies</span>
                      <span className="text-xl font-bold">{agencies.length}</span>
                    </div>
                    <div className="space-y-2">
                      {agencies.slice(0, 5).map(agency => (
                        <div key={agency.id} className="flex justify-between items-center text-sm">
                          <span>{agency.name}</span>
                          <span className="text-gray-500">{agency.sector}</span>
                        </div>
                      ))}
                      {agencies.length > 5 && (
                        <p className="text-sm text-gray-500">... and {agencies.length - 5} more</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}