interface WorkflowItem {
  status: string;
  count: number;
  rawStatus: string;
}

interface WorkflowStatusProps {
  workflowData: WorkflowItem[];
}

export default function WorkflowStatus({ workflowData }: WorkflowStatusProps) {
  const getStatusColor = (rawStatus: string) => {
    switch (rawStatus) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED_TO_HOA':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETURNED_BY_HOA':
        return 'bg-red-100 text-red-800';
      case 'SUBMITTED_TO_ACC':
        return 'bg-blue-100 text-blue-800';
      case 'UNDER_REVIEW_BY_ACC':
        return 'bg-purple-100 text-purple-800';
      case 'AWAITING_VALIDATION':
        return 'bg-orange-100 text-orange-800';
      case 'FINALIZED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const total = workflowData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Workflow Status Overview</h2>
      
      {workflowData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No workflow data available
        </div>
      ) : (
        <div className="space-y-3">
          {workflowData.map((item) => {
            const percentage = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.rawStatus} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.rawStatus)}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            );
          })}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-right">
              Total submissions: {total}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
