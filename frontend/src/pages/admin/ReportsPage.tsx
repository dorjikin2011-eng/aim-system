import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';

/* ---------------- ChartJS Registration ---------------- */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  ArcElement,
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

/* ---------------- Doughnut Chart ---------------- */
function IntegrityLevelDonut({ report }: { report: ReportData }) {
  const chartData: ChartData<'doughnut', number[], string> = {
    labels: ['High Integrity', 'Medium', 'Needs Improvement'],
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

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-md font-semibold mb-3">
        Integrity Level Distribution
      </h3>
      <Doughnut
        data={chartData}
        options={{
          responsive: true,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.raw} agencies`,
              },
            },
          },
          cutout: '60%',
        }}
        height={150}
      />
    </div>
  );
}

/* ---------------- Submission Pipeline Chart ---------------- */
function SubmissionPipelineChart({
  pipeline,
}: {
  pipeline: PipelineStage[];
}) {
  const chartData: ChartData<'bar', number[], string> = {
    labels: pipeline.map((p) => p.stage),
    datasets: [
      {
        label: 'Agencies',
        data: pipeline.map((p) => p.count),
        backgroundColor: '#4F46E5',
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-md font-semibold mb-3">
        Submission Pipeline (FY 2025–26)
      </h3>
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
              title: {
                display: true,
                text: 'Number of Agencies',
              },
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
          a.score >= 80
            ? '#10B981'
            : a.score >= 50
            ? '#F59E0B'
            : '#EF4444'
        ),
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-md font-semibold mb-3">
        Agency Integrity Scores
      </h3>
      <Bar
        data={chartData}
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.raw} / 100`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Score',
              },
            },
          },
        }}
        height={100}
      />
    </div>
  );
}

/* ---------------- Main Page ---------------- */
export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [agencyScores, setAgencyScores] = useState<AgencyScore[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        const [summaryRes, scoresRes, pipelineRes] = await Promise.all([
          fetch('/api/reports/summary'),
          fetch('/api/reports/agency-scores'),
          fetch('/api/reports/pipeline'),
        ]);

        if (!summaryRes.ok) {
          throw new Error('Failed to load report summary');
        }

        setData(await summaryRes.json());

        if (scoresRes.ok) {
          setAgencyScores(await scoresRes.json());
        }

        if (pipelineRes.ok) {
          setPipeline(await pipelineRes.json());
        }

        setError(null);
      } catch (err: any) {
        setError(err.message || 'Unable to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600"
        >
          <HomeIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <p>Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600"
        >
          <HomeIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const report = data;

  return (
    <div className="p-6">
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center text-gray-600 mb-6"
      >
        <HomeIcon className="h-4 w-4 mr-1" />
        Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold">System Reports</h1>
      <p className="text-gray-600 mb-8">
        FY 2025–26 Integrity Assessment Overview
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          National Avg.<br />
          <b>{report.nationalAvg.toFixed(1)}</b>
        </div>
        <div className="bg-white p-4 rounded shadow">
          Total Agencies<br />
          <b>{report.totalAgencies}</b>
        </div>
        <div className="bg-green-50 p-4 rounded shadow">
          High Integrity<br />
          <b>{report.highIntegrity}</b>
        </div>
        <div className="bg-amber-50 p-4 rounded shadow">
          Medium<br />
          <b>{report.mediumIntegrity}</b>
        </div>
        <div className="bg-red-50 p-4 rounded shadow">
          Needs Improvement<br />
          <b>{report.lowIntegrity}</b>
        </div>
        <div className="bg-blue-50 p-4 rounded shadow">
          Submitted<br />
          <b>
            {report.submitted}/{report.totalAgencies}
          </b>
        </div>
      </div>

      {/* Charts */}
      <div className="mb-8 flex justify-center">
        <IntegrityLevelDonut report={report} />
      </div>

      {pipeline.length > 0 && (
        <div className="mb-8">
          <SubmissionPipelineChart pipeline={pipeline} />
        </div>
      )}

      {agencyScores.length > 0 && (
        <div className="mb-8">
          <ScoreBarChart agencies={agencyScores} />
        </div>
      )}

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={() =>
            (window.location.href = '/api/reports/export/excel')
          }
          className="px-4 py-2 bg-green-600 text-white rounded flex items-center"
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
          Export to Excel
        </button>
      </div>
    </div>
  );
}
