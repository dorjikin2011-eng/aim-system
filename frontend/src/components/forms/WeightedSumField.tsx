import { CalculatorIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface WeightedSumFieldProps {
  convictions: number;
  prosecutions: number;
  adminActions: number;
  points: number;
  description: string;
}

export default function WeightedSumField({
  convictions,
  prosecutions,
  adminActions,
  points,
  description
}: WeightedSumFieldProps) {
  // Calculate weighted sum internally
  const calculatedWeightedSum = (convictions * 3) + (prosecutions * 2) + (adminActions * 1);
  
  // Determine color based on points
  let colorClass = 'text-gray-700';
  let bgClass = 'bg-gray-50';
  const percentage = points > 0 ? (points / 20) * 100 : 0;
  
  if (percentage >= 80) {
    colorClass = 'text-green-700';
    bgClass = 'bg-green-50';
  } else if (percentage >= 50) {
    colorClass = 'text-yellow-700';
    bgClass = 'bg-yellow-50';
  } else if (percentage > 0) {
    colorClass = 'text-orange-700';
    bgClass = 'bg-orange-50';
  } else {
    colorClass = 'text-red-700';
    bgClass = 'bg-red-50';
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <CalculatorIcon className="h-5 w-5 text-blue-600 mr-2" />
          <h4 className="font-medium text-blue-900">Case Severity Weighted Sum</h4>
        </div>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          Auto-calculated
        </span>
      </div>

      {/* Calculation Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-600 mb-1">Convictions</div>
          <div className="text-lg font-semibold text-gray-900">{convictions}</div>
          <div className="text-xs text-gray-500">× 3 = {(convictions * 3)}</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-600 mb-1">Prosecutions</div>
          <div className="text-lg font-semibold text-gray-900">{prosecutions}</div>
          <div className="text-xs text-gray-500">× 2 = {(prosecutions * 2)}</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-600 mb-1">Admin Actions</div>
          <div className="text-lg font-semibold text-gray-900">{adminActions}</div>
          <div className="text-xs text-gray-500">× 1 = {(adminActions * 1)}</div>
        </div>
      </div>

      {/* Weighted Sum Display */}
      <div className={`p-4 ${bgClass} rounded-lg border border-blue-200 mb-4`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-medium text-blue-900 mb-1">Weighted Sum</div>
            <div className="text-2xl font-bold text-blue-700">{calculatedWeightedSum}</div>
            <div className="text-xs text-blue-600 mt-1">
              Formula: (Convictions × 3) + (Prosecutions × 2) + (Admin Actions × 1)
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-blue-900 mb-1">Score</div>
            <div className={`text-2xl font-bold ${colorClass}`}>{points} points</div>
            <div className="text-xs text-gray-600 mt-1">out of 20</div>
          </div>
        </div>
      </div>

      {/* Scoring Rules */}
      <div className="mb-4">
        <div className="text-sm font-medium text-blue-900 mb-2">Scoring Rules:</div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center p-2 bg-green-50 border border-green-200 rounded">
            <div className="font-medium text-green-800">0 cases</div>
            <div className="text-green-700">20 points</div>
            <div className="text-green-600">Excellent</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="font-medium text-yellow-800">1-2 cases</div>
            <div className="text-yellow-700">10 points</div>
            <div className="text-yellow-600">Good</div>
          </div>
          <div className="text-center p-2 bg-orange-50 border border-orange-200 rounded">
            <div className="font-medium text-orange-800">3-4 cases</div>
            <div className="text-orange-700">5 points</div>
            <div className="text-orange-600">Fair</div>
          </div>
          <div className="text-center p-2 bg-red-50 border border-red-200 rounded">
            <div className="font-medium text-red-800">≥5 cases</div>
            <div className="text-red-700">0 points</div>
            <div className="text-red-600">Poor</div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      {description && (
        <div className="p-3 bg-white border border-blue-200 rounded">
          <div className="flex items-center">
            <InformationCircleIcon className="h-4 w-4 text-blue-600 mr-2" />
            <div className="text-sm text-blue-800">
              <strong>Current:</strong> {description}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <div className="text-sm text-yellow-800">
          <strong>Auto-calculated field</strong>
        </div>
        <div className="text-xs text-yellow-700 mt-1">
          This score is automatically calculated based on the weighted severity of corruption cases.
        </div>
      </div>
    </div>
  );
}