// frontend/src/services/configService.ts - FULL UPDATED VERSION
import type { 
  IndicatorDefinition, 
  FormTemplate, 
  ConfigurationVersion,
  IntegrityThresholds,
  ValidationResult,
  ApiResponse,
  CreateIndicatorInput,
  UpdateIndicatorInput
} from '../types/config';

import { API_BASE } from '../config';

// Helper: convert camelCase <-> snake_case
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

class ConfigService {
  // ----------------------
  // SYSTEM CONFIG
  // ----------------------
  async getSystemConfig(): Promise<ApiResponse<IntegrityThresholds>> {
    const response = await fetch(`${API_BASE}/api/admin/config`);
    const data = await response.json();
    if (data.success && data.data) data.data = toCamelCase(data.data);
    return data;
  }

  async updateSystemConfig(config: IntegrityThresholds): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/api/admin/config`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(config))
    });
    return response.json();
  }

  // ----------------------
  // INDICATOR MANAGEMENT
  // ----------------------
  async getIndicators(params?: {
    category?: string;
    activeOnly?: boolean;
    includeParameters?: boolean;
    includeRules?: boolean;
    search?: string;
  }): Promise<ApiResponse<IndicatorDefinition[]>> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.activeOnly !== undefined) queryParams.append('active_only', String(params.activeOnly));
    if (params?.includeParameters !== undefined) queryParams.append('include_parameters', String(params.includeParameters));
    if (params?.includeRules !== undefined) queryParams.append('include_rules', String(params.includeRules));
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(`${API_BASE}/api/indicator-config?${queryParams}`);
    const data = await response.json();
    if (data.success && data.data) data.data = data.data.map(toCamelCase);
    return data;
  }

  async getIndicator(id: string): Promise<ApiResponse<IndicatorDefinition>> {
    const response = await fetch(`${API_BASE}/api/indicator-config/${id}`);
    const data = await response.json();
    if (data.success && data.data) data.data = toCamelCase(data.data);
    return data;
  }

  async createIndicator(indicator: CreateIndicatorInput): Promise<ApiResponse<IndicatorDefinition>> {
    const response = await fetch(`${API_BASE}/api/indicator-config`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(indicator))
    });
    const data = await response.json();
    if (data.success && data.data) data.data = toCamelCase(data.data);
    return data;
  }

  async updateIndicator(id: string, updates: UpdateIndicatorInput): Promise<ApiResponse<IndicatorDefinition>> {
    const response = await fetch(`${API_BASE}/api/indicator-config/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(updates))
    });
    const data = await response.json();
    if (data.success && data.data) data.data = toCamelCase(data.data);
    return data;
  }

  async deleteIndicator(id: string, hardDelete: boolean = false): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/api/indicator-config/${id}?hard_delete=${hardDelete}`, { method: 'DELETE' });
    return response.json();
  }

  async reorderIndicators(category: string, orderedIds: string[]): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/api/indicator-config/category/${category}/reorder`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds })
    });
    return response.json();
  }

  async validateIndicator(indicator: Partial<IndicatorDefinition>): Promise<ApiResponse<ValidationResult>> {
    const response = await fetch(`${API_BASE}/api/indicator-config/validate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(indicator))
    });
    const data = await response.json();
    if (data.success && data.data) data.data = toCamelCase(data.data);
    return data;
  }

  async getCompleteConfiguration(): Promise<ApiResponse<IndicatorDefinition[]>> {
    const response = await fetch(`${API_BASE}/api/indicator-config/complete`);
    const data = await response.json();
    if (data.success && data.data) data.data = data.data.map(toCamelCase);
    return data;
  }

  // ----------------------
  // FORM TEMPLATES
  // ----------------------
  async getFormTemplates(params?: { category?: string; activeOnly?: boolean }): Promise<ApiResponse<FormTemplate[]>> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.activeOnly !== undefined) query.append('active_only', String(params.activeOnly));

    const response = await fetch(`${API_BASE}/api/form-templates?${query}`);
    const data = await response.json();
    if (data.success && data.data) data.data = data.data.map(toCamelCase);
    return data;
  }

  async createFormTemplate(template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<ApiResponse<FormTemplate>> {
    const response = await fetch(`${API_BASE}/api/form-templates`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(template))
    });
    const data = await response.json();
    if (data.success && data.data) data.data = toCamelCase(data.data);
    return data;
  }

  async updateFormTemplate(id: string, updates: Partial<FormTemplate>): Promise<ApiResponse<FormTemplate>> {
    const response = await fetch(`${API_BASE}/api/form-templates/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(updates))
    });
    const data = await response.json();
    if (data.success && data.data) data.data = toCamelCase(data.data);
    return data;
  }

  async deleteFormTemplate(id: string, hardDelete: boolean = false): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/api/form-templates/${id}?hard_delete=${hardDelete}`, { method: 'DELETE' });
    return response.json();
  }

  // ----------------------
  // CONFIGURATION VERSIONS
  // ----------------------
  async getConfigurationVersions(): Promise<ApiResponse<ConfigurationVersion[]>> {
    const response = await fetch(`${API_BASE}/api/config/versions`);
    const data = await response.json();
    if (data.success && data.data) data.data = data.data.map(toCamelCase);
    return data;
  }

  async createConfigurationVersion(version: Omit<ConfigurationVersion, 'id' | 'createdAt' | 'appliedAt' | 'appliedBy'>): Promise<ApiResponse<ConfigurationVersion>> {
    const response = await fetch(`${API_BASE}/api/config/versions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(version))
    });
    const data = await response.json();
    if (data.success && data.data) data.data = toCamelCase(data.data);
    return data;
  }

  async applyConfigurationVersion(versionId: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/api/config/versions/${versionId}/apply`, { method: 'PUT' });
    return response.json();
  }

  // ----------------------
  // ASSESSMENT METHODS
  // ----------------------
  async saveIndicatorAssessment(data: SaveIndicatorAssessmentRequest): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/api/agency/save`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(data))
    });
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }

  async saveAllAssessments(data: SaveAllAssessmentsRequest): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/api/agency/save-all`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(data))
    });
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }

  async calculateIndicatorScore(data: CalculateScoreRequest): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/api/agency/calculate-score`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSnakeCase(data))
    });
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }

  async getAssessmentProgress(agencyId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/api/agency/progress/${agencyId}`);
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }

  async getFullAssessment(agencyId: string, fiscalYear?: string): Promise<ApiResponse<any>> {
    const query = new URLSearchParams();
    if (fiscalYear) query.append('fy', fiscalYear);
    const response = await fetch(`${API_BASE}/api/agency/full/${agencyId}?${query}`);
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }

  async getAssessmentStats(agencyId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/api/agency/stats/${agencyId}`);
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }

  async submitAssessment(agencyId: string, submittedAt?: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/api/agency/submit`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agency_id: agencyId, submitted_at: submittedAt || new Date().toISOString() })
    });
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }

  async validateAssessment(agencyId: string, validatedBy?: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/api/agency/validate/${agencyId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validated_by: validatedBy || 'system' })
    });
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }

  async finalizeAssessment(agencyId: string, finalizedBy: string, finalizationNotes?: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/api/agency/finalize/${agencyId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalized_by: finalizedBy, finalization_notes: finalizationNotes || '' })
    });
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }

  async unlockAssessment(agencyId: string, unlockedBy: string, reason?: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/api/agency/unlock/${agencyId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unlocked_by: unlockedBy, reason: reason || 'Officer requested unlock' })
    });
    const result = await response.json();
    if (result.success && result.data) result.data = toCamelCase(result.data);
    return result;
  }
}

export const configService = new ConfigService();