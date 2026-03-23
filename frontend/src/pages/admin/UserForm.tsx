// frontend/src/pages/admin/UserForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

interface User {
  id?: string;
  email: string;
  name: string;
  role: string;
  agencyId: string | null;
  phone?: string;
  position?: string;
  status?: string;
}

interface Agency {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  agency_id: string;
  agency_name: string;
  assigned_at: string;
}

export default function UserForm() {
  const [user, setUser] = useState<User>({ 
    email: '', 
    name: '', 
    role: 'focal_person', 
    agencyId: null,
    phone: '',
    position: ''
  });
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAssignments, setFetchingAssignments] = useState(false);
  const [error, setError] = useState('');
  const [sendEmail, setSendEmail] = useState(true); // ✅ Default to true for new users
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    fetchAgencies();
    if (id) {
      fetchUser(id);
      if (user.role === 'prevention_officer') {
        fetchOfficerAssignments(id);
      }
    }
  }, [id]);

  useEffect(() => {
    if (id && user.role === 'prevention_officer') {
      fetchOfficerAssignments(id);
    } else {
      setAssignments([]);
    }
  }, [user.role, id]);

  const fetchAgencies = async () => {
    try {
      const res = await fetch('/api/admin/agencies');
      const data = await res.json();
      setAgencies(data.agencies || []);
    } catch (err) {
      setError('Failed to load agencies');
    }
  };

  const fetchUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (data.success && data.user) {
        const userData = data.user;
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          agencyId: userData.agency_id || null,
          phone: userData.phone || '',
          position: userData.position || '',
          status: userData.status || 'active'
        });
      } else {
        setError('User not found');
      }
    } catch (err) {
      setError('Failed to load user');
    }
  };

  const fetchOfficerAssignments = async (officerId: string) => {
    setFetchingAssignments(true);
    try {
      const res = await fetch(`/api/admin/assignments/officers/${officerId}`);
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    } finally {
      setFetchingAssignments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation: Don't allow creating agency_head via this form
    if (!id && user.role === 'agency_head') {
      setError('Agency Heads should be created through the Agency Creation Wizard. Please use the wizard instead.');
      setLoading(false);
      return;
    }

    try {
      const url = id ? `/api/admin/users/${id}` : '/api/admin/users';
      const method = id ? 'PUT' : 'POST';

      // ✅ Include sendEmail flag in payload
      const payload = {
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.role === 'system_admin' ? null : user.agencyId,
        phone: user.phone || '',
        position: user.position || '',
        sendEmail: !id ? sendEmail : undefined // Only for new users
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      navigate('/admin/users');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'system_admin', label: 'System Admin' },
    { value: 'prevention_officer', label: 'Prevention Officer' },
    { value: 'agency_head', label: 'Agency Head' },
    { value: 'focal_person', label: 'Focal Person' },
    { value: 'commissioner', label: 'Commissioner' },
    { value: 'director', label: 'Director' }
  ];

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'agency_head':
        return 'Head of Agency - Created through Agency Creation Wizard';
      case 'focal_person':
        return 'Agency Focal Person - Nominated by Agency Head, approved by System Admin';
      case 'prevention_officer':
        return 'ACC Prevention Officer - Assesses agency compliance';
      case 'system_admin':
        return 'System Administrator - Full system access';
      case 'commissioner':
        return 'ACC Commissioner - High-level oversight';
      case 'director':
        return 'ACC Director - Management role';
      default:
        return '';
    }
  };

  const handleRoleChange = (newRole: string) => {
    setUser({ ...user, role: newRole });
    
    // Clear agency if switching to system_admin
    if (newRole === 'system_admin') {
      setUser(prev => ({ ...prev, agencyId: null }));
    }
    
    setError('');
  };

  const handleNavigateToWizard = () => {
    if (confirm('Redirect to Agency Creation Wizard? This form will not be saved.')) {
      navigate('/admin/agencies/wizard');
    }
  };

  const handleNavigateToAssignments = () => {
    navigate('/admin/assignments');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back to Users
        </button>
        <h1 className="text-xl font-bold mt-2">
          {id ? 'Edit User' : 'Add New User'}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error:</p>
              <p>{error}</p>
              {error.includes('Agency Heads') && (
                <button
                  onClick={handleNavigateToWizard}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Go to Agency Creation Wizard
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={user.name}
              onChange={e => setUser({ ...user, name: e.target.value })}
              placeholder="Enter full name"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={user.email}
              onChange={e => setUser({ ...user, email: e.target.value })}
              placeholder="user@example.gov.bt"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={user.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={!!id && user.role === 'agency_head'}
            >
              {roleOptions.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            
            <div className="mt-1 text-sm text-gray-500">
              {getRoleDescription(user.role)}
            </div>

            {/* Role-specific guidance */}
            {user.role === 'agency_head' && !id && (
              <div className="mt-2 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-700 font-medium">
                      Agency Heads should be created through the Agency Creation Wizard
                    </p>
                    <p className="text-sm text-yellow-600 mt-1">
                      This ensures proper agency linkage and HoA account setup.
                      Use this form only for editing existing Agency Heads.
                    </p>
                    <button
                      type="button"
                      onClick={handleNavigateToWizard}
                      className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded hover:bg-yellow-200 border border-yellow-300"
                    >
                      Go to Agency Creation Wizard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {user.role === 'focal_person' && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Note:</span> Focal Persons are typically nominated by Agency Heads.
                      Use this form to create focal persons directly only when necessary.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {user.role === 'prevention_officer' && id && (
              <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-200">
                <div className="flex items-start">
                  <BuildingOfficeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-green-700 font-medium mb-1">
                      Assigned Agencies
                    </p>
                    {fetchingAssignments ? (
                      <p className="text-sm text-green-600">Loading assignments...</p>
                    ) : assignments.length === 0 ? (
                      <p className="text-sm text-green-600">No agencies assigned yet</p>
                    ) : (
                      <div className="space-y-1">
                        {assignments.map(assignment => (
                          <div key={assignment.id} className="text-sm text-green-700 flex justify-between items-center">
                            <span>{assignment.agency_name}</span>
                            <span className="text-xs text-green-500">
                              Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleNavigateToAssignments}
                      className="mt-2 px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 border border-green-300"
                    >
                      Manage Assignments
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone (Optional)
              </label>
              <input
                type="tel"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={user.phone || ''}
                onChange={e => setUser({ ...user, phone: e.target.value })}
                placeholder="+975-XXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position (Optional)
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={user.position || ''}
                onChange={e => setUser({ ...user, position: e.target.value })}
                placeholder="e.g., Director, Officer"
              />
            </div>
          </div>

          {user.role !== 'system_admin' && user.role !== 'agency_head' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agency *
              </label>
              <select
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={user.agencyId || ''}
                onChange={e => setUser({ ...user, agencyId: e.target.value || null })}
                disabled={user.role === 'agency_head'}
              >
                <option value="">Select Agency</option>
                {agencies.map(agency => (
                  <option key={agency.id} value={agency.id}>{agency.name}</option>
                ))}
              </select>
              
              {user.role === 'agency_head' && user.agencyId && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <p className="text-gray-700">
                    Agency: {agencies.find(a => a.id === user.agencyId)?.name || 'Loading...'}
                  </p>
                  <p className="text-gray-500 text-xs">
                    (Agency linkage is managed through the Agency Creation Wizard)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ✅ Email Notification Checkbox */}
          {!id && (
            <div className="mb-6 flex items-center">
              <input
                type="checkbox"
                id="sendEmail"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="sendEmail" className="ml-2 block text-sm text-gray-700">
                Send login credentials to user via email
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!id && user.role === 'agency_head')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : id ? 'Update User' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}