// frontend/src/components/reports/ScoreBarChart.tsx
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

interface ScoreBarChartProps {
  agencies: Array<{ name: string; score: number }>;
}

export default function ScoreBarChart({ agencies }: ScoreBarChartProps) {
  const data = {
    labels: agencies.map(a => a.name),
    datasets: [
      {
        label: 'Integrity Score',
        data: agencies.map(a => a.score),
        backgroundColor: agencies.map(a =>
          a.score >= 80 ? '#10B981' :
          a.score >= 50 ? '#F59E0B' : '#EF4444'
        ),
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.parsed.y} / 100`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: 'Score' },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-md font-semibold mb-3">Agency Integrity Scores</h3>
      <Bar data={data} options={options} height={100} />
    </div>
  );
}