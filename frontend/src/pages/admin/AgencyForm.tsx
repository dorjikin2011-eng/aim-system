// frontend/src/pages/admin/AgencyForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE } from '../../config';

interface Agency {
  id?: string;
  name: string;
  sector: string;
  agency_type?: string;
  status?: string;
  hoa_name?: string;
  hoa_email?: string;
  hoa_phone?: string;
  focal_person_name?: string;
  focal_person_email?: string;
  focal_person_phone?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  hoa_user_id?: string;
}

export default function AgencyForm() {
  const [agency, setAgency] = useState<Agency>({
    name: '',
    sector: '',
    agency_type: '',
    status: 'active',
    hoa_name: '',
    hoa_email: '',
    hoa_phone: '',
    focal_person_name: '',
    focal_person_email: '',
    focal_person_phone: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    website: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      fetchAgency(id);
    }
  }, [id]);

  const fetchAgency = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/agencies/${id}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to load agency');
      }
      
      const data = await res.json();
      // Handle both { success: true, agency: {...} } and direct agency object
      const agencyData = data.agency || data;
      
      // Map backend snake_case to frontend state if necessary
      setAgency({
        name: agencyData.name || '',
        sector: agencyData.sector || '',
        agency_type: agencyData.agency_type || '',
        status: agencyData.status || 'active',
        hoa_name: agencyData.hoa_name || '',
        hoa_email: agencyData.hoa_email || '',
        hoa_phone: agencyData.hoa_phone || '',
        focal_person_name: agencyData.focal_person_name || '',
        focal_person_email: agencyData.focal_person_email || '',
        focal_person_phone: agencyData.focal_person_phone || '',
        contact_person: agencyData.contact_person || agencyData.contactPerson || '',
        contact_email: agencyData.contact_email || agencyData.contactEmail || '',
        contact_phone: agencyData.contact_phone || agencyData.contactPhone || '',
        address: agencyData.address || '',
        website: agencyData.website || '',
        hoa_user_id: agencyData.hoa_user_id || agencyData.hoaUserId || ''
      });
    } catch (err) {
      setError('Failed to load agency');
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ✅ FIXED: Use backticks for template literal
      const url = id ? `${API_BASE}/api/admin/agencies/${id}` : `${API_BASE}/api/admin/agencies`;
      const method = id ? 'PUT' : 'POST';

      // Get auth token
      const token = localStorage.getItem('token');

      // Prepare payload matching backend expectations
      const payload = {
        name: agency.name,
        sector: agency.sector,
        agency_type: agency.agency_type,
        status: agency.status,
        address: agency.address,
        website: agency.website,
        // HoA fields
        hoa_name: agency.hoa_name,
        hoa_email: agency.hoa_email,
        hoa_phone: agency.hoa_phone,
        // Focal person fields
        focal_person_name: agency.focal_person_name,
        focal_person_email: agency.focal_person_email,
        focal_person_phone: agency.focal_person_phone,
        // Contact fields - backend expects camelCase
        contactEmail: agency.contact_email,
        contactPhone: agency.contact_phone,
        contactPerson: agency.contact_person,
        hoaUserId: agency.hoa_user_id
      };

      console.log(`📤 ${method} request to:`, url);
      console.log('📦 Payload:', payload);

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Operation failed' }));
        throw new Error(err.error || err.message || 'Operation failed');
      }

      const result = await res.json();
      console.log('✅ Success:', result);
      
      navigate('/admin/agencies');
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Agency, value: string) => {
    setAgency({ ...agency, [field]: value });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/agencies')}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back to Agencies
        </button>
        <h1 className="text-2xl font-bold mt-2">
          {id ? 'Edit Agency' : 'Add New Agency'}
        </h1>
        <p className="text-gray-600 mt-1">
          Complete all required information for the agency
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agency Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.name}
                  onChange={e => handleChange('name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sector *
                </label>
                <select
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.sector}
                  onChange={e => handleChange('sector', e.target.value)}
                >
                  <option value="">Select Sector</option>
                  <option value="Justice & Governance">Justice & Governance</option>
                  <option value="Health">Health</option>
                  <option value="Education">Education</option>
                  <option value="Finance">Finance</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Energy">Energy</option>
                  <option value="Tourism">Tourism</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agency Type
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.agency_type || ''}
                  onChange={e => handleChange('agency_type', e.target.value)}
                >
                  <option value="">Select Type</option>
                  <option value="Ministry">Ministry</option>
                  <option value="Department">Department</option>
                  <option value="Constitutional Body">Constitutional Body</option>
                  <option value="Agency">Agency</option>
                  <option value="Commission">Commission</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.status || 'active'}
                  onChange={e => handleChange('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.address || ''}
                  onChange={e => handleChange('address', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Head of Agency Section */}
          <div className="mb-8 pt-6 border-t">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Head of Agency (HoA)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              The Agency Head who appoints the AIMS Focal Official and receives AIMS scores
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HoA Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.hoa_name || ''}
                  onChange={e => handleChange('hoa_name', e.target.value)}
                  placeholder="e.g., Commissioner General"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HoA Email
                </label>
                <input
                  type="email"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.hoa_email || ''}
                  onChange={e => handleChange('hoa_email', e.target.value)}
                  placeholder="hoa@agency.gov.bt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HoA Phone
                </label>
                <input
                  type="tel"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.hoa_phone || ''}
                  onChange={e => handleChange('hoa_phone', e.target.value)}
                  placeholder="+975-2-XXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Focal Person Section */}
          <div className="mb-8 pt-6 border-t">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              AIMS Focal Person
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              The official nominated by HoA to collect and submit AIMS data to ACC
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Focal Person Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.focal_person_name || ''}
                  onChange={e => handleChange('focal_person_name', e.target.value)}
                  placeholder="Full name of focal official"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Focal Person Email *
                </label>
                <input
                  type="email"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.focal_person_email || ''}
                  onChange={e => handleChange('focal_person_email', e.target.value)}
                  placeholder="focal@agency.gov.bt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Focal Person Phone
                </label>
                <input
                  type="tel"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.focal_person_phone || ''}
                  onChange={e => handleChange('focal_person_phone', e.target.value)}
                  placeholder="+975-2-XXXXXX"
                />
              </div>
            </div>
          </div>

          {/* General Contact Section */}
          <div className="mb-8 pt-6 border-t">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              General Contact Information
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Alternative contact details for the agency
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.contact_person || ''}
                  onChange={e => handleChange('contact_person', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.contact_email || ''}
                  onChange={e => handleChange('contact_email', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={agency.contact_phone || ''}
                  onChange={e => handleChange('contact_phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/agencies')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : id ? 'Update Agency' : 'Add Agency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}