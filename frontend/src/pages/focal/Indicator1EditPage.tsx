import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EvidenceUpload from '../../pages/prevention/AgencyAssessment/common/EvidenceUpload';
import type { EvidenceFile } from '../../pages/prevention/AgencyAssessment/common/aimsTypes';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface Indicator1Data {
  id: string | null;
  assessment_id: string;
  systems: string | null;
  proactive_measures: string | null;
  evidence_file_paths: string;
}

export default function Indicator1EditPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [indicator1, setIndicator1] = useState<Indicator1Data>({
    id: null,
    assessment_id: '',
    systems: null,
    proactive_measures: null,
    evidence_file_paths: '[]'
  });
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);

  const urlParams = new URLSearchParams(location.search);
  const assessmentId = urlParams.get('assessmentId');

  useEffect(() => {
    if (!assessmentId) {
      navigate('/focal');
      return;
    }

    fetchIndicator1(assessmentId);
  }, [assessmentId]);

  const fetchIndicator1 = async (assessmentId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/focal/indicators', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch indicators');
      }
      
      const data = await response.json();
      const indicators = data.indicators || [];
      const ind1 = indicators.find((i: any) => i.indicator_number === 1);
      
      if (ind1) {
        const evidencePaths = ind1.evidence_file_paths ? JSON.parse(ind1.evidence_file_paths) : [];
        const evidenceFiles: EvidenceFile[] = evidencePaths.map((path: string) => ({
          id: path,
          name: path.split('/').pop() || 'file',
          path: path
        }));
        
        setIndicator1({
          id: ind1.id,
          assessment_id: ind1.assessment_id,
          systems: ind1.systems,
          proactive_measures: ind1.proactive_measures,
          evidence_file_paths: ind1.evidence_file_paths
        });
        setEvidenceFiles(evidenceFiles);
      } else {
        setIndicator1(prev => ({ ...prev, assessment_id: assessmentId }));
      }
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!assessmentId) return;
    
    setSaving(true);
    setError('');

    try {
      const systemsData = {
        complaint_mechanism_exists: document.getElementById('complaint_exists') as HTMLInputElement,
        complaint_mechanism_func: document.getElementById('complaint_func') as HTMLInputElement,
        conflict_interest_exists: document.getElementById('conflict_exists') as HTMLInputElement,
        conflict_interest_func: document.getElementById('conflict_func') as HTMLInputElement,
        gift_register_exists: document.getElementById('gift_exists') as HTMLInputElement,
        gift_register_func: document.getElementById('gift_func') as HTMLInputElement
      };

      const systems = {
        complaint_mechanism_exists: systemsData.complaint_mechanism_exists?.checked || false,
        complaint_mechanism_func: systemsData.complaint_mechanism_func?.checked || false,
        conflict_interest_exists: systemsData.conflict_interest_exists?.checked || false,
        conflict_interest_func: systemsData.conflict_interest_func?.checked || false,
        gift_register_exists: systemsData.gift_register_exists?.checked || false,
        gift_register_func: systemsData.gift_register_func?.checked || false
      };

      const proactiveMeasures = (document.getElementById('proactive_measures') as HTMLSelectElement)?.value || null;

      // Convert EvidenceFile[] back to string[] for API
      const evidenceFilePaths = evidenceFiles.map(file => file.path);

      const response = await fetch('/api/focal/save-indicator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assessmentId,
          indicatorNumber: 1,
          systems: JSON.stringify(systems),
          proactive_measures: proactiveMeasures,
          evidence_file_paths: JSON.stringify(evidenceFilePaths)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }

      alert('Indicator 1 saved successfully!');
      navigate('/focal');
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.name || 'Focal Official';
  const systems = indicator1.systems ? JSON.parse(indicator1.systems) : {};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading Indicator 1...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/focal')}
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Indicator 1</h1>
          <p className="text-gray-600 mt-1">
            Internal Corruption Control Systems (ICCS) - {displayName}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          {/* Systems Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Corruption Control Systems</h2>
            
            <div className="space-y-4">
              {/* Complaint Mechanism */}
              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900 mb-2">Complaint Mechanism</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      id="complaint_exists"
                      defaultChecked={systems.complaint_mechanism_exists}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Exists</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      id="complaint_func"
                      defaultChecked={systems.complaint_mechanism_func}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Functional</span>
                  </label>
                </div>
              </div>

              {/* Conflict of Interest */}
              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900 mb-2">Conflict of Interest Policy</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      id="conflict_exists"
                      defaultChecked={systems.conflict_interest_exists}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Exists</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      id="conflict_func"
                      defaultChecked={systems.conflict_interest_func}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Functional</span>
                  </label>
                </div>
              </div>

              {/* Gift Register */}
              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900 mb-2">Gift Register</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      id="gift_exists"
                      defaultChecked={systems.gift_register_exists}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Exists</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      id="gift_func"
                      defaultChecked={systems.gift_register_func}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Functional</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Proactive Measures */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Proactive Integrity Measures</h2>
            <select
              id="proactive_measures"
              defaultValue={indicator1.proactive_measures || ''}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Level</option>
              <option value="LEVEL1">Level 1 - Basic measures</option>
              <option value="LEVEL2">Level 2 - Comprehensive measures</option>
              <option value="LEVEL3">Level 3 - Advanced measures</option>
            </select>
          </div>

          {/* Evidence Upload */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Supporting Evidence</h2>
            <EvidenceUpload 
              files={evidenceFiles}
              setFiles={setEvidenceFiles}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => navigate('/focal')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {saving ? 'Saving...' : 'Save Indicator 1'}
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}