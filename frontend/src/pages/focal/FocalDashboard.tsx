import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AgencyInfoPanel from '../../components/focal/AgencyInfoPanel';
import IndicatorStatusBadge from '../../components/focal/IndicatorStatusBadge';
import { useFocalData } from '../../hooks/useFocalData';
import { ArrowRightIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
// ✅ Add import for ChangePasswordModal
import ChangePasswordModal from '../../components/ChangePasswordModal';

// ✅ Define the interface and actually USE it
interface Indicator {
  id: string | null;
  assessment_id: string;
  indicator_number: number;
  score: number;
  evidence_file_paths: string;
  systems: string | null;
  proactive_measures: string | null;
  completed_training: number | null;
  total_employees: number | null;
  submitted_declarations: number | null;
  covered_officials: number | null;
  convictions: number | null;
  prosecutions: number | null;
  admin_actions: number | null;
  weighted_score: number | null;
  timely_atrs: number | null;
  total_atrs: number | null;
  created_at: string;
  updated_at: string;
}

export default function FocalDashboard() {
  const { user, logout } = useAuth(); // ✅ Added logout from context
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFocalData();
  const [submitting, setSubmitting] = useState(false);
  // ✅ Add state for password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleEditIndicator1 = () => {
    if (data?.assessmentId) {
      navigate(`/focal/indicators/1?assessmentId=${data.assessmentId}`);
    }
  };

  const handleSubmitToHoA = async () => {
    if (!data?.assessmentId) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('${API_BASE}/api/focal/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assessmentId: data.assessmentId })
      });
      
      if (response.ok) {
        alert('Submitted to Head of Agency successfully!');
        refetch();
      } else {
        const errorData = await response.json();
        alert('Submission failed: ' + errorData.error);
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
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

  // ✅ Properly type the indicators array
  const indicators = (data?.indicators || []) as Indicator[];
  const canSubmit = indicators.some(ind => ind.indicator_number === 1 && ind.id); // Indicator 1 must be filled

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Focal Official Dashboard</h1>
            <p className="text-gray-600">
              Welcome, <strong>{user?.name || 'Focal Official'}</strong>!
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

        {/* Agency Info */}
        <AgencyInfoPanel />

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
          <p className="text-blue-700">
            <strong>Instructions:</strong> As a Focal Official, you are responsible for completing 
            <strong> Indicator 1 (Internal Corruption Control Systems)</strong> and uploading supporting evidence 
            for all indicators. Submit to your Head of Agency when ready.
          </p>
        </div>

        {/* Indicators Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Indicator Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((num) => {
              const indicator = indicators.find(i => i.indicator_number === num);
              
              // ✅ Handle undefined safely and provide boolean values
              const hasEvidence = indicator?.evidence_file_paths 
                ? JSON.parse(indicator.evidence_file_paths).length > 0 
                : false;
              
              const isEditable = num === 1; // Only Indicator 1 is editable
              
              return (
                <div key={num} className="border rounded-lg p-4 text-center">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Indicator {num}</span>
                    {isEditable && (
                      <button
                        onClick={handleEditIndicator1}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <IndicatorStatusBadge 
                    indicatorNumber={num} 
                    isCompleted={!!indicator?.id}
                    hasEvidence={hasEvidence} // ✅ Now guaranteed boolean
                    isEditable={isEditable}
                  />
                  {!isEditable && (
                    <p className="text-xs text-gray-500 mt-2">
                      Evidence only
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleEditIndicator1}
            disabled={!data?.assessmentId}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Edit Indicator 1
          </button>
          <button
            onClick={handleSubmitToHoA}
            disabled={!canSubmit || submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {submitting ? 'Submitting...' : 'Submit to HoA'}
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </button>
        </div>

        <footer className="mt-12 pt-4 border-t border-gray-200 text-xs text-gray-500">
          All submissions require Head of Agency approval before being sent to ACC.
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
