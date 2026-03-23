interface KpiSummaryProps {
  kpis: {
    iccsImplementationRate: number;
    trainingCompletionRate: number;
    adComplianceRate: number;
    atrTimelinessRate: number;
  };
}

export default function KpiSummary({ kpis }: KpiSummaryProps) {
  const getKpiColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getKpiBgColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-50';
    if (rate >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const kpiItems = [
    {
      name: 'ICCS Implementation',
      value: kpis.iccsImplementationRate,
      description: 'Agencies with functional internal corruption control systems'
    },
    {
      name: 'Training Completion',
      value: kpis.trainingCompletionRate,
      description: 'E-learning completion rate across all agencies'
    },
    {
      name: 'Asset Declaration Compliance',
      value: kpis.adComplianceRate,
      description: 'Required asset declarations submitted on time'
    },
    {
      name: 'ATR Timeliness',
      value: kpis.atrTimelinessRate,
      description: 'Annual Transparency Reports submitted within deadline'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
      
      <div className="space-y-4">
        {kpiItems.map((kpi) => (
          <div key={kpi.name} className={`p-4 rounded-lg ${getKpiBgColor(kpi.value)}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900">{kpi.name}</h3>
              <span className={`text-xl font-bold ${getKpiColor(kpi.value)}`}>
                {kpi.value}%
              </span>
            </div>
            <p className="text-sm text-gray-600">{kpi.description}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(kpi.value, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
