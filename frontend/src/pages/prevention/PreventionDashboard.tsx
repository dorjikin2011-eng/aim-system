// frontend/src/pages/prevention/PreventionDashboard.tsx - UPDATED WITH FY SELECTOR AND EMPTY STATE
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import TopNavBar from './components/TopNavBar';
import SummaryCards from './components/SummaryCards';
import AgenciesTable from './components/AgenciesTable';
import ValidationInbox from './components/ValidationInbox';
import RiskSnapshot from './components/RiskSnapshot';
import QuickActions from './components/QuickActions';
import EmptyStates from './components/EmptyStates';
import { usePreventionData } from './hooks/usePreventionData';
import { API_BASE } from '../../config';
import { 
  ArrowRightOnRectangleIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

// Define AgencyItem type matching AgenciesTable.tsx
interface AgencyItem {
  id: string;
  name: string;
  sector: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FINALIZED' | 'DRAFT' | 'SUBMITTED' | 'VALIDATED';
  score?: number;
  last_updated?: string;
  officer_remarks?: string;
  assigned_officer?: string;
  fiscal_year?: string;
  progress?: number;
  riskLevel?: 'Low' | 'Medium' | 'High';
}

export default function PreventionDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Fiscal Year State - Default to current FY
  const [selectedFY, setSelectedFY] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  });
  
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedAgencyForReport, setSelectedAgencyForReport] = useState<string>('');

  // Generate available fiscal years (past 2, current, next 2)
  const generateFiscalYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      years.push(`${startYear}-${endYear.toString().slice(-2)}`);
    }
    return years;
  };

  // Update the usePreventionData hook or cast the result to match our type
  const { agencies, summary, validationRequests, riskIndicators, loading, error, refetch } = usePreventionData(selectedFY);

  // Cast agencies to the correct type if needed
  const typedAgencies: AgencyItem[] = agencies as AgencyItem[] || [];
  
  const filteredAgencies = activeCard 
    ? typedAgencies.filter(a => a.status === activeCard)
    : typedAgencies;

  // Handle navigation to agency assessment
  const handleViewAgency = (agencyId: string) => {
    console.log('🔵 Navigating to agency assessment:', agencyId);
    navigate(`/prevention/agencies/${agencyId}/assessment?fiscal_year=${selectedFY}`);
  };

  // Handle generate agency report
  const handleGenerateAgencyReport = async (agencyId: string) => {
    if (!agencyId) return;
    
    console.log('📊 Generating agency report for:', agencyId);
    setIsGeneratingReport(true);
    setSelectedAgencyForReport(agencyId);
    
    try {
      const response = await fetch(`${API_BASE}/api/assessments/report/${agencyId}?fiscal_year=${selectedFY}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 401) {
        console.error('Authentication failed');
        alert('Your session has expired. Please log in again.');
        await logout();
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
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
          reportWindow.document.write(generateReportHTML(result.data));
          reportWindow.document.close();
        } else {
          alert('Popup blocked. Please allow popups for this site to view reports.');
        }
      } else {
        alert('Failed to generate report: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
      setSelectedAgencyForReport('');
    }
  };

  // Handle generate overall report
  const handleGenerateOverallReport = async () => {
    console.log('📊 Generating overall report for FY:', selectedFY);
    setIsGeneratingReport(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/reports/overall?fy=${selectedFY}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 401) {
        console.error('Authentication failed');
        alert('Your session has expired. Please log in again.');
        await logout();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Overall report data received:', result);

      if (result.success && result.data) {
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
          reportWindow.document.write(generateOverallReportHTML(result.data));
          reportWindow.document.close();
        } else {
          alert('Popup blocked. Please allow popups for this site to view reports.');
        }
      } else {
        alert('Failed to generate overall report: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating overall report:', error);
      alert('Failed to generate overall report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Handle finalize assessment
  const handleFinalizeAssessment = (agencyId: string) => {
    if (window.confirm('Are you sure you want to finalize this assessment? Once finalized, scores will be locked.')) {
      fetch(`${API_BASE}/api/assessments/finalize/${agencyId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalized_by: user?.id,
          finalization_notes: 'Assessment finalized by prevention officer',
          fiscal_year: selectedFY
        })
      })
      .then(async response => {
        if (response.ok) {
          alert('Assessment finalized successfully!');
          refetch();
        } else {
          const data = await response.json();
          alert(`Failed to finalize assessment: ${data.error || 'Unknown error'}`);
        }
      })
      .catch(error => {
        console.error('Error finalizing assessment:', error);
        alert('Error finalizing assessment. Please try again.');
      });
    }
  };

  // Handle unlock assessment
  const handleUnlockAssessment = (agencyId: string) => {
    const reason = prompt('Please enter reason for unlocking assessment:');
    if (!reason) return;

    if (window.confirm('Are you sure you want to unlock this assessment? This will allow editing of scores.')) {
      fetch(`${API_BASE}/api/assessments/unlock/${agencyId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unlocked_by: user?.id,
          reason: reason,
          fiscal_year: selectedFY
        })
      })
      .then(async response => {
        if (response.ok) {
          alert('Assessment unlocked successfully!');
          refetch();
        } else {
          const data = await response.json();
          alert(`Failed to unlock assessment: ${data.error || 'Unknown error'}`);
        }
      })
      .catch(error => {
        console.error('Error unlocking assessment:', error);
        alert('Error unlocking assessment. Please try again.');
      });
    }
  };

  // Helper function to generate agency report HTML
  const generateReportHTML = (data: any) => {
    // ... (keep existing generateReportHTML function)
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
          }
          .print-button:hover {
            background: #1d4ed8;
          }
          @media print {
            body { background: white; padding: 0; }
            .print-button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="report-header">
            <h1>AIMS Assessment Report</h1>
            <div class="subtitle">Fiscal Year ${data.assessment.fiscal_year}</div>
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
                  
                  // Map category to display name
                  let categoryDisplay = ind.category;
                  if (ind.category === 'integrity_promotion') categoryDisplay = 'Integrity Promotion';
                  else if (ind.category === 'corruption_accountability') categoryDisplay = 'Corruption Accountability';
                  
                  return `
                    <tr>
                      <td><strong>${ind.indicator_name}</strong></td>
                      <td>${categoryDisplay}</td>
                      <td style="font-weight: 600; color: ${getScoreColor(ind.score, ind.max_score)}">${ind.score}</td>
                      <td>${ind.max_score}</td>
                      <td><span class="score-badge ${percentClass}">${percentage}%</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

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

  // Helper function for overall report
  const generateOverallReportHTML = (data: any) => {
    const reportData = data || {};
    const agencies = reportData.assessments || reportData.agencies || [];
    const summary = reportData.summary || {};
    
    const totalAgencies = summary.totalAgencies || summary.total_agencies || 0;
    const finalizedCount = summary.finalizedCount || summary.finalized_count || 0;
    const averageScore = summary.averageScore || summary.average_score || 0;
    
    const integrityDist = {
      high: summary.highIntegrity || summary.high_integrity || 0,
      medium: summary.mediumIntegrity || summary.medium_integrity || 0,
      low: summary.needsImprovement || summary.needs_improvement || 0
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Overall AIMS Assessment Report - FY ${selectedFY}</title>
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
          .fy-badge {
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
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e2e8f0;
          }
          .summary-card .label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .summary-card .value {
            font-size: 36px;
            font-weight: 700;
            color: #1e3a8a;
          }
          .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #1e293b;
            margin: 30px 0 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .integrity-distribution {
            display: flex;
            gap: 20px;
            margin: 20px 0 30px;
          }
          .dist-item {
            flex: 1;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .dist-high { background: #dcfce7; color: #166534; }
          .dist-medium { background: #fef9c3; color: #854d0e; }
          .dist-low { background: #fee2e2; color: #991b1b; }
          .dist-number {
            font-size: 28px;
            font-weight: 700;
          }
          .agencies-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            margin-bottom: 30px;
          }
          .agencies-table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            padding: 15px;
            text-align: left;
          }
          .agencies-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e2e8f0;
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
          }
          .print-button:hover {
            background: #1d4ed8;
          }
          @media print {
            body { background: white; padding: 0; }
            .print-button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="report-header">
            <h1>Overall AIMS Assessment Report</h1>
            <div class="subtitle">Anti-Corruption Commission • Prevention Division</div>
            <div class="fy-badge">Fiscal Year ${selectedFY}</div>
          </div>
          
          <div class="report-content">
            <div class="summary-grid">
              <div class="summary-card">
                <div class="label">Total Agencies</div>
                <div class="value">${totalAgencies}</div>
              </div>
              <div class="summary-card">
                <div class="label">Finalized</div>
                <div class="value">${finalizedCount}</div>
              </div>
              <div class="summary-card">
                <div class="label">Average Score</div>
                <div class="value">${averageScore.toFixed(1)}%</div>
              </div>
            </div>

            <h2 class="section-title">Integrity Level Distribution</h2>
            <div class="integrity-distribution">
              <div class="dist-item dist-high">
                <div class="dist-number">${integrityDist.high}</div>
                <div>High Integrity</div>
              </div>
              <div class="dist-item dist-medium">
                <div class="dist-number">${integrityDist.medium}</div>
                <div>Medium Integrity</div>
              </div>
              <div class="dist-item dist-low">
                <div class="dist-number">${integrityDist.low}</div>
                <div>Needs Improvement</div>
              </div>
            </div>

            <h2 class="section-title">Agency Performance Summary</h2>
            
            <table class="agencies-table">
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>Sector</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Integrity Level</th>
                </tr>
              </thead>
              <tbody>
                ${agencies.map((agency: any) => {
                  const score = agency.score || agency.overall_score || 0;
                  let integrityLevel = 'Needs Improvement';
                  let integrityClass = 'dist-low';
                  
                  if (score >= 80) {
                    integrityLevel = 'High Integrity';
                    integrityClass = 'dist-high';
                  } else if (score >= 50) {
                    integrityLevel = 'Medium Integrity';
                    integrityClass = 'dist-medium';
                  }
                  
                  const status = agency.status || 'NOT_STARTED';
                  const formattedStatus = status === 'FINALIZED' ? 'Finalized' : 
                                          status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started';
                  const agencyName = agency.agencyName || agency.agency_name || agency.name || 'Unknown';
                  
                  return `
                    <tr>
                      <td><strong>${agencyName}</strong></td>
                      <td>${agency.sector || 'N/A'}</td>
                      <td>${formattedStatus}</td>
                      <td>${score.toFixed(1)}%</td>
                      <td><span class="${integrityClass}" style="padding: 4px 8px; border-radius: 4px; display: inline-block;">${integrityLevel}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>Report generated on ${new Date().toLocaleString()}</p>
              <p>AIMS Assessment Framework v3.0 • Anti-Corruption Commission</p>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard for FY {selectedFY}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">Error loading dashboard: {error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavBar 
        fiscalYear={selectedFY}
        onFiscalYearChange={setSelectedFY}
      />

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header Section with FY Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Prevention Division Dashboard</h1>
            <p className="text-gray-600">
              Welcome, <strong>{user?.name || 'Prevention Officer'}</strong>! ({user?.email})
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Role: Prevention Officer • Last login: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
            {/* Fiscal Year Selector */}
            <div className="flex items-center space-x-2 mr-4">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {generateFiscalYears().map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>
            
            {/* Agency Report Button */}
            <button
              onClick={() => {
                if (typedAgencies.length > 0) {
                  handleGenerateAgencyReport(typedAgencies[0].id);
                } else {
                  alert('No agencies available to generate report');
                }
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              disabled={typedAgencies.length === 0 || isGeneratingReport}
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Agency Report
            </button>
            
            {/* Overall Report Button */}
            <button
              onClick={handleGenerateOverallReport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              disabled={isGeneratingReport}
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Overall Report
            </button>
            
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards 
          data={summary}
          onSelectCard={setActiveCard}
          activeCard={activeCard}
        />

        {/* Quick Actions */}
        <div className="mt-6">
          <QuickActions 
            onViewAgency={handleViewAgency}
            onFinalizeAssessment={handleFinalizeAssessment}
            onUnlockAssessment={handleUnlockAssessment}
            agencies={typedAgencies}
          />
        </div>

        {/* Validation Inbox - GREYED OUT FOR FUTURE */}
        {validationRequests.length > 0 && (
          <div className="mt-8 opacity-50 cursor-not-allowed" title="Feature coming soon">
            <div className="flex items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900 mr-2">Validation Inbox</h3>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
            </div>
            <ValidationInbox requests={validationRequests} />
          </div>
        )}

        {/* Agencies Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              My Assigned Agencies for FY {selectedFY}
              {activeCard && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredAgencies.length} {activeCard.toLowerCase().replace('_', ' ')})
                </span>
              )}
            </h2>
            {activeCard && (
              <button
                onClick={() => setActiveCard(null)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filter
              </button>
            )}
          </div>

          {typedAgencies.length === 0 ? (
            <EmptyStates 
              fy={selectedFY} 
              state="NO_ASSIGNMENTS" 
              title="No Agencies Assigned"
              message={`You have not been assigned any agencies for fiscal year ${selectedFY}.`}
              actionText="Contact Administrator"
            />
          ) : filteredAgencies.length === 0 && activeCard ? (
            <div className="text-center py-8 bg-white rounded-lg shadow">
              <p className="text-gray-500">No agencies match the selected status filter.</p>
              <button
                onClick={() => setActiveCard(null)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Show all agencies
              </button>
            </div>
          ) : (
            <AgenciesTable 
              agencies={filteredAgencies}
              onViewAgency={handleViewAgency}
              onFinalizeAssessment={handleFinalizeAssessment}
              onUnlockAssessment={handleUnlockAssessment}
              onViewReport={handleGenerateAgencyReport}
              fiscalYear={selectedFY}
            />
          )}
        </div>

        {/* Risk Snapshot - GREYED OUT FOR FUTURE */}
        {riskIndicators.length > 0 && (
          <div className="mt-8 opacity-50 cursor-not-allowed" title="Feature coming soon">
            <div className="flex items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900 mr-2">Risk Snapshot</h3>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
            </div>
            <RiskSnapshot indicators={riskIndicators} />
          </div>
        )}

        {/* Report Generation Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Report Generation</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Agency Report</h4>
              <p className="text-sm text-gray-600 mb-3">
                Generate detailed assessment report for a specific agency
              </p>
              <div className="flex items-center space-x-2">
                <select 
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedAgencyForReport}
                  onChange={(e) => setSelectedAgencyForReport(e.target.value)}
                  disabled={isGeneratingReport}
                >
                  <option value="">Select an agency...</option>
                  {typedAgencies.map(agency => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name} ({agency.status})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleGenerateAgencyReport(selectedAgencyForReport)}
                  disabled={!selectedAgencyForReport || isGeneratingReport}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
                >
                  {isGeneratingReport && selectedAgencyForReport ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-3">
                Report includes: Score breakdown, integrity level, recommendations
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Overall Report</h4>
              <p className="text-sm text-gray-600 mb-3">
                Generate summary report for all assigned agencies for FY {selectedFY}
              </p>
              <div className="text-sm text-gray-500 mb-3 space-y-1">
                <p>• Summary of all agency scores</p>
                <p>• Integrity level distribution</p>
                <p>• Top performing/needing improvement agencies</p>
                <p>• Sector-wise performance analysis</p>
              </div>
              <button
                onClick={handleGenerateOverallReport}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin inline" />
                    Generating...
                  </>
                ) : (
                  'Generate Overall Report'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between text-xs text-gray-500">
            <div>
              <p className="mb-1">
                <strong>Assessment Workflow:</strong> Draft → In Progress → Completed → Finalized (Locked)
              </p>
              <p>
                Finalized scores can be unlocked by prevention officers for editing.
              </p>
            </div>
            <div className="mt-2 md:mt-0">
              <p>System Version: AIMS 1.0 • Data as of: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          {/* Future Features Notice */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Future Features (Coming Later):</strong> ACC Validation Workflow • Agency Review • Email Notifications • Advanced Analytics
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}