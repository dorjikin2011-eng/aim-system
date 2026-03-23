// frontend/src/pages/prevention/AgencyAssessment/components/AssessmentHeader.tsx

interface Props {
  agencyName: string;
  sector: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'AWAITING_VALIDATION' | 'FINALIZED';
  fiscalYear: string;
  onBack: () => void;
}

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-800',
    AWAITING_VALIDATION: 'bg-blue-100 text-blue-800',
    FINALIZED: 'bg-green-100 text-green-800'
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function AssessmentHeader({ 
  agencyName, 
  sector, 
  status, 
  fiscalYear,
  onBack 
}: Props) {
  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          
          <h1 className="text-xl font-bold text-gray-900">{agencyName}</h1>
          <p className="text-gray-600">{sector} • FY {fiscalYear}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-sm text-gray-500">Status:</span>
            <div className="mt-1">{statusBadge(status)}</div>
          </div>
          
          {status === 'FINALIZED' && (
            <button className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
              View Final Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}