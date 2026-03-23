// frontend/src/pages/prevention/components/EmptyStates.tsx

interface Props {
  fy: string;
  state: 'NO_ASSIGNMENTS' | 'ALL_FINALIZED' | 'VALIDATION_PENDING_TOO_LONG';
}

export default function EmptyStates({ fy, state }: Props) {
  if (state === 'NO_ASSIGNMENTS') {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-5xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-gray-900">No Assignments</h3>
        <p className="mt-2 text-gray-500">You have not been assigned any agencies for this FY.</p>
      </div>
    );
  }

  if (state === 'ALL_FINALIZED') {
    return (
      <div className="text-center py-12">
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