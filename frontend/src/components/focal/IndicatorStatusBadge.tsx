// frontend/src/components/focal/IndicatorStatusBadge.tsx
interface IndicatorStatusBadgeProps {
  indicatorNumber: number;
  isCompleted: boolean;
  hasEvidence: boolean;
  isEditable: boolean;
}

export default function IndicatorStatusBadge({
  indicatorNumber,
  isCompleted,
  hasEvidence,
  isEditable
}: IndicatorStatusBadgeProps) {
  // Now we actually USE indicatorNumber in the display
  const indicatorLabel = `Indicator ${indicatorNumber}`;

  if (isEditable) {
    if (isCompleted) {
      return (
        <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
          {indicatorLabel} Completed
        </div>
      );
    } else {
      return (
        <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
          {indicatorLabel} Not Started
        </div>
      );
    }
  } else {
    if (hasEvidence) {
      return (
        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
          {indicatorLabel} Evidence Uploaded
        </div>
      );
    } else {
      return (
        <div className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
          {indicatorLabel} No Evidence
        </div>
      );
    }
  }
}