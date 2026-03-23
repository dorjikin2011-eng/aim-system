// frontend/src/pages/prevention/AgencyAssessment/common/aimsTypes.ts

export type WorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED_TO_AGENCY'
  | 'AWAITING_VALIDATION'  // ✅ Added — used in dashboard logic
  | 'FINALIZED';

export interface EvidenceFile {
  id: string;           // Unique ID (e.g., file path or UUID)
  name: string;         // Display name (e.g., "report.pdf")
  path: string;         // Storage path (used in API/backend)
}

export interface BaseMeta {
  status: WorkflowStatus;
  officerRemarks: string;
  agencyRemarks?: string; // Optional — for future validation feedback
}
