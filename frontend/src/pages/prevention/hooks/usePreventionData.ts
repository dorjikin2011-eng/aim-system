// frontend/src/pages/prevention/hooks/usePreventionData.ts
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../../../config';

interface AgencyItem {
  id: string;
  name: string;
  sector: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'AWAITING_VALIDATION' | 'FINALIZED';
  progress: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  lastUpdated: string;
}

export interface CardData {
  key: string;
  label: string;
  value: number;
}

export function usePreventionData(fiscalYear: string) {
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [summary, setSummary] = useState<CardData[]>([]);
  const [validationRequests, setValidationRequests] = useState<any[]>([]);
  const [riskIndicators, setRiskIndicators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/prevention/dashboard?fy=${fiscalYear}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const data = await response.json();
      
      // Map backend data to frontend format
      const mappedAgencies = data.agencies.map((agency: any) => ({
        id: agency.id,
        name: agency.name,
        sector: agency.sector,
        status: mapBackendStatus(agency.status),
        progress: agency.progress || 0,
        riskLevel: agency.riskLevel || 'Low',
        lastUpdated: agency.lastUpdated || new Date().toLocaleDateString('en-GB')
      }));

      setAgencies(mappedAgencies);
      
      // Calculate summary stats
      const total = mappedAgencies.length;
      const notStarted = mappedAgencies.filter((a: AgencyItem) => a.status === 'NOT_STARTED').length;
      const inProgress = mappedAgencies.filter((a: AgencyItem) => a.status === 'IN_PROGRESS').length;
      const awaitingValidation = mappedAgencies.filter((a: AgencyItem) => a.status === 'AWAITING_VALIDATION').length;
      const finalized = mappedAgencies.filter((a: AgencyItem) => a.status === 'FINALIZED').length;

      setSummary([
        { key: 'TOTAL', label: 'Total Agencies', value: total },
        { key: 'NOT_STARTED', label: 'Not Started', value: notStarted },
        { key: 'IN_PROGRESS', label: 'In Progress', value: inProgress },
        { key: 'AWAITING_VALIDATION', label: 'Awaiting Validation', value: awaitingValidation },
        { key: 'FINALIZED', label: 'Finalized', value: finalized }
      ]);

      // TODO: Implement real validation requests and risk indicators
      setValidationRequests([]);
      setRiskIndicators([]);

      setError(null);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { 
    agencies, 
    summary, 
    validationRequests, 
    riskIndicators, 
    loading, 
    error,
    refetch: fetchData  // ← ADDED: This allows manual refresh of data
  };
}

// Map backend status to frontend status
function mapBackendStatus(status: string): AgencyItem['status'] {
  switch (status) {
    case 'DRAFT':
      return 'IN_PROGRESS';
    case 'SUBMITTED_TO_AGENCY':
      return 'AWAITING_VALIDATION';
    case 'FINALIZED':
      return 'FINALIZED';
    default:
      return 'NOT_STARTED';
  }
}