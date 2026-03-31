import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EvidenceUpload from '../../pages/prevention/AgencyAssessment/common/EvidenceUpload';
import type { EvidenceFile } from '../../pages/prevention/AgencyAssessment/common/aimsTypes';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface IndicatorData {
  id: string | null;
  assessment_id: string;
  indicator_number: number;
  evidence_file_paths: string;
}

export default function EvidenceUploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { indicatorId } = useParams<{ indicatorId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [indicatorData, setIndicatorData] = useState<IndicatorData>({
    id: null,
    assessment_id: '',
    indicator_number: parseInt(indicatorId || '2'),
    evidence_file_paths: '[]'
  });
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);

  useEffect(() => {
    if (!indicatorId) {
      navigate('/focal');
      return;
    }

    fetchIndicatorData(parseInt(indicatorId));
  }, [indicatorId]);

  const fetchIndicatorData = async (indicatorNumber: number) => {
    try {
      setLoading(true);
      const response = await fetch('${API_BASE}/api/focal/indicators', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch indicators');
      }
      
      const data = await response.json();
      const indicators = data.indicators || [];
      const indicator = indicators.find((i: any) => i.indicator_number === indicatorNumber);
      
      if (indicator) {
        const evidencePaths = indicator.evidence_file_paths ? JSON.parse(indicator.evidence_file_paths) : [];
        const evidenceFiles: EvidenceFile[] = evidencePaths.map((path: string) => ({
          id: path,
          name: path.split('/').pop() || 'file',
          path: path
        }));
        
        setIndicatorData({
          id: indicator.id,
          assessment_id: indicator.assessment_id,
          indicator_number: indicator.indicator_number,
          evidence_file_paths: indicator.evidence_file_paths
        });
        setEvidenceFiles(evidenceFiles);
      } else {
        // Get assessment ID from first indicator or create new
        const firstIndicator = indicators.find((i: any) => i.indicator_number === 1);
        setIndicatorData(prev => ({ 
          ...prev, 
          assessment_id: firstIndicator?.assessment_id || '',
          indicator_number: indicatorNumber
        }));
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
    if (!indicatorData.assessment_id) return;
    
    setSaving(true);
    setError('');

    try {
      const evidenceFilePaths = evidenceFiles.map(file => file.path);

      const response = await fetch('${API_BASE}/api/focal/save-indicator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assessmentId: indicatorData.assessment_id,
          indicatorNumber: indicatorData.indicator_number,
          evidence_file_paths: JSON.stringify(evidenceFilePaths)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }

      alert(`Evidence for Indicator ${indicatorData.indicator_number} saved successfully!`);
      navigate('/focal');
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Upload Evidence - Indicator {indicatorData.indicator_number}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.name || 'Focal Official'} - Upload supporting documents for Indicator {indicatorData.indicator_number}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <EvidenceUpload 
            files={evidenceFiles}
            setFiles={setEvidenceFiles}
          />
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => navigate('/focal')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Evidence'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}