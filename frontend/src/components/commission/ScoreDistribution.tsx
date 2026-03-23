interface ScoreDistributionProps {
  data: Array<{
    integrityLevel: string;
    count: number;
  }>;
}

export default function ScoreDistribution({ data }: ScoreDistributionProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  const getColor = (level: string) => {
    switch (level) {
      case 'High Integrity':
        return 'bg-green-500';
      case 'Medium Integrity':
        return 'bg-yellow-500';
      case 'Low Integrity':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTextColor = (level: string) => {
    switch (level) {
      case 'High Integrity':
        return 'text-green-600';
      case 'Medium Integrity':
        return 'text-yellow-600';
      case 'Low Integrity':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrity Score Distribution</h2>
      <div className="space-y-4">
        {data.map((item) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.integrityLevel}>
              <div className="flex justify-between items-center mb-1">
                <span className={`font-medium ${getTextColor(item.integrityLevel)}`}>
                  {item.integrityLevel}
                </span>
                <span className="text-sm text-gray-600">{item.count} agencies ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${getColor(item.integrityLevel)}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {total === 0 && (
        <div className="text-center py-8 text-gray-500">
          No assessment data available for current fiscal year
        </div>
      )}
    </div>
  );
}