// frontend/src/pages/prevention/components/EmptyStates.tsx

interface Props {
  fy: string;
  state: 'NO_ASSIGNMENTS' | 'ALL_FINALIZED' | 'VALIDATION_PENDING_TOO_LONG';
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyStates({ fy, state, title, message, actionText, onAction }: Props) {
  if (state === 'NO_ASSIGNMENTS') {
    const displayTitle = title || 'No Assignments';
    const displayMessage = message || `You have not been assigned any agencies for FY ${fy}.`;
    
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <div className="text-gray-400 text-5xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-gray-900">{displayTitle}</h3>
        <p className="mt-2 text-gray-500">{displayMessage}</p>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            {actionText}
          </button>
        )}
      </div>
    );
  }

  if (state === 'ALL_FINALIZED') {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <div className="text-green-400 text-5xl mb-4">🎉</div>
        <h3 className="text-lg font-medium text-gray-900">All Finalized!</h3>
        <p className="mt-2 text-gray-500">All assigned agencies finalized for FY {fy}</p>
      </div>
    );
  }

  if (state === 'VALIDATION_PENDING_TOO_LONG') {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
        <div className="flex">
          <span className="text-yellow-600 mr-2">⚠️</span>
          <div>
            <p className="text-yellow-800">
              Validation pending for over 14 days. Please follow up with agencies.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}