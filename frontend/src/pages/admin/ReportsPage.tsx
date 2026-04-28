// frontend/src/pages/admin/ReportsPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, DocumentArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { API_BASE } from '../../config';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';

/* ---------------- ChartJS Registration ---------------- */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

/* ---------------- Types ---------------- */
interface ReportData {
  nationalAvg: number;
  totalAgencies: number;
  highIntegrity: number;
  mediumIntegrity: number;
  lowIntegrity: number;
  submitted: number;
}

interface AgencyScore {
  name: string;
  score: number;
}

interface PipelineStage {
  stage: string;
  count: number;
}

interface RankingAgency {
  agency_id: string;
  agency_name: string;
  sector: string;
  overall_score: number;
  status: string;
  integrity_level: string;
  rank: number;
  rank_label: string;
}

interface ParameterAgency {
  agency_id: string;
  agency_name: string;
  sector: string;
  overall_score: number;
  status: string;
  parameters: {
    iccs_complaint: number;
    iccs_coi: number;
    iccs_gift: number;
    iccs_proactive: number;
    training_total_employees: number;
    training_completed_employees: number;
    training_percentage: number;
    ad_total_officials: number;
    ad_submitted_officials: number;
    ad_percentage: number;
    coc_level: number;
    cases_convictions: number;
    cases_prosecutions: number;
    cases_admin_actions: number;
    cases_score: number;
  };
}

interface ParameterAverages {
  iccs_complaint: number;
  iccs_coi: number;
  iccs_gift: number;
  iccs_proactive: number;
  training_percentage: number;
  ad_percentage: number;
  coc_level: number;
  cases_score: number;
  cases_convictions: number;
  cases_prosecutions: number;
  cases_admin_actions: number;
  total_score: number;
}

interface TimelinePoint {
  fiscal_year: string;
  overall_score: number;
  integrity_level: string;
  status: string;
}

// For multi-agency storage
interface MultiAgencyTimelineData {
  [agencyId: string]: {
    agency_name: string;
    sector: string;
    timeline: TimelinePoint[];
    summary: {
      current_score: number;
      previous_score: number;
      change_absolute: number;
      change_percentage: number;
      best_score: number;
      best_fy: string;
      trend: string;
      total_years: number;
      years_assessed: number;
    };
  };
}

/* ---------------- Doughnut Chart ---------------- */
function IntegrityLevelDonut({ report }: { report: ReportData }) {
  const chartData: ChartData<'doughnut', number[], string> = {
    labels: ['High Integrity', 'Medium Integrity', 'Needs Improvement'],
    datasets: [
      {
        data: [
          report.highIntegrity,
          report.mediumIntegrity,
          report.lowIntegrity,
        ],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  const total = report.highIntegrity + report.mediumIntegrity + report.lowIntegrity;
  const percentages = {
    high: total > 0 ? ((report.highIntegrity / total) * 100).toFixed(1) : 0,
    medium: total > 0 ? ((report.mediumIntegrity / total) * 100).toFixed(1) : 0,
    low: total > 0 ? ((report.lowIntegrity / total) * 100).toFixed(1) : 0,
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-md font-semibold mb-3">Integrity Level Distribution</h3>
      <div className="flex flex-col items-center">
        <div className="w-64 h-64">
          <Doughnut
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.label}: ${ctx.raw} agencies (${percentages[ctx.label === 'High Integrity' ? 'high' : ctx.label === 'Medium Integrity' ? 'medium' : 'low']}%)`,
                  },
                },
              },
              cutout: '50%',
            }}
          />
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span>High: {report.highIntegrity} ({percentages.high}%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
            <span>Medium: {report.mediumIntegrity} ({percentages.medium}%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span>Needs Improvement: {report.lowIntegrity} ({percentages.low}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Submission Pipeline Chart ---------------- */
function SubmissionPipelineChart({ pipeline, fiscalYear }: { pipeline: PipelineStage[]; fiscalYear: string }) {
  const chartData: ChartData<'bar', number[], string> = {
    labels: pipeline.map((p) => p.stage),
    datasets: [
      {
        label: 'Number of Agencies',
        data: pipeline.map((p) => p.count),
        backgroundColor: '#4F46E5',
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-md font-semibold mb-3">Submission Pipeline (FY {fiscalYear})</h3>
      <Bar
        data={chartData}
        options={{
          indexAxis: 'y',
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.raw} agencies`,
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              title: { display: true, text: 'Number of Agencies' },
              ticks: { stepSize: 1, precision: 0 },
            },
          },
        }}
        height={120}
      />
    </div>
  );
}

/* ---------------- Agency Score Bar Chart ---------------- */
function ScoreBarChart({ agencies }: { agencies: AgencyScore[] }) {
  const chartData: ChartData<'bar', number[], string> = {
    labels: agencies.map((a) => a.name),
    datasets: [
      {
        label: 'Integrity Score',
        data: agencies.map((a) => a.score),
        backgroundColor: agencies.map((a) =>
          a.score >= 80 ? '#10B981' : a.score >= 50 ? '#F59E0B' : '#EF4444'
        ),
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-md font-semibold mb-3">Agency Integrity Scores</h3>
      <Bar
        data={chartData}
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => `${ctx.raw} / 100` } },
          },
          scales: {
            y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score' } },
          },
        }}
        height={100}
      />
    </div>
  );
}

/* ---------------- Agency Rankings Table ---------------- */
function AgencyRankingsTable({ rankings }: { rankings: RankingAgency[] }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getIntegrityBadge = (level: string) => {
    const colors: Record<string, string> = {
      'High Integrity': 'bg-green-100 text-green-800',
      'Medium Integrity': 'bg-amber-100 text-amber-800',
      'Needs Improvement': 'bg-red-100 text-red-800',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">🏆 Agency Rankings</h3>
        <p className="text-sm text-gray-500">Ranked by overall integrity score</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sector</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Integrity Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rankings.map((agency) => (
              <tr key={agency.agency_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-lg font-bold">{agency.rank_label}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{agency.agency_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agency.sector}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-lg font-semibold ${getScoreColor(agency.overall_score)}`}>
                    {agency.overall_score > 0 ? agency.overall_score.toFixed(1) : '—'}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getIntegrityBadge(agency.integrity_level)}`}>
                    {agency.integrity_level}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{agency.status === 'FINALIZED' ? '✓ Finalized' : agency.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Parameter Comparison Table ---------------- */
function ParameterComparisonTable({ agencies, averages }: { agencies: ParameterAgency[]; averages: ParameterAverages }) {
  const getScoreClass = (value: number, maxValue: number, type: string) => {
    let percentage: number;
    if (type === 'level') percentage = (value / 3) * 100;
    else if (type === 'percentage') percentage = value;
    else percentage = (value / maxValue) * 100;
    
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 50) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const formatLevel = (value: number) => {
    if (value === 0) return 'Level 0';
    if (value === 1) return 'Level 1';
    if (value === 2) return 'Level 2';
    if (value === 3) return 'Level 3';
    return `Level ${value.toFixed(1)}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">📊 Parameter Level Comparison</h3>
        <p className="text-sm text-gray-500">Compare individual subsystem performance across agencies</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">Agency</th>
              <th colSpan={4} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">ICCS</th>
              <th colSpan={2} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">Capacity Building</th>
              <th colSpan={2} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">Asset Declaration</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-amber-50">CoC</th>
              <th colSpan={4} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-red-50">Corruption Cases</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-gray-100">Total</th>
            </tr>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50">Agency / Sector</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Complaint</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">CoI</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Gift</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Proactive</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Completion %</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Staff Trained</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Compliance %</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Officials</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">CoC Level</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Convictions</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Prosecutions</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Admin Actions</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Severity</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Score %</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {agencies.map((agency) => (
              <tr key={agency.agency_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white">
                  <div className="font-medium text-gray-900">{agency.agency_name}</div>
                  <div className="text-xs text-gray-500">{agency.sector}</div>
                </td>
                <td className="px-2 py-3 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(agency.parameters.iccs_complaint, 3, 'level')}`}>
                    {formatLevel(agency.parameters.iccs_complaint)}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(agency.parameters.iccs_coi, 3, 'level')}`}>
                    {formatLevel(agency.parameters.iccs_coi)}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(agency.parameters.iccs_gift, 3, 'level')}`}>
                    {formatLevel(agency.parameters.iccs_gift)}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(agency.parameters.iccs_proactive, 3, 'level')}`}>
                    {formatLevel(agency.parameters.iccs_proactive)}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(agency.parameters.training_percentage, 100, 'percentage')}`}>
                    {formatPercentage(agency.parameters.training_percentage)}
                  </span>
                </td>
                <td className="px-2 py-3 text-center text-xs text-gray-600">
                  {agency.parameters.training_completed_employees}/{agency.parameters.training_total_employees}
                </td>
                <td className="px-2 py-3 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(agency.parameters.ad_percentage, 100, 'percentage')}`}>
                    {formatPercentage(agency.parameters.ad_percentage)}
                  </span>
                </td>
                <td className="px-2 py-3 text-center text-xs text-gray-600">
                  {agency.parameters.ad_submitted_officials}/{agency.parameters.ad_total_officials}
                </td>
                <td className="px-2 py-3 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(agency.parameters.coc_level, 3, 'level')}`}>
                    {formatLevel(agency.parameters.coc_level)}
                  </span>
                </td>
                <td className="px-2 py-3 text-center text-xs text-gray-600">{agency.parameters.cases_convictions}</td>
                <td className="px-2 py-3 text-center text-xs text-gray-600">{agency.parameters.cases_prosecutions}</td>
                <td className="px-2 py-3 text-center text-xs text-gray-600">{agency.parameters.cases_admin_actions}</td>
                <td className="px-2 py-3 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(agency.parameters.cases_score, 20, 'score')}`}>
                    {agency.parameters.cases_score}/20
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  <span className="font-semibold text-gray-900">
                    {agency.overall_score > 0 ? `${agency.overall_score.toFixed(1)}%` : '—'}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-medium">
              <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-gray-100">
                <span className="text-gray-700">📊 AVERAGE</span>
              </td>
              <td className="px-2 py-3 text-center">
                <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(averages.iccs_complaint, 3, 'level')}`}>
                  Level {averages.iccs_complaint.toFixed(1)}
                </span>
              </td>
              <td className="px-2 py-3 text-center">
                <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(averages.iccs_coi, 3, 'level')}`}>
                  Level {averages.iccs_coi.toFixed(1)}
                </span>
              </td>
              <td className="px-2 py-3 text-center">
                <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(averages.iccs_gift, 3, 'level')}`}>
                  Level {averages.iccs_gift.toFixed(1)}
                </span>
              </td>
              <td className="px-2 py-3 text-center">
                <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(averages.iccs_proactive, 3, 'level')}`}>
                  Level {averages.iccs_proactive.toFixed(1)}
                </span>
              </td>
              <td className="px-2 py-3 text-center">
                <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(averages.training_percentage, 100, 'percentage')}`}>
                  {averages.training_percentage.toFixed(1)}%
                </span>
              </td>
              <td className="px-2 py-3 text-center text-xs text-gray-600">—</td>
              <td className="px-2 py-3 text-center">
                <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(averages.ad_percentage, 100, 'percentage')}`}>
                  {averages.ad_percentage.toFixed(1)}%
                </span>
              </td>
              <td className="px-2 py-3 text-center text-xs text-gray-600">—</td>
              <td className="px-2 py-3 text-center">
                <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(averages.coc_level, 3, 'level')}`}>
                  Level {averages.coc_level.toFixed(1)}
                </span>
              </td>
              <td className="px-2 py-3 text-center text-xs text-gray-600">{(averages.cases_convictions || 0).toFixed(1)}</td>
              <td className="px-2 py-3 text-center text-xs text-gray-600">{(averages.cases_prosecutions || 0).toFixed(1)}</td>
              <td className="px-2 py-3 text-center text-xs text-gray-600">{(averages.cases_admin_actions || 0).toFixed(1)}</td>
              <td className="px-2 py-3 text-center">
                <span className={`px-2 py-1 text-xs rounded-full ${getScoreClass(averages.cases_score, 20, 'score')}`}>
                  {averages.cases_score.toFixed(1)}/20
                </span>
              </td>
              <td className="px-2 py-3 text-center">
                <span className="font-semibold text-gray-700">{(averages.total_score || 0).toFixed(1)}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600">
        💡 <span className="font-medium">Insight:</span> Complaint systems show the strongest performance, while Proactive systems need improvement across all agencies.
      </div>
    </div>
  );
}

/* ---------------- Multi-Agency Timeline Chart ---------------- */
function MultiAgencyTimelineChart({ agencies }: { agencies: { id: string; name: string }[] }) {
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [multiTimelineData, setMultiTimelineData] = useState<MultiAgencyTimelineData>({});
  const [loading, setLoading] = useState(false);

  const fetchMultiAgencyTimeline = async (agencyIds: string[]) => {
    if (agencyIds.length === 0) {
      setMultiTimelineData({});
      return;
    }
    
    setLoading(true);
    const newData: MultiAgencyTimelineData = {};
    
    for (const agencyId of agencyIds) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/reports/agency-timeline?agencyId=${agencyId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            newData[agencyId] = {
              agency_name: result.data.agency.name,
              sector: result.data.agency.sector,
              timeline: result.data.timeline,
              summary: result.data.summary
            };
          }
        }
      } catch (err) {
        console.error(`Error fetching timeline for agency ${agencyId}:`, err);
      }
    }
    
    setMultiTimelineData(newData);
    setLoading(false);
  };

  const handleAgencyToggle = (agencyId: string) => {
    const newSelection = selectedAgencyIds.includes(agencyId)
      ? selectedAgencyIds.filter(id => id !== agencyId)
      : [...selectedAgencyIds, agencyId];
    setSelectedAgencyIds(newSelection);
    fetchMultiAgencyTimeline(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedAgencyIds.length === agencies.length) {
      setSelectedAgencyIds([]);
      setMultiTimelineData({});
    } else {
      const allIds = agencies.map(a => a.id);
      setSelectedAgencyIds(allIds);
      fetchMultiAgencyTimeline(allIds);
    }
  };

  // Prepare chart data
  const allFiscalYears = new Set<string>();
  Object.values(multiTimelineData).forEach(agencyData => {
    agencyData.timeline.forEach(point => allFiscalYears.add(point.fiscal_year));
  });
  const fiscalYears = Array.from(allFiscalYears).sort();

  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
  
  const chartDatasets = selectedAgencyIds.map((agencyId, index) => {
    const agencyData = multiTimelineData[agencyId];
    const color = colors[index % colors.length];
    
    return {
      label: agencyData?.agency_name || agencyId,
      data: fiscalYears.map(fy => {
        const point = agencyData?.timeline.find(t => t.fiscal_year === fy);
        return point?.overall_score || null;
      }),
      borderColor: color,
      backgroundColor: `${color}20`,
      tension: 0.3,
      fill: false,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
    };
  });

  const chartData = { labels: fiscalYears, datasets: chartDatasets };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📈 Year-on-Year Performance Trend</h3>
          <p className="text-sm text-gray-500">Select multiple agencies to compare performance across fiscal years</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            {selectedAgencyIds.length === agencies.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Agency Selection Checkboxes */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap gap-3">
          {agencies.map(agency => (
            <label key={agency.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedAgencyIds.includes(agency.id)}
                onChange={() => handleAgencyToggle(agency.id)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{agency.name}</span>
            </label>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading timeline data...</p>
        </div>
      )}

      {!loading && selectedAgencyIds.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Select one or more agencies to view performance trends.</p>
        </div>
      )}

      {!loading && selectedAgencyIds.length > 0 && chartDatasets.length > 0 && (
        <div>
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%` } },
                legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
              },
              scales: {
                y: { beginAtZero: true, max: 100, title: { display: true, text: 'Integrity Score (%)' }, ticks: { callback: (value) => `${value}%` } },
                x: { title: { display: true, text: 'Fiscal Year' } },
              },
            }}
            height={80}
          />
        </div>
      )}
    </div>
  );
}

