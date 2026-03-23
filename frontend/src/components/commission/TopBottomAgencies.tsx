interface Agency {
  agencyName: string;
  sector: string;
  score: number;
}

interface TopBottomAgenciesProps {
  topAgencies: Agency[];
  bottomAgencies: Agency[];
}

export default function TopBottomAgencies({ topAgencies, bottomAgencies }: TopBottomAgenciesProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Top & Bottom Performing Agencies</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Agencies */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">🏆 Top 5 Agencies</h3>
          {topAgencies.length === 0 ? (
            <p className="text-gray-500 text-sm">No data available</p>
          ) : (
            <div className="space-y-2">
              {topAgencies.map((agency, index) => (
                <div key={agency.agencyName} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-gray-500 mr-2 w-6">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{agency.agencyName}</div>
                      <div className="text-xs text-gray-500">{agency.sector}</div>
                    </div>
                  </div>
                  <span className={`font-medium ${getScoreColor(agency.score)}`}>
                    {agency.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Agencies */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">⚠️ Bottom 5 Agencies</h3>
          {bottomAgencies.length === 0 ? (
            <p className="text-gray-500 text-sm">No data available</p>
          ) : (
            <div className="space-y-2">
              {bottomAgencies.map((agency, index) => (
                <div key={agency.agencyName} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-gray-500 mr-2 w-6">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{agency.agencyName}</div>
                      <div className="text-xs text-gray-500">{agency.sector}</div>
                    </div>
                  </div>
                  <span className={`font-medium ${getScoreColor(agency.score)}`}>
                    {agency.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
