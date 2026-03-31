//frontend/src/pages/admin/AgencyList.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AgencyCard from '../../components/AgencyCard';
import { API_BASE } from '../../config';
import { 
  BuildingOfficeIcon, 
  HomeIcon,
  UserPlusIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

interface Agency {
  id: string;
  name: string;
  sector: string;
  user_count: number;
  declaration_count: number;
  created_at: string;
  hoa_name?: string; // NEW: HoA info
  hoa_email?: string;
  hoa_phone?: string;
  hoa_position?: string;
}

export default function AgencyList() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const res = await fetch('${API_BASE}/api/admin/agencies');
      if (!res.ok) throw new Error('Failed to fetch agencies');
      const data = await res.json();
      setAgencies(data.agencies);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load agencies');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (agency: Agency) => {
    // For now, keep simple edit. Later we might create AgencyEditWizard
    navigate(`/admin/agencies/${agency.id}/edit`);
  };

  const handleViewHoA = (agency: Agency) => {
    // Show HoA details modal or navigate to details page
    alert(`Head of Agency: ${agency.hoa_name || 'Not assigned'}\nEmail: ${agency.hoa_email || 'N/A'}\nPhone: ${agency.hoa_phone || 'N/A'}`);
  };

  const handleDelete = async (agency: Agency) => {
    if (!confirm(`Delete agency "${agency.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/agencies/${agency.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete agency');
      }
      setAgencies(agencies.filter(a => a.id !== agency.id));
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleQuickAdd = () => {
    // Legacy simple form - keep for quick additions if needed
    navigate('/admin/agencies/new');
  };

  const handleAddWithHoA = () => {
    // NEW: Navigate to wizard
    navigate('/admin/agencies/wizard');
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Management</h1>
          <p className="text-gray-600 mt-1">Manage agencies, assign Heads of Agency, and monitor compliance</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
          >
            <HomeIcon className="h-4 w-4 mr-1" />
            Dashboard
          </button>
        </div>
      </div>

      {/* Agency Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Agencies</p>
              <p className="text-xl font-semibold">{agencies.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <UserPlusIcon className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Agencies with HoA</p>
              <p className="text-xl font-semibold">
                {agencies.filter(a => a.hoa_name).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-yellow-600 font-medium">U</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-xl font-semibold">
                {agencies.reduce((sum, a) => sum + (a.user_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-purple-600 font-medium">D</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Declarations</p>
              <p className="text-xl font-semibold">
                {agencies.reduce((sum, a) => sum + (a.declaration_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleAddWithHoA}
          className="flex items-center bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Add Agency with HoA (Wizard)
        </button>
        
        <button
          onClick={handleQuickAdd}
          className="flex items-center bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 transition-colors"
        >
          <BuildingOfficeIcon className="h-5 w-5 mr-2" />
          Quick Add (Simple Form)
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading agencies...</p>
        </div>
      ) : agencies.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agencies found</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first agency with its Head of Agency</p>
          <button 
            onClick={handleAddWithHoA}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add First Agency
          </button>
        </div>
      ) : (
        <>
          {/* Agencies Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">All Agencies ({agencies.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head of Agency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Declarations</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agencies.map(agency => (
                    <tr key={agency.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{agency.name}</div>
                          <div className="text-sm text-gray-500">ID: {agency.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {agency.sector}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {agency.hoa_name ? (
                          <div className="cursor-pointer hover:text-blue-600" onClick={() => handleViewHoA(agency)}>
                            <div className="font-medium">{agency.hoa_name}</div>
                            <div className="text-sm text-gray-500">{agency.hoa_position || 'Head of Agency'}</div>
                            <div className="text-xs text-gray-400">{agency.hoa_email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          agency.user_count > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {agency.user_count} user{agency.user_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          agency.declaration_count > 0 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {agency.declaration_count} declaration{agency.declaration_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(agency)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(agency)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Also keep card view as optional? Or remove? */}
          <div className="mt-6">
            <details className="bg-gray-50 p-4 rounded-lg">
              <summary className="cursor-pointer text-gray-700 font-medium">Card View (Legacy)</summary>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agencies.map(agency => (
                  <AgencyCard
                    key={agency.id}
                    agency={agency}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}