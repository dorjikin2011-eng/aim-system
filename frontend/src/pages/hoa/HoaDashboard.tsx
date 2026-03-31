import { useAuth } from '../../context/AuthContext';
import { useHoaData } from '../../hooks/useHoaData';
import SubmissionCard from '../../components/hoa/SubmissionCard';
import { BuildingOfficeIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
// ✅ Add imports for password change
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { useState } from 'react';

export default function HoaDashboard() {
  const { user, logout } = useAuth();
  const { submissions, loading, error, refetch } = useHoaData();
  // ✅ Add state for password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleApprove = async (assessmentId: string) => {
    try {
      const response = await fetch('${API_BASE}/api/hoa/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assessmentId })
      });
      
      if (response.ok) {
        alert('Submission approved and sent to ACC successfully!');
        refetch();
      } else {
        const errorData = await response.json();
        alert('Approval failed: ' + errorData.error);
      }
    } catch (err) {
      console.error('Approve error:', err);
      alert('Network error. Please try again.');
    }
  };

  const handleReturn = async (assessmentId: string, remarks: string) => {
    try {
      const response = await fetch('${API_BASE}/api/hoa/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assessmentId, remarks })
      });
      
      if (response.ok) {
        alert('Submission returned to focal person successfully!');
        refetch();
      } else {
        const errorData = await response.json();
        alert('Return failed: ' + errorData.error);
      }
    } catch (err) {
      console.error('Return error:', err);
      alert('Network error. Please try again.');
    }
  };

  const handleValidate = async (assessmentId: string) => {
    try {
      const response = await fetch('${API_BASE}/api/hoa/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assessmentId })
      });
      
      if (response.ok) {
        alert('Final score validated and locked successfully!');
        refetch();
      } else {
        const errorData = await response.json();
        alert('Validation failed: ' + errorData.error);
      }
    } catch (err) {
      console.error('Validate error:', err);
      alert('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading dashboard...</p>
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

  const pendingSubmissions = submissions.filter(s => s.status === 'SUBMITTED_TO_HOA');
  const awaitingValidation = submissions.filter(s => s.status === 'AWAITING_VALIDATION');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Head of Agency Dashboard</h1>
            <p className="text-gray-600">
              Welcome, <strong>{user?.name || 'Head of Agency'}</strong>!
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

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
          <p className="text-blue-700">
            <strong>Instructions:</strong> Review submissions from your Focal Official. 
            You can <strong>approve</strong> to send to ACC, <strong>return</strong> for corrections, 
            or <strong>validate</strong> the final score after ACC completes scoring.
          </p>
        </div>

        {/* Pending Submissions */}
        {pendingSubmissions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Submissions Awaiting Review ({pendingSubmissions.length})
            </h2>
            {pendingSubmissions.map((submission) => (
              <SubmissionCard
                key={submission.assessment_id}
                assessmentId={submission.assessment_id}
                status={submission.status}
                focalName={submission.focal_name}
                focalEmail={submission.focal_email}
                updatedAt={submission.updated_at}
                indicators={submission.indicators}
                onApprove={handleApprove}
                onReturn={handleReturn}
                onValidate={handleValidate}
              />
            ))}
          </div>
        )}

        {/* Awaiting Validation */}
        {awaitingValidation.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Ready for Final Validation ({awaitingValidation.length})
            </h2>
            {awaitingValidation.map((submission) => (
              <SubmissionCard
                key={submission.assessment_id}
                assessmentId={submission.assessment_id}
                status={submission.status}
                focalName={submission.focal_name}
                focalEmail={submission.focal_email}
                updatedAt={submission.updated_at}
                indicators={submission.indicators}
                onApprove={handleApprove}
                onReturn={handleReturn}
                onValidate={handleValidate}
              />
            ))}
          </div>
        )}

        {/* No Submissions */}
        {submissions.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
            <p className="text-gray-600">
              Your Focal Official hasn't submitted any assessments for review.
            </p>
          </div>
        )}

        <footer className="mt-12 pt-4 border-t border-gray-200 text-xs text-gray-500">
          All actions are logged for audit purposes.
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
