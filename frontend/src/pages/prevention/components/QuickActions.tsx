// frontend/src/pages/prevention/components/QuickActions.tsx - COMPLETE UPDATED VERSION
import { Link } from 'react-router-dom';
import { 
 
  PencilIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface AgencyItem {
  id: string;
  name: string;
  status: string;
  score?: number;
  last_updated?: string;
}

interface QuickActionsProps {
  onViewAgency?: (agencyId: string) => void;
  onFinalizeAssessment?: (agencyId: string) => void;
  onUnlockAssessment?: (agencyId: string) => void;
  agencies?: AgencyItem[];
}

export default function QuickActions({ 
  onViewAgency, 
  onFinalizeAssessment, 
  onUnlockAssessment, 
  agencies = [] 
}: QuickActionsProps) {
  
  // Get agencies that need attention
  const draftAgencies = agencies.filter(a => a.status === 'DRAFT' || a.status === 'IN_PROGRESS');
  const readyToFinalize = agencies.filter(a => 
    a.status === 'COMPLETED' || 
    a.status === 'IN_PROGRESS' || 
    (a.score && a.score > 0)
  );
  const finalizedAgencies = agencies.filter(a => a.status === 'FINALIZED');

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {agencies.length} agencies assigned
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Continue Assessment */}
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
          <div className="flex items-start mb-3">
            <div className="p-2 bg-blue-100 rounded-md">
              <PencilIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h4 className="font-medium text-gray-900">Continue Assessment</h4>
              <p className="text-sm text-gray-600 mt-1">
                {draftAgencies.length > 0 
                  ? `${draftAgencies.length} draft assessment(s)`
                  : 'No draft assessments'
                }
              </p>
            </div>
          </div>
          {draftAgencies.length > 0 ? (
            <div className="space-y-2">
              {draftAgencies.slice(0, 2).map(agency => (
                <button
                  key={agency.id}
                  onClick={() => onViewAgency?.(agency.id)}
                  className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md flex justify-between items-center"
                >
                  <span className="truncate">{agency.name}</span>
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                    {agency.status}
                  </span>
                </button>
              ))}
              {draftAgencies.length > 2 && (
                <div className="text-xs text-gray-500 text-center">
                  +{draftAgencies.length - 2} more
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">All assessments are up to date</p>
          )}
        </div>

        {/* Finalize Assessments */}
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-green-50 transition-colors">
          <div className="flex items-start mb-3">
            <div className="p-2 bg-green-100 rounded-md">
              <LockClosedIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <h4 className="font-medium text-gray-900">Finalize Assessments</h4>
              <p className="text-sm text-gray-600 mt-1">
                {readyToFinalize.length > 0
                  ? `${readyToFinalize.length} ready to finalize`
                  : 'No assessments ready'
                }
              </p>
            </div>
          </div>
          {readyToFinalize.length > 0 ? (
            <div className="space-y-2">
              {readyToFinalize.slice(0, 2).map(agency => (
                <button
                  key={agency.id}
                  onClick={() => onFinalizeAssessment?.(agency.id)}
                  className="w-full text-left px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-md flex justify-between items-center"
                >
                  <span className="truncate">{agency.name}</span>
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                    Score: {agency.score || 0}
                  </span>
                </button>
              ))}
              {readyToFinalize.length > 2 && (
                <div className="text-xs text-gray-500 text-center">
                  +{readyToFinalize.length - 2} more
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Complete assessments first</p>
          )}
        </div>

        {/* Unlock Assessments */}
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-yellow-50 transition-colors">
          <div className="flex items-start mb-3">
            <div className="p-2 bg-yellow-100 rounded-md">
              <LockOpenIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <h4 className="font-medium text-gray-900">Unlock Assessments</h4>
              <p className="text-sm text-gray-600 mt-1">
                {finalizedAgencies.length > 0
                  ? `${finalizedAgencies.length} finalized`
                  : 'No finalized assessments'
                }
              </p>
            </div>
          </div>
          {finalizedAgencies.length > 0 ? (
            <div className="space-y-2">
              {finalizedAgencies.slice(0, 2).map(agency => (
                <button
                  key={agency.id}
                  onClick={() => onUnlockAssessment?.(agency.id)}
                  className="w-full text-left px-3 py-2 text-sm bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-md flex justify-between items-center"
                >
                  <span className="truncate">{agency.name}</span>
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                    Finalized
                  </span>
                </button>
              ))}
              {finalizedAgencies.length > 2 && (
                <div className="text-xs text-gray-500 text-center">
                  +{finalizedAgencies.length - 2} more
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Finalize assessments first</p>
          )}
        </div>

        {/* Generate Reports */}
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-purple-50 transition-colors">
          <div className="flex items-start mb-3">
            <div className="p-2 bg-purple-100 rounded-md">
              <DocumentTextIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <h4 className="font-medium text-gray-900">Generate Reports</h4>
              <p className="text-sm text-gray-600 mt-1">
                PDF reports for agencies
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Link
              to="/prevention/reports/overall"
              className="block w-full text-left px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md"
            >
              Overall Report
            </Link>
            <div className="relative">
              <select 
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    window.location.href = `/prevention/reports/agency/${e.target.value}`;
                  }
                }}
              >
                <option value="" disabled>Agency Report...</option>
                {agencies.map(agency => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
            <span className="text-gray-700">Draft/In Progress:</span>
            <span className="font-medium ml-1">{draftAgencies.length}</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            <span className="text-gray-700">Ready to Finalize:</span>
            <span className="font-medium ml-1">{readyToFinalize.length}</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
            <span className="text-gray-700">Finalized:</span>
            <span className="font-medium ml-1">{finalizedAgencies.length}</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
            <span className="text-gray-700">Reports Available:</span>
            <span className="font-medium ml-1">{finalizedAgencies.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
