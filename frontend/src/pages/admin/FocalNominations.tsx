// frontend/src/pages/admin/FocalNominations.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingNominations } from '../../hooks/useFocalNominations';
import { UserGroupIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { API_BASE } from '../../config';

/*
interface FocalNomination {
  id: string;
  nominee_email: string;
  nominee_name: string;
  nominee_position: string;
  status: string;
  comments: string | null;
  created_at: string;
  updated_at: string;
  agency_name: string;
  hoa_name: string;
  hoa_email: string;
}
*/

export default function FocalNominations() {
  const navigate = useNavigate();
  const { nominations, loading, error, refetch } = usePendingNominations();
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectComments, setRejectComments] = useState<Record<string, string>>({});

  const handleApprove = async (nominationId: string) => {
    if (!confirm('Approve this focal person nomination? This will create their user account.')) return;

    setProcessing(nominationId);
    try {
      const response = await fetch(`${API_BASE}/api/admin/focal-nominations/${nominationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sendEmail: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Approval failed');
      }

      alert('Focal person approved and account created successfully!');
      refetch();
    } catch (err: any) {
      console.error('Approve error:', err);
      alert('Error: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (nominationId: string) => {
    const comments = rejectComments[nominationId]?.trim();
    if (!comments) {
      alert('Please provide rejection comments');
      return;
    }

    setProcessing(nominationId);
    try {
      const response = await fetch(`${API_BASE}/api/admin/focal-nominations/${nominationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rejection failed');
      }

      alert('Nomination rejected successfully!');
      refetch();
      setRejectComments(prev => ({ ...prev, [nominationId]: '' }));
    } catch (err: any) {
      console.error('Reject error:', err);
      alert('Error: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading nominations...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Focal Person Nominations</h1>
          <p className="text-gray-600 mt-1">Review and approve focal person nominations from HoAs</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
          >
            <UserGroupIcon className="h-4 w-4 mr-1" />
            Admin Dashboard
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {nominations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pending nominations. All focal persons have been approved!
        </div>
      ) : (
        <div className="space-y-4">
          {nominations.map(nomination => (
            <div key={nomination.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{nomination.nominee_name}</h3>
                  <p className="text-gray-600">{nomination.nominee_email}</p>
                  {nomination.nominee_position && (
                    <p className="text-sm text-gray-500">Position: {nomination.nominee_position}</p>
                  )}
                </div>
                <div className="mt-2 md:mt-0 text-sm text-gray-500">
                  <p>Nominated on: {new Date(nomination.created_at).toLocaleDateString()}</p>
                  <p>Agency: {nomination.agency_name}</p>
                  <p>By: {nomination.hoa_name} ({nomination.hoa_email})</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Comments (if rejecting)
                  </label>
                  <textarea
                    value={rejectComments[nomination.id] || ''}
                    onChange={e =>
                      setRejectComments(prev => ({ ...prev, [nomination.id]: e.target.value }))
                    }
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Required if rejecting..."
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleReject(nomination.id)}
                    disabled={processing === nomination.id}
                    className="px-3 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 flex items-center"
                  >
                    {processing === nomination.id ? 'Processing...' : 'Reject'}
                    <XMarkIcon className="h-4 w-4 ml-1 inline" />
                  </button>
                  <button
                    onClick={() => handleApprove(nomination.id)}
                    disabled={processing === nomination.id}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
                  >
                    {processing === nomination.id ? 'Processing...' : 'Approve'}
                    <CheckIcon className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}