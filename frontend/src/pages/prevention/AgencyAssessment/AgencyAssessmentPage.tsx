// frontend/src/pages/prevention/AgencyAssessment/AgencyAssessmentPage.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AssessmentHeader from './components/AssessmentHeader';
import DynamicForm, { type DynamicFormRef } from '../../../components/forms/DynamicForm';
import { configService } from '../../../services/configService';
import { 
  DocumentTextIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PrinterIcon,
  EyeIcon,
  CloudArrowUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import type { FormTemplate } from '../../../types/config';

interface Agency {
  id: string;
  name: string;
  sector: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type AssessmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FINALIZED' | 'DRAFT';

interface AssessmentProgress {
  agency_id: string;
  indicator_scores: Record<string, number>;
  response_data?: Record<string, any>;
  overall_score?: number;
  status: AssessmentStatus;
  last_updated?: string;
  finalized_at?: string;
  finalized_by?: string;
  finalization_notes?: string;
  unlocked_at?: string;
  unlocked_by?: string;
  unlock_reason?: string;
  fiscal_year?: string;
  officer_remarks?: string;
}

export default function AgencyAssessmentPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const navigate = useNavigate();
  const formRef = useRef<DynamicFormRef>(null);
  
  const [agency, setAgency] = useState<Agency | null>(null);
  const [assessment, setAssessment] = useState<AssessmentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [error, setError] = useState<string>('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'preview' | 'summary'>('form');

  // Auto-save timer - Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute isAssessmentFinalized AFTER all state declarations
  const getOverallStatus = (): AssessmentStatus => {
    if (assessment?.status) {
      return assessment.status;
    }
    return 'NOT_STARTED';
  };

  const overallStatus = getOverallStatus();
  const isAssessmentFinalized = assessment?.status === 'FINALIZED' && !assessment?.unlocked_at;
  

  // Load configuration data (templates)
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setConfigLoading(true);
        const templatesRes = await configService.getFormTemplates();
        if (templatesRes.success && templatesRes.data) {
          setTemplates(templatesRes.data);
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
      } finally {
        setConfigLoading(false);
      }
    };
    
    loadConfiguration();
  }, []);

  // Fetch agency data from backend
  useEffect(() => {
    const fetchAgencyData = async () => {
      if (!agencyId) {
        setError('No agency ID provided');
        setLoading(false);
        navigate('/prevention/dashboard');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const agencyResponse = await fetch(`/api/agencies/${agencyId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!agencyResponse.ok) {
          if (agencyResponse.status === 404) {
            throw new Error('Agency not found');
          } else if (agencyResponse.status === 401) {
            navigate('/login');
            return;
          } else {
            throw new Error(`Failed to fetch agency: ${agencyResponse.statusText}`);
          }
        }

        const agencyData = await agencyResponse.json();
        setAgency(agencyData.agency || agencyData);

        try {
          const assessmentResponse = await fetch(`/api/assessments/progress/${agencyId}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (assessmentResponse.ok) {
            const assessmentData = await assessmentResponse.json();
            const assessmentProgress = assessmentData.assessment || assessmentData;
            setAssessment(assessmentProgress);
            
            if (assessmentProgress.last_updated) {
              setLastSaved(new Date(assessmentProgress.last_updated));
            }
          }
        } catch (assessmentErr) {
          console.log('No assessment progress found');
        }

      } catch (err: any) {
        console.error('Error loading agency data:', err);
        setError(err.message || 'Failed to load agency data');
      } finally {
        setLoading(false);
      }
    };

    fetchAgencyData();
  }, [agencyId, navigate]);

  // Save assessment to backend
  const saveAssessmentToBackend = async (formData: any) => {
    console.log('📝 SAVE ATTEMPT - Form data:', formData);
    setIsSaving(true);
    try {
      if (!agencyId) return null;

      if (assessment?.status === 'FINALIZED' && !assessment?.unlocked_at) {
        alert('Assessment is finalized and locked. Unlock it first to make changes.');
        return null;
      }

      const payload = {
        agency_id: agencyId,
        indicatorId: 'aims-assessment',
        responseData: formData,
        last_updated: new Date().toISOString()
      };
      
      console.log('📝 SAVE PAYLOAD:', payload);

      const response = await fetch('/api/assessments/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📝 SAVE RESPONSE STATUS:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📝 SAVE RESULT:', result);
        
        if (result.assessment) {
          setAssessment(prev => ({
            ...prev,
            ...result.assessment,
            last_updated: new Date().toISOString()
          }));
        }

        setLastSaved(new Date());
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 3000);
        
        return result;
      } else {
        const errorData = await response.json();
        console.error('📝 SAVE FAILED:', errorData);
        throw new Error(errorData.error || 'Failed to save to backend');
      }
    } catch (err) {
      console.error('📝 SAVE ERROR:', err);
      alert('Failed to save assessment. Please try again.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save function
  const triggerAutoSave = useCallback(async () => {
    if (formRef.current && !isAssessmentFinalized) {
      const formData = formRef.current.getFormData();
      if (Object.keys(formData).length > 0) {
        console.log('🔄 Auto-saving...');
        await saveAssessmentToBackend(formData);
      }
    }
  }, [isAssessmentFinalized]);

  // Set up auto-save timer
  useEffect(() => {
    if (!isAssessmentFinalized) {
      autoSaveTimerRef.current = setInterval(() => {
        triggerAutoSave();
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [isAssessmentFinalized, triggerAutoSave]);

  // Finalize assessment
  const handleFinalizeAssessment = async () => {
    if (!agencyId || !agency) return;

    if (formRef.current) {
      const isValid = formRef.current.validateForm();
      if (!isValid) {
        setValidationErrors(['Please complete all required fields before finalizing.']);
        return;
      }
    }

    if (!confirm('Are you sure you want to finalize this assessment? Once finalized, scores will be locked and cannot be edited without unlocking.')) {
      return;
    }

    setIsFinalizing(true);
    setValidationErrors([]);
    
    try {
      if (formRef.current) {
        const currentFormData = formRef.current.getFormData();
        console.log('📝 Current form data before finalize:', currentFormData);
        await saveAssessmentToBackend(currentFormData);
      }
      
      const response = await fetch(`/api/assessments/finalize/${agencyId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalized_by: 'prevention_officer',
          finalization_notes: 'Assessment finalized by prevention officer'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Finalization result:', result);
        
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 3000);
        
        const assessmentResponse = await fetch(`/api/assessments/progress/${agencyId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (assessmentResponse.ok) {
          const assessmentData = await assessmentResponse.json();
          setAssessment(assessmentData.assessment || assessmentData);
        }

        alert('✅ Assessment finalized successfully! Scores are now locked.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize assessment');
      }
    } catch (err: any) {
      console.error('Error finalizing assessment:', err);
      alert(err.message || 'Failed to finalize assessment');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Unlock assessment
  const handleUnlockAssessment = async () => {
    if (!agencyId) return;

    const reason = prompt('Please enter reason for unlocking assessment:');
    if (!reason) return;

    setIsUnlocking(true);

    try {
      const unlockUrl = `/api/assessments/unlock/${agencyId}`;
      console.log('🔵 Frontend unlock URL:', unlockUrl);

      const response = await fetch(unlockUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unlocked_by: 'prevention_officer',
          reason: reason
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔵 Frontend received unlock response:', result);
        alert('✅ Assessment unlocked successfully! You can now edit scores.');

        const assessmentResponse = await fetch(`/api/assessments/progress/${agencyId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (assessmentResponse.ok) {
          const assessmentData = await assessmentResponse.json();
          setAssessment(assessmentData.assessment || assessmentData);
        }

      } else {
        const errorData = await response.json();
        console.error('🔵 Frontend unlock failed:', errorData);
        alert('Failed to unlock assessment: ' + (errorData.error || 'Unknown error'));
      }

    } catch (err) {
      console.error('🔵 Frontend unlock error:', err);
      alert('Failed to unlock assessment due to network or server error');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Generate report - FIXED with better error handling
const handleGenerateReport = async (type: 'agency' | 'summary') => {
  if (type === 'agency') {
    // Add safety check for agencyId
    if (!agencyId) {
      alert('Agency ID is missing. Cannot generate report.');
      return;
    }

    try {
      setIsGeneratingReport(true);
      console.log('📊 Generating report for agency:', agencyId);
      
      // Save form data if not finalized
      if (formRef.current && !isAssessmentFinalized) {
        const formData = formRef.current.getFormData();
        await saveAssessmentToBackend(formData);
      }
      
      // Make the API call
      const response = await fetch(`/api/assessments/report/${agencyId}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      // Check for authentication issues
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Report data received:', result);
      
      if (result.success && result.data) {
        // Check if we have data to display
        if (!result.data.agency || !result.data.indicators) {
          console.warn('⚠️ Report data is incomplete:', result.data);
          if (!confirm('Report data is incomplete. Continue anyway?')) {
            return;
          }
        }
        
        // Open report in new window
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
          reportWindow.document.write(generateReportHTML(result.data));
          reportWindow.document.close();
          reportWindow.focus(); // Bring the new window to front
        } else {
          alert('Popup blocked. Please allow popups for this site to view reports.');
        }
      } else {
        alert('Failed to generate report: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('❌ Error generating report:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  } else {
    alert('Summary report generation will be available soon.');
  }
};

  // Helper function to generate HTML report
  const generateReportHTML = (data: any) => {
    const getIntegrityColor = (level: string) => {
      if (level.includes('High')) return '#16a34a';
      if (level.includes('Medium')) return '#ca8a04';
      return '#dc2626';
    };

    const getScoreColor = (score: number, max: number) => {
      const percentage = (score / max) * 100;
      if (percentage >= 80) return '#16a34a';
      if (percentage >= 50) return '#ca8a04';
      return '#dc2626';
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AIMS Assessment Report - ${data.agency.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Roboto, system-ui, sans-serif; 
            background: #f3f4f6;
            padding: 30px;
          }
          .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .report-header {
            background: linear-gradient(135deg, #1e3a8a, #2563eb);
            color: white;
            padding: 30px 40px;
          }
          .report-header h1 {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 10px;
          }
          .report-header .subtitle {
            font-size: 16px;
            opacity: 0.9;
          }
          .agency-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 40px;
            font-size: 14px;
            margin-top: 15px;
          }
          .report-content {
            padding: 40px;
          }
          .score-hero {
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #e2e8f0;
          }
          .score-main {
            text-align: center;
          }
          .score-label {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 5px;
          }
          .score-value {
            font-size: 64px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1;
          }
          .score-percentage {
            font-size: 24px;
            color: #475569;
          }
          .integrity-level {
            text-align: center;
            padding: 20px 30px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          }
          .integrity-level .level-name {
            font-size: 24px;
            font-weight: 600;
            color: ${getIntegrityColor(data.summary.integrity_level)};
            margin-bottom: 5px;
          }
          .integrity-level .level-label {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 12px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
          }
          .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #1e293b;
            margin: 30px 0 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .indicators-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            margin-bottom: 30px;
          }
          .indicators-table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 15px;
            text-align: left;
          }
          .indicators-table td {
            padding: 15px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          .indicators-table tr:last-child td {
            border-bottom: none;
          }
          .indicators-table tr:hover {
            background: #f8fafc;
          }
          .score-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 40px;
            font-weight: 500;
            font-size: 14px;
          }
          .score-high { background: #dcfce7; color: #166534; }
          .score-medium { background: #fef9c3; color: #854d0e; }
          .score-low { background: #fee2e2; color: #991b1b; }
          .remarks-box {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #2563eb;
            margin: 30px 0;
            font-style: italic;
            color: #475569;
          }
          .footer {
            margin-top: 40px;
            padding: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 14px;
          }
          .print-button {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #2563eb;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 50px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(37,99,235,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s;
          }
          .print-button:hover {
            background: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 15px 30px rgba(37,99,235,0.4);
          }
          @media print {
            body { background: white; padding: 0; }
            .print-button { display: none; }
            .report-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="report-header">
            <h1>AIMS Assessment Report</h1>
            <div class="subtitle">Anti-Corruption Commission • Fiscal Year ${data.assessment.fiscal_year}</div>
            <div class="agency-badge">${data.agency.name} • ${data.agency.sector}</div>
          </div>
          
          <div class="report-content">
            <div class="score-hero">
              <div class="score-main">
                <div class="score-label">Overall AIMS Score</div>
                <div class="score-value">${data.summary.percentage}%</div>
                <div class="score-percentage">${data.summary.total_score}/${data.summary.total_max_score} points</div>
              </div>
              <div class="integrity-level">
                <div class="level-name">${data.summary.integrity_level}</div>
                <div class="level-label">Integrity Level</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Assessment Status</span>
                <span class="info-value">
                  <span style="color: ${data.assessment.status === 'FINALIZED' ? '#16a34a' : '#ca8a04'}">●</span>
                  ${data.assessment.status}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Finalized Date</span>
                <span class="info-value">${data.assessment.finalized_at ? new Date(data.assessment.finalized_at).toLocaleDateString() : 'Not finalized'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Indicators Completed</span>
                <span class="info-value">${data.summary.indicators_completed}/${data.summary.total_indicators}</span>
              </div>
            </div>

            <h2 class="section-title">Indicator Performance</h2>
            
            <table class="indicators-table">
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Category</th>
                  <th>Score</th>
                  <th>Max</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                ${data.indicators.map((ind: any) => {
                  const percentage = ind.max_score ? ((ind.score / ind.max_score) * 100).toFixed(1) : '0';
                  const percentValue = parseFloat(percentage);
                  const percentClass = percentValue >= 80 ? 'score-high' : percentValue >= 50 ? 'score-medium' : 'score-low';
                  
                  return `
                    <tr>
                      <td><strong>${ind.indicator_name}</strong></td>
                      <td>${ind.category}</td>
                      <td style="font-weight: 600; color: ${getScoreColor(ind.score, ind.max_score)}">${ind.score}</td>
                      <td>${ind.max_score}</td>
                      <td><span class="score-badge ${percentClass}">${percentage}%</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            ${data.assessment.officer_remarks ? `
              <div class="remarks-box">
                <strong style="display: block; margin-bottom: 10px; color: #1e293b;">Officer Remarks</strong>
                "${data.assessment.officer_remarks}"
              </div>
            ` : ''}

            <div class="footer">
              <p>Report generated on ${new Date().toLocaleString()}</p>
              <p style="margin-top: 5px;">AIMS Assessment Framework v3.0 • Anti-Corruption Commission</p>
            </div>
          </div>
        </div>

        <button class="print-button" onclick="window.print()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9V3h12v6M6 21h12v-6H6v6zM4 9h16v8h-4v2h-8v-2H4V9z"/>
          </svg>
          Print Report
        </button>
      </body>
      </html>
    `;
  };

  const handleBack = () => {
    navigate('/prevention/dashboard');
  };

  // Get template for the AIMS assessment
  const getAIMSTemplate = () => {
    return templates.find(template => 
      template.name?.includes('AIMS') || template.templateType === 'assessment'
    );
  };

  const aimsTemplate = getAIMSTemplate();

  if (loading || configLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Unable to Load Assessment</h2>
          <p className="text-gray-600 mb-6">{error || 'Agency not found'}</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // AssessmentHeader expects status
  const headerStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'AWAITING_VALIDATION' | 'FINALIZED' = 
    overallStatus === 'FINALIZED' ? 'FINALIZED' :
    overallStatus === 'IN_PROGRESS' || overallStatus === 'COMPLETED' || overallStatus === 'DRAFT' ? 'IN_PROGRESS' :
    'NOT_STARTED';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Save Confirmation Toast */}
      {showSaveConfirmation && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center z-50 animate-slide-down">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          <span>Assessment saved successfully</span>
        </div>
      )}

      {/* Validation Errors Toast */}
      {validationErrors.length > 0 && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-center z-50 animate-slide-down">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
          <div>
            <span className="font-medium">Please fix the following:</span>
            <ul className="text-sm mt-1">
              {validationErrors.map((err, idx) => (
                <li key={idx}>• {err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <AssessmentHeader 
          agencyName={agency.name}
          sector={agency.sector}
          status={headerStatus}
          fiscalYear={assessment?.fiscal_year || "2024–25"}
          onBack={handleBack}
        />

        {/* Status Bar */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  overallStatus === 'FINALIZED' ? 'bg-green-500' :
                  overallStatus === 'IN_PROGRESS' ? 'bg-yellow-500' :
                  overallStatus === 'COMPLETED' ? 'bg-blue-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">Status: </span>
                <span className="ml-1 text-sm font-semibold text-gray-900">{overallStatus.replace('_', ' ')}</span>
              </div>
              
              {assessment?.last_updated && (
                <div className="flex items-center text-sm text-gray-500">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Last updated: {new Date(assessment.last_updated).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {isSaving && (
                <div className="flex items-center text-sm text-blue-600">
                  <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </div>
              )}
              
              {lastSaved && !isSaving && (
                <div className="flex items-center text-sm text-gray-500">
                  <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
                  Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agency Info Card */}
        <div className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
            <h3 className="text-lg font-semibold text-blue-900">Agency Information</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agency Name</p>
                <p className="mt-1 text-gray-900 font-medium">{agency.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</p>
                <p className="mt-1 text-gray-900">{agency.sector}</p>
              </div>
              {agency.contact_email && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Email</p>
                  <p className="mt-1 text-gray-900">{agency.contact_email}</p>
                </div>
              )}
              {agency.contact_phone && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Phone</p>
                  <p className="mt-1 text-gray-900">{agency.contact_phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('form')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'form'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Assessment Form
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Summary & Scores
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'form' && (
            <>
              {/* Action Buttons */}
              <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3">
                {isAssessmentFinalized ? (
                  <button
                    onClick={handleUnlockAssessment}
                    disabled={isUnlocking}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {isUnlocking ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        Unlocking...
                      </>
                    ) : (
                      <>
                        <LockOpenIcon className="h-4 w-4 mr-2" />
                        Unlock Assessment
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => formRef.current?.getFormData() && saveAssessmentToBackend(formRef.current.getFormData())}
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                          Save Progress
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleFinalizeAssessment}
                      disabled={isFinalizing}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {isFinalizing ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                          Finalizing...
                        </>
                      ) : (
                        <>
                          <LockClosedIcon className="h-4 w-4 mr-2" />
                          Finalize Assessment
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Assessment Form */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-semibold text-gray-900">AIMS Assessment Form</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Complete all indicators below. Scores are calculated automatically.
                  </p>
                  {isAssessmentFinalized && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
                      <LockClosedIcon className="h-5 w-5 text-orange-500 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">
                          Assessment is finalized and locked
                        </p>
                        <p className="text-sm text-orange-700 mt-1">
                          Click "Unlock Assessment" to make changes. You must provide a reason for unlocking.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  {aimsTemplate ? (
                    <DynamicForm
                      ref={formRef}
                      template={aimsTemplate}
                      initialData={assessment?.response_data || {}}
                      onSubmit={async (submissionData) => {
                        console.log('🔵 SUBMIT TRIGGERED');
                        await saveAssessmentToBackend(submissionData);
                      }}
                      mode={isAssessmentFinalized ? "readonly" : "live"}
                      readOnly={isAssessmentFinalized}
                    />
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No AIMS assessment template found.</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Please contact administrator to set up the form template.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'summary' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-600 font-medium mb-2">Overall Score</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {assessment?.overall_score?.toFixed(1) || '0'}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">out of 100 points</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                  <p className="text-sm text-green-600 font-medium mb-2">Indicators Completed</p>
                  <p className="text-3xl font-bold text-green-900">
                    {assessment?.indicator_scores ? Object.keys(assessment.indicator_scores).length : '0'}
                  </p>
                  <p className="text-sm text-green-600 mt-1">out of 5 indicators</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                  <p className="text-sm text-purple-600 font-medium mb-2">Last Updated</p>
                  <p className="text-lg font-semibold text-purple-900">
                    {assessment?.last_updated ? new Date(assessment.last_updated).toLocaleDateString() : 'Never'}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    {assessment?.last_updated ? new Date(assessment.last_updated).toLocaleTimeString() : ''}
                  </p>
                </div>
              </div>

              {/* Preview Report Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => handleGenerateReport('agency')}
                  disabled={isGeneratingReport}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
                >
                  {isGeneratingReport ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <EyeIcon className="h-5 w-5 mr-2" />
                      View Final Report
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Generate a comprehensive PDF report with all scores and integrity levels
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Report Generation Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Report Generation</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-gray-900 mb-2">Agency Report</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Generate detailed assessment report for this agency including all indicator scores and integrity level
                </p>
                <button
                  onClick={() => handleGenerateReport('agency')}
                  disabled={isGeneratingReport}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isGeneratingReport ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PrinterIcon className="h-4 w-4 mr-2" />
                      Generate Agency Report
                    </>
                  )}
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-2">Overall Summary</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Generate summary report for all assigned agencies (coming soon)
                </p>
                <button
                  onClick={() => alert('Summary report generation coming soon!')}
                  className="inline-flex items-center px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50"
                  disabled
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleBack}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}