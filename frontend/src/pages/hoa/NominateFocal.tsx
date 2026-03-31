import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { UserPlusIcon } from '@heroicons/react/24/outline';

export default function NominateFocal() {
  
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nomineeEmail: '',
    nomineeName: '',
    nomineePosition: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('${API_BASE}/api/hoa/nominate-focal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nomineeEmail: formData.nomineeEmail,
          nomineeName: formData.nomineeName,
          nomineePosition: formData.nomineePosition
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nomination failed');
      }
      
      setSuccess('Focal person nominated successfully! ACC will review and approve.');
      setFormData({ nomineeEmail: '', nomineeName: '', nomineePosition: '' });
    } catch (err) {
      console.error('Nominate error:', err);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/hoa')}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Nominate Focal Person</h1>
          <p className="text-gray-600 mt-1">
            Nominate a staff member to serve as your agency's focal person for AIMS compliance.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
              {success}
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
                value={formData.nomineeName}
                onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                placeholder="Enter full name"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Official Email *
              </label>
              <input
                type="email"
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={formData.nomineeEmail}
                onChange={(e) => setFormData({ ...formData, nomineeEmail: e.target.value })}
                placeholder="nominee@agency.gov.bt"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position/Department
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={formData.nomineePosition}
                onChange={(e) => setFormData({ ...formData, nomineePosition: e.target.value })}
                placeholder="e.g., Director, Compliance Officer"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/hoa')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {submitting ? 'Nominating...' : 'Nominate Focal Person'}
                <UserPlusIcon className="h-4 w-4 ml-2" />
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-800 mb-2">Nomination Process</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• You nominate a staff member as focal person</li>
              <li>• ACC reviews and approves the nomination</li>
              <li>• Approved focal person receives login credentials via email</li>
              <li>• Focal person can then access the AIMS dashboard</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
