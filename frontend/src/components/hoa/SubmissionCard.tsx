import { useState } from 'react';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Indicator {
  indicator_number: number;
  score: number;
  evidence_file_paths: string;
}

interface SubmissionCardProps {
  assessmentId: string;
  status: string;
  focalName: string;
  focalEmail: string;
  updatedAt: string;
  indicators: Indicator[];
  onApprove: (assessmentId: string) => void;
  onReturn: (assessmentId: string, remarks: string) => void;
  onValidate: (assessmentId: string) => void;
}

export default function SubmissionCard({
  assessmentId,
  status,
  focalName,
  focalEmail,
  updatedAt,
  indicators,
  onApprove,
  onReturn,
  onValidate
}: SubmissionCardProps) {
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove(assessmentId);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidate = async () => {
    setSubmitting(true);
    try {
      await onValidate(assessmentId);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnRemarks.trim()) return;
    
    setSubmitting(true);
    try {
      await onReturn(assessmentId, returnRemarks);
      setShowReturnForm(false);
      setReturnRemarks('');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'SUBMITTED_TO_HOA':
        return 'bg-yellow-100 text-yellow-800';
      case 'AWAITING_VALIDATION':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'SUBMITTED_TO_HOA':
        return 'Submitted by Focal Official';
      case 'AWAITING_VALIDATION':
        return 'Ready for Final Validation';
      default:
        return status;
    }
  };

  // Calculate total score from indicators
  const totalScore = indicators.reduce((sum, ind) => sum + ind.score, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Submission from {focalName}
          </h3>
          <p className="text-sm text-gray-600">{focalEmail}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Score Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total Score:</span>
          <span className="text-xl font-bold text-blue-600">{totalScore}/100</span>
        </div>
      </div>

      {/* Indicator Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        {indicators.map((indicator) => {
          const hasEvidence = indicator.evidence_file_paths && 
            JSON.parse(indicator.evidence_file_paths).length > 0;
          return (
            <div key={indicator.indicator_number} className="text-center">
              <div className="text-sm font-medium">Ind {indicator.indicator_number}</div>
              <div className="text-xs text-gray-600">{indicator.score} pts</div>
              {hasEvidence && (
                <div className="text-green-600 text-xs">✓ Evidence</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      {!showReturnForm ? (
        <div className="flex justify-end space-x-3">
          {status === 'SUBMITTED_TO_HOA' && (
            <>
              <button
                onClick={() => setShowReturnForm(true)}
                disabled={submitting}
                className="px-3 py-1.5 border border-red-600 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
              >
                Return to Focal
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {submitting ? 'Processing...' : 'Approve & Send to ACC'}
                <CheckIcon className="h-4 w-4 ml-1" />
              </button>
            </>
          )}
          
          {status === 'AWAITING_VALIDATION' && (
            <button
              onClick={handleValidate}
              disabled={submitting}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {submitting ? 'Validating...' : 'Validate Final Score'}
              <CheckIcon className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleReturnSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Remarks for Focal Official
          </label>
          <textarea
            value={returnRemarks}
            onChange={(e) => setReturnRemarks(e.target.value)}
            required
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            placeholder="Please specify what needs to be corrected or improved..."
          />
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowReturnForm(false)}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !returnRemarks.trim()}
              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              {submitting ? 'Returning...' : 'Return Submission'}
              <ArrowPathIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
