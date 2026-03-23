// frontend/src/pages/prevention/components/AgenciesTable.tsx - COMPLETE FIXED VERSION
import React, { useState } from 'react';

import { 
  EyeIcon, 
  PencilIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface AgencyItem {
  id: string;
  name: string;
  sector: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FINALIZED' | 'DRAFT' | 'SUBMITTED' | 'VALIDATED';
  score?: number;
  last_updated?: string;
  officer_remarks?: string;
  assigned_officer?: string;
  fiscal_year?: string;
  progress?: number;
  riskLevel?: 'Low' | 'Medium' | 'High';
}

interface AgenciesTableProps {
  agencies: AgencyItem[];
  onViewAgency: (agencyId: string) => void;
  onFinalizeAssessment?: (agencyId: string) => void;
  onUnlockAssessment?: (agencyId: string) => void;
  onViewReport?: (agencyId: string) => void; // ADD THIS NEW PROP
}

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    FINALIZED: 'bg-green-100 text-green-800',
    SUBMITTED: 'bg-purple-100 text-purple-800',
    VALIDATED: 'bg-indigo-100 text-indigo-800',
    AWAITING_VALIDATION: 'bg-blue-100 text-blue-800'
  };
  
  const displayText: Record<string, string> = {
    NOT_STARTED: 'Not Started',
    DRAFT: 'Draft',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    FINALIZED: 'Finalized',
    SUBMITTED: 'Submitted',
    VALIDATED: 'Validated',
    AWAITING_VALIDATION: 'Awaiting Validation'
  };
  
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100'}`}>
      {displayText[status] || status.replace('_', ' ')}
    </span>
  );
};

const riskLevelColor = (level?: string) => {
  const colors: Record<string, string> = {
    Low: 'text-green-600 bg-green-50',
    Medium: 'text-amber-600 bg-amber-50',
    High: 'text-red-600 bg-red-50'
  };
  return colors[level || 'Medium'] || 'text-gray-600 bg-gray-50';
};

export default function AgenciesTable({ 
  agencies, 
  onViewAgency, 
  onFinalizeAssessment, 
  onUnlockAssessment,
  onViewReport // ADD THIS
}: AgenciesTableProps) {
  
  const [expandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'status' | 'score' | 'last_updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sort agencies
  const sortedAgencies = [...agencies].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'score':
        aValue = a.score || 0;
        bValue = b.score || 0;
        break;
      case 'last_updated':
        aValue = new Date(a.last_updated || 0).getTime();
        bValue = new Date(b.last_updated || 0).getTime();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getProgress = (agency: AgencyItem) => {
    if (agency.progress !== undefined) return agency.progress;
    if (agency.status === 'FINALIZED' || agency.status === 'VALIDATED') return 100;
    if (agency.status === 'COMPLETED') return 100;
    if (agency.status === 'IN_PROGRESS' || agency.status === 'DRAFT') return 50;
    if (agency.status === 'NOT_STARTED') return 0;
    return 0;
  };

  const getActionButton = (agency: AgencyItem) => {
    switch (agency.status) {
      case 'FINALIZED':
      case 'VALIDATED':
        return (
          <div className="flex space-x-2">
            {/* FIXED: Use onViewReport for the Report button */}
            <button
              onClick={() => onViewReport ? onViewReport(agency.id) : onViewAgency(agency.id)}
              className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm"
            >
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              View Report
            </button>
            {onUnlockAssessment && (
              <button
                onClick={() => onUnlockAssessment(agency.id)}
                className="flex items-center px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 text-sm"
              >
                <LockOpenIcon className="h-4 w-4 mr-1" />
                Unlock
              </button>
            )}
          </div>
        );
      
      case 'COMPLETED':
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => onViewAgency(agency.id)}
              className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm"
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              Review
            </button>
            {onFinalizeAssessment && (
              <button
                onClick={() => onFinalizeAssessment(agency.id)}
                className="flex items-center px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 text-sm"
              >
                <LockClosedIcon className="h-4 w-4 mr-1" />
                Finalize
              </button>
            )}
          </div>
        );
      
      case 'IN_PROGRESS':
      case 'DRAFT':
        return (
          <button
            onClick={() => onViewAgency(agency.id)}
            className="flex items-center px-3 py-1.5 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 text-sm"
          >
            <PencilIcon className="h-4 w-4 mr-1" />
            Continue
          </button>
        );
      
      case 'NOT_STARTED':
        return (
          <button
            onClick={() => onViewAgency(agency.id)}
            className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm"
          >
            <ArrowRightIcon className="h-4 w-4 mr-1" />
            Start
          </button>
        );
      
      default:
        return (
          <button
            onClick={() => onViewAgency(agency.id)}
            className="flex items-center px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 text-sm"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View
          </button>
        );
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Assigned Agencies</h3>
          <div className="text-sm text-gray-500">
            {sortedAgencies.length} agency{sortedAgencies.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Agency
                  {sortField === 'name' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {sortField === 'status' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('score')}
              >
                <div className="flex items-center">
                  Score
                  {sortField === 'score' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk Level
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('last_updated')}
              >
                <div className="flex items-center">
                  Last Updated
                  {sortField === 'last_updated' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAgencies.map((agency) => (
              <React.Fragment key={agency.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{agency.name}</div>
                    <div className="text-sm text-gray-500">{agency.sector}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {statusBadge(agency.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-semibold text-gray-900">
                      {agency.score !== undefined ? `${agency.score.toFixed(1)}/100` : '--'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className={`h-2 rounded-full ${
                            getProgress(agency) >= 70 ? 'bg-green-600' :
                            getProgress(agency) >= 30 ? 'bg-amber-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${getProgress(agency)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{getProgress(agency)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${riskLevelColor(agency.riskLevel)}`}>
                      {agency.riskLevel || 'Medium'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agency.last_updated ? new Date(agency.last_updated).toLocaleDateString() : '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getActionButton(agency)}
                  </td>
                </tr>
                {expandedRow === agency.id && (
                  <tr className="bg-blue-50">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="text-sm text-gray-700">
                        <div className="font-medium mb-1">Officer Remarks:</div>
                        <p className="mb-3">{agency.officer_remarks || 'No remarks provided.'}</p>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="font-medium">Fiscal Year:</span> {agency.fiscal_year || '--'}
                          </div>
                          <div>
                            <span className="font-medium">Assigned Officer:</span> {agency.assigned_officer || '--'}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {sortedAgencies.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📋</div>
          <p className="text-gray-500">No agencies assigned</p>
          <p className="text-sm text-gray-400 mt-1">Contact your administrator to get assigned agencies</p>
        </div>
      )}
    </div>
  );
}