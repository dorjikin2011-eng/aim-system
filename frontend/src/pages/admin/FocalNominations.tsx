// frontend/src/pages/admin/FocalNominations.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingNominations } from '../../hooks/useFocalNominations';
import { 
  UserGroupIcon, 
  CheckIcon, 
  XMarkIcon, 
  HomeIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { API_BASE } from '../../config';

// ✅ REMOVED unused FocalNomination interface - it's likely defined in the hook

export default function FocalNominations() {
  const navigate = useNavigate();
  const { nominations, loading, error, refetch } = usePendingNominations();
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectComments, setRejectComments] = useState<Record<string, string>>({});

  const handleApprove = async (nominationId: string) => {
    if (!confirm('✅ Approve this focal person nomination?\n\nThis will create their user account and send login credentials.')) return;

    setProcessing(nominationId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/focal-nominations/${nominationId}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({ sendEmail: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Approval failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Approval failed`);
      }

      const data = await response.json();
      alert(data.message || '✅ Focal person approved and account created successfully!');
      refetch();
    } catch (err: any) {
      console.error('Approve error:', err);
      alert('❌ Error: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (nominationId: string) => {
    const comments = rejectComments[nominationId]?.trim();
    if (!comments) {
      alert('⚠️ Please provide rejection comments explaining why the nomination is being rejected.');
      return;
    }

    setProcessing(nominationId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/focal-nominations/${nominationId}/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({ comments }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Rejection failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Rejection failed`);
      }

      const data = await response.json();
      alert(data.message || '✅ Nomination rejected successfully!');
      refetch();
      setRejectComments(prev => ({ ...prev, [nominationId]: '' }));
    } catch (err: any) {
      console.error('Reject error:', err);
      alert('❌ Error: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <HomeIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading nominations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Focal Person Nominations</h1>
          <p className="text-gray-600 mt-1">Review and approve focal person nominations from Heads of Agency</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
          >
            <HomeIcon className="h-4 w-4 mr-1" />
            Admin Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
          <p className="font-medium">Error loading nominations:</p>
          <p>{error}</p>
          <button 
            onClick={() => refetch()} 
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      )}

      {nominations.length === 0 && !loading && !error ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Nominations</h3>
          <p className="text-gray-600">All focal person nominations have been processed.</p>
          <p className="text-sm text-gray-500 mt-2">New nominations will appear here when submitted by Agency Heads.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {nominations.map((nomination: any) => (
            <div key={nomination.id} className="bg-white rounded-lg shadow border p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{nomination.nominee_name}</h3>
                  <p className="text-gray-600">{nomination.nominee_email}</p>
                  {nomination.nominee_position && (
                    <p className="text-sm text-gray-500 mt-1">Position: {nomination.nominee_position}</p>
                  )}
                </div>
                <div className="mt-2 md:mt-0 text-sm text-gray-500">
                  <p className="flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    Nominated: {new Date(nomination.created_at).toLocaleDateString()}
                  </p>
                  <p>Agency: <span className="font-medium">{nomination.agency_name}</span></p>
                  <p>By: {nomination.hoa_name}</p>
                  <p className="text-xs">{nomination.hoa_email}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Comments (required for rejection)
                  </label>
                  <textarea
                    value={rejectComments[nomination.id] || ''}
                    onChange={e =>
                      setRejectComments(prev => ({ ...prev, [nomination.id]: e.target.value }))
                    }
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Please explain why this nomination is being rejected..."
                    disabled={processing === nomination.id}
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleReject(nomination.id)}
                    disabled={processing === nomination.id}
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 flex items-center transition-colors"
                  >
                    {processing === nomination.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Reject
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleApprove(nomination.id)}
                    disabled={processing === nomination.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center transition-colors"
                  >
                    {processing === nomination.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Approve
                      </>
                    )}
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