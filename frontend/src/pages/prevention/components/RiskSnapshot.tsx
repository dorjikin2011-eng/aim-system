// frontend/src/pages/prevention/components/RiskSnapshot.tsx

interface RiskIndicator {
  name: string;
  avgScore: number;
}

interface Props {
  indicators: RiskIndicator[];
}

export default function RiskSnapshot({ indicators }: Props) {
  if (indicators.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-medium text-gray-900 mb-3">🔥 Indicators with Lowest Scores (FY 2024-25)</h3>
      <ol className="space-y-2">
        {indicators.map((item, idx) => (
          <li key={idx} className="flex justify-between">
            <span>{idx + 1}. {item.name}</span>
            <span className="font-medium text-red-600">{item.avgScore}%</span>
          </li>
        ))}
      </ol>
    </div>
  );
}