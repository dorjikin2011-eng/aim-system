// frontend/src/pages/prevention/AgencyAssessment/common/aimsStorage.ts

import type { BaseMeta, EvidenceFile } from './aimsTypes';
import { API_BASE } from '../../../../config';

export interface AssessmentPayload {
  rawData: Record<string, any>;
  evidence: EvidenceFile[];
  score: number;
  meta: BaseMeta;
}

/**
 * Save assessment data to backend
 */
export async function saveAssessment(indicatorId: number, payload: AssessmentPayload): Promise<void> {
  const agencyId = getCurrentAgencyId();
  
  const response = await fetch(`${API_BASE}/api/agency/${agencyId}/assessment/save`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: payload.meta.status,
      officerRemarks: payload.meta.officerRemarks || '',
      indicators: [{
        indicatorNumber: indicatorId,
        score: payload.score,
        evidence_file_paths: payload.evidence.map(f => f.path),
        ...payload.rawData
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save assessment');
  }
}

/**
 * Load assessment data from backend
 */
export async function loadAssessment(indicatorId: number): Promise<AssessmentPayload | null> {
  const agencyId = getCurrentAgencyId();
  
  const response = await fetch(`${API_BASE}/api/agency/${agencyId}/assessment?fy=2024-25`);
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to load assessment');
  }

  const data = await response.json();
  
  // Find the specific indicator
  const indicatorData = data.indicators.find((i: any) => i.indicator_number === indicatorId);
  if (!indicatorData) return null;

  return {
    rawData: {
      // Indicator 1
      systems: indicatorData.systems,
      proactive_measures: indicatorData.proactive_measures,
      // Indicator 2
      completed_training: indicatorData.completed_training,
      total_employees: indicatorData.total_employees,
      // Indicator 3
      submitted_declarations: indicatorData.submitted_declarations,
      covered_officials: indicatorData.covered_officials,
      // Indicator 4
      convictions: indicatorData.convictions,
      prosecutions: indicatorData.prosecutions,
      admin_actions: indicatorData.admin_actions,
      weighted_score: indicatorData.weighted_score,
      // Indicator 5
      timely_atrs: indicatorData.timely_atrs,
      total_atrs: indicatorData.total_atrs
    },
    evidence: (indicatorData.evidence_file_paths || []).map((path: string) => ({
      id: path,
      name: path.split('/').pop() || 'file',
      path: path
    })),
    score: indicatorData.score,
    meta: {
      status: data.status,
      officerRemarks: data.officerRemarks
    }
  };
}

function getCurrentAgencyId(): string {
  // Get from URL: /prevention/agencies/:agencyId/assessment
  const path = window.location.pathname;
  const match = path.match(/\/agencies\/([^\/]+)\/assessment/);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback for testing
  return 'ministry-of-finance';
}