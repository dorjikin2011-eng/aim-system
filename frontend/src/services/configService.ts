// frontend/src/services/configService.ts
import type { 
  IndicatorDefinition, 
  FormTemplate, 
  ConfigurationVersion,
  IntegrityThresholds,
  CreateIndicatorInput,
  UpdateIndicatorInput,
  ApiResponse
} from '../types/config';

import { API_BASE } from '../config';

// ---------------------------
// Helpers: convert camelCase <-> snake_case
// ---------------------------
const toSnakeCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = toSnakeCase(value);
  }
  return result;
};

const toCamelCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = toCamelCase(value);
  }
  return result;
};

// ---------------------------
// Generic API Call Helper
// ---------------------------
// This helper ensures the /api prefix is ALWAYS included and uses absolute URLs
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  // 1. Clean the base URL (remove trailing slash)
  const base = API_BASE.replace(/\/$/, '');
  
  // 2. Clean the endpoint (ensure it starts with / and doesn't double up /api)
  let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!path.startsWith('/api')) {
    path = `/api${path}`;
  }

  const url = `${base}${path}`;
  
  console.log(`🚀 ConfigService calling: ${url}`);

  const response = await fetch(url, { 
    credentials: 'include', 
    ...options 
  });

  // Handle potential non-JSON responses (like HTML error pages) gracefully
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('❌ Failed to parse JSON response. Received:', text.substring(0, 100));
    throw new Error('Invalid server response. Please check if the backend is reachable.');
  }

  if (data.success && data.data) {
    data.data = toCamelCase(data.data);
  }
  return data;
};

// ---------------------------
// Types for Assessment Methods
// ---------------------------
interface SaveIndicatorAssessmentRequest {
  agencyId: string;
  indicatorId: string;
  responseData: Record<string, any>;
  score?: number;
  templateId?: string;
}

interface SaveAllAssessmentsRequest {
  agencyId: string;
  indicatorScores: Record<string, number>;
  responseData?: Record<string, any>;
  status: string;
}

interface CalculateScoreRequest {
  indicatorId: string;
  responseData: Record<string, any>;
  templateId?: string;
}

// ---------------------------
// ConfigService Class
// ---------------------------
class ConfigService {
  // ----------------------
  // SYSTEM CONFIG
  // ----------------------
  getSystemConfig(): Promise<ApiResponse<IntegrityThresholds>> { 
    return apiCall('/admin/config'); 
  }
  
  updateSystemConfig(config: IntegrityThresholds): Promise<ApiResponse> {
    return apiCall('/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(config))
    });
  }

  // ----------------------
  // INDICATOR MANAGEMENT
  // ----------------------
  getIndicators(params?: {
    category?: string;
    activeOnly?: boolean;
    includeParameters?: boolean;
    includeRules?: boolean;
    search?: string;
  }): Promise<ApiResponse<IndicatorDefinition[]>> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.activeOnly !== undefined) query.append('active_only', String(params.activeOnly));
    if (params?.includeParameters !== undefined) query.append('include_parameters', String(params.includeParameters));
    if (params?.includeRules !== undefined) query.append('include_rules', String(params.includeRules));
    if (params?.search) query.append('search', params.search);
    return apiCall(`/indicator-config?${query}`);
  }

  getIndicator(id: string): Promise<ApiResponse<IndicatorDefinition>> { 
    return apiCall(`/indicator-config/${id}`); 
  }

  createIndicator(indicator: CreateIndicatorInput): Promise<ApiResponse<IndicatorDefinition>> {
    return apiCall('/indicator-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(indicator))
    });
  }

  updateIndicator(id: string, updates: UpdateIndicatorInput): Promise<ApiResponse<IndicatorDefinition>> {
    return apiCall(`/indicator-config/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(updates))
    });
  }

  deleteIndicator(id: string, hardDelete: boolean = false): Promise<ApiResponse> {
    return apiCall(`/indicator-config/${id}?hard_delete=${hardDelete}`, { method: 'DELETE' });
  }

  reorderIndicators(category: string, orderedIds: string[]): Promise<ApiResponse> {
    return apiCall(`/indicator-config/category/${category}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds })
    });
  }

  validateIndicator(indicator: Partial<IndicatorDefinition>): Promise<ApiResponse> {
    return apiCall('/indicator-config/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(indicator))
    });
  }

  getCompleteConfiguration(): Promise<ApiResponse<IndicatorDefinition[]>> { 
    return apiCall('/indicator-config/complete'); 
  }

  // ----------------------
  // FORM TEMPLATES
  // ----------------------
  getFormTemplates(params?: { category?: string; activeOnly?: boolean }): Promise<ApiResponse<FormTemplate[]>> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.activeOnly !== undefined) query.append('active_only', String(params.activeOnly));
    return apiCall(`/form-templates?${query}`);
  }

  createFormTemplate(template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<ApiResponse<FormTemplate>> {
    return apiCall('/form-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(template))
    });
  }

  updateFormTemplate(id: string, updates: Partial<FormTemplate>): Promise<ApiResponse<FormTemplate>> {
    return apiCall(`/form-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(updates))
    });
  }

  deleteFormTemplate(id: string, hardDelete: boolean = false): Promise<ApiResponse> {
    return apiCall(`/form-templates/${id}?hard_delete=${hardDelete}`, { method: 'DELETE' });
  }

  // ----------------------
  // CONFIGURATION VERSIONS
  // ----------------------
  getConfigurationVersions(): Promise<ApiResponse<ConfigurationVersion[]>> { 
    return apiCall('/config/versions'); 
  }

  createConfigurationVersion(version: Omit<ConfigurationVersion, 'id' | 'createdAt' | 'appliedAt' | 'appliedBy'>): Promise<ApiResponse<ConfigurationVersion>> {
    return apiCall('/config/versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(version))
    });
  }

  applyConfigurationVersion(versionId: string): Promise<ApiResponse> {
    return apiCall(`/config/versions/${versionId}/apply`, { method: 'PUT' });
  }

  // ----------------------
  // ASSESSMENT METHODS
  // ----------------------
  saveIndicatorAssessment(data: SaveIndicatorAssessmentRequest): Promise<ApiResponse<any>> {
    return apiCall('/agency/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(data))
    });
  }

  saveAllAssessments(data: SaveAllAssessmentsRequest): Promise<ApiResponse<any>> {
    return apiCall('/agency/save-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(data))
    });
  }

  calculateIndicatorScore(data: CalculateScoreRequest): Promise<ApiResponse<any>> {
    return apiCall('/agency/calculate-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(data))
    });
  }

  getAssessmentProgress(agencyId: string): Promise<ApiResponse<any>> { 
    return apiCall(`/agency/progress/${agencyId}`); 
  }
  
  getFullAssessment(agencyId: string, fiscalYear?: string): Promise<ApiResponse<any>> {
    const query = fiscalYear ? `?fy=${fiscalYear}` : '';
    return apiCall(`/agency/full/${agencyId}${query}`);
  }
  
  getAssessmentStats(agencyId: string): Promise<ApiResponse<any>> { 
    return apiCall(`/agency/stats/${agencyId}`); 
  }

  submitAssessment(agencyId: string, submittedAt?: string): Promise<ApiResponse<any>> {
    return apiCall('/agency/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agency_id: agencyId, submitted_at: submittedAt || new Date().toISOString() })
    });
  }

  validateAssessment(agencyId: string, validatedBy?: string): Promise<ApiResponse<any>> {
    return apiCall(`/agency/validate/${agencyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validated_by: validatedBy || 'system' })
    });
  }

  finalizeAssessment(agencyId: string, finalizedBy: string, finalizationNotes?: string): Promise<ApiResponse<any>> {
    return apiCall(`/agency/finalize/${agencyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalized_by: finalizedBy, finalization_notes: finalizationNotes || '' })
    });
  }

  unlockAssessment(agencyId: string, unlockedBy: string, reason?: string): Promise<ApiResponse<any>> {
    return apiCall(`/agency/unlock/${agencyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unlocked_by: unlockedBy, reason: reason || 'Officer requested unlock' })
    });
  }
}

// ---------------------------
// Export singleton
// ---------------------------
export const configService = new ConfigService();