/* ---------------- Main Page ---------------- */
export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [agencyScores, setAgencyScores] = useState<AgencyScore[]>([]);
  const [selectedFY, setSelectedFY] = useState<string>('2026–2027');
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [rankings, setRankings] = useState<RankingAgency[]>([]);
  const [parameterAgencies, setParameterAgencies] = useState<ParameterAgency[]>([]);
  const [parameterAverages, setParameterAverages] = useState<ParameterAverages | null>(null);
  const [allAgencies, setAllAgencies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };

      const [summaryRes, scoresRes, pipelineRes, rankingsRes, paramRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/summary?fiscal_year=${selectedFY}`, { credentials: 'include', headers }),
        fetch(`${API_BASE}/api/reports/agency-scores?fiscal_year=${selectedFY}`, { credentials: 'include', headers }),
        fetch(`${API_BASE}/api/reports/pipeline?fiscal_year=${selectedFY}`, { credentials: 'include', headers }),
        fetch(`${API_BASE}/api/reports/agency-rankings?fiscal_year=${selectedFY}`, { credentials: 'include', headers }),
        fetch(`${API_BASE}/api/reports/parameter-comparison?fiscal_year=${selectedFY}`, { credentials: 'include', headers }),
      ]);

      if (!summaryRes.ok) throw new Error('Failed to load report summary');
      const summaryData = await summaryRes.json();
      setData(summaryData);

      if (scoresRes.ok) {
        const scoresData = await scoresRes.json();
        if (scoresData.success) {
          setAgencyScores(scoresData.agencies || []);
          const agenciesList = scoresData.agency_list || (scoresData.agencies || []).map((a: any) => ({ id: a.id, name: a.name }));
          setAllAgencies(agenciesList);
        }
      }

      if (pipelineRes.ok) {
        const pipelineData = await pipelineRes.json();
        setPipeline(pipelineData.stages || pipelineData.data || pipelineData);
      }

      if (rankingsRes.ok) {
        const rankingsData = await rankingsRes.json();
        if (rankingsData.success && rankingsData.data) setRankings(rankingsData.data.rankings || []);
      }

      if (paramRes.ok) {
        const paramData = await paramRes.json();
        if (paramData.success && paramData.data) {
          setParameterAgencies(paramData.data.agencies || []);
          setParameterAverages(paramData.data.averages || null);
        }
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Unable to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedFY]);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/reports/export/excel`, {
        credentials: 'include',
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });
      
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `integrity_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export report');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/admin')} className="flex items-center text-gray-600 mb-6 hover:text-gray-900">
          <HomeIcon className="h-4 w-4 mr-1" /> Back to Dashboard
        </button>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/admin')} className="flex items-center text-gray-600 mb-6 hover:text-gray-900">
          <HomeIcon className="h-4 w-4 mr-1" /> Back to Dashboard
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">Error loading reports:</p>
          <p className="text-red-500 mt-1">{error || 'No data available'}</p>
          <button onClick={fetchAllData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center">
            <ArrowPathIcon className="h-4 w-4 mr-2" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const report = data;

  return (
    <div className="p-6">
      <button onClick={() => navigate('/admin')} className="flex items-center text-gray-600 mb-6 hover:text-gray-900">
        <HomeIcon className="h-4 w-4 mr-1" /> Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">System Reports</h1>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Fiscal Year:</label>
            <select value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm">
              <option value="2024–2025">2024–2025</option>
              <option value="2025–2026">2025–2026</option>
              <option value="2026–2027">2026–2027</option>
            </select>
          </div>
          <button onClick={fetchAllData} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center">
            <ArrowPathIcon className="h-4 w-4 mr-1" /> Refresh
          </button>
        </div>
      </div>
      <p className="text-gray-600 mb-8">Integrity Assessment Overview - FY {selectedFY}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-600">National Avg.</p>
          <p className="text-2xl font-bold">{report.nationalAvg.toFixed(1)}</p>
          <p className="text-xs text-gray-500">/ 100</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-600">Total Agencies</p>
          <p className="text-2xl font-bold">{report.totalAgencies}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <p className="text-sm text-green-700">High Integrity</p>
          <p className="text-2xl font-bold text-green-800">{report.highIntegrity}</p>
          <p className="text-xs text-green-600">{((report.highIntegrity / report.totalAgencies) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg shadow border border-amber-200">
          <p className="text-sm text-amber-700">Medium</p>
          <p className="text-2xl font-bold text-amber-800">{report.mediumIntegrity}</p>
          <p className="text-xs text-amber-600">{((report.mediumIntegrity / report.totalAgencies) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <p className="text-sm text-red-700">Needs Improvement</p>
          <p className="text-2xl font-bold text-red-800">{report.lowIntegrity}</p>
          <p className="text-xs text-red-600">{((report.lowIntegrity / report.totalAgencies) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <p className="text-sm text-blue-700">Submitted</p>
          <p className="text-2xl font-bold text-blue-800">{report.submitted}/{report.totalAgencies}</p>
          <p className="text-xs text-blue-600">{((report.submitted / report.totalAgencies) * 100).toFixed(1)}% complete</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <IntegrityLevelDonut report={report} />
        {pipeline.length > 0 && <SubmissionPipelineChart pipeline={pipeline} fiscalYear={selectedFY} />}
      </div>

      {/* Agency Scores Bar Chart */}
      {agencyScores.length > 0 && (
        <div className="mb-8"><ScoreBarChart agencies={agencyScores} /></div>
      )}

      {/* Agency Rankings Table */}
      {rankings.length > 0 && (
        <div className="mb-8"><AgencyRankingsTable rankings={rankings} /></div>
      )}

      {/* Parameter Comparison Table */}
      {parameterAgencies.length > 0 && parameterAverages && (
        <div className="mb-8"><ParameterComparisonTable agencies={parameterAgencies} averages={parameterAverages} /></div>
      )}

      {/* Multi-Agency Timeline Chart */}
      <div className="mb-8">
        <MultiAgencyTimelineChart agencies={allAgencies} />
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center transition-colors">
          <DocumentArrowDownIcon className="h-4 w-4 mr-2" /> Export to Excel
        </button>
      </div>
    </div>
  );
}