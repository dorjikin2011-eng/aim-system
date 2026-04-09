// frontend/src/services/api.ts

// ✅ Vite-native env access (auto-typed by vite/client)
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-theta-navy-44.vercel.app';

// Helper function for API calls
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    // ✅ Build absolute URL to backend
    const apiPath = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${API_BASE}${apiPath}`;

    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // ✅ Handle 401 for /auth/me specially
    if (endpoint === '/auth/me' && response.status === 401) {
      return { user: null };
    }

    if (response.status === 401) {
      throw new Error('unauthorized');
    }

    // ✅ Safety: Ensure JSON response
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Non-JSON response:', { url, status: response.status, contentType, preview: text.substring(0, 200) });
      throw new Error(`Server returned ${response.status} with content-type: ${contentType}. Expected application/json`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

// ===== CONFIGURATION ENDPOINTS =====

// Get system configuration
export const getSystemConfig = async () => {
  return apiCall('/admin/config');
};

// Get system configuration items
export const getSystemConfigItems = async () => {
  return apiCall('/admin/config/items');
};

// Update system configuration item
export const updateSystemConfigItem = async (key: string, value: string, type: string) => {
  return apiCall(`/admin/config/items/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ configValue: value, configType: type })
  });
};

// Get all indicators with optional filters
export const getIndicators = async (params?: {
  activeOnly?: boolean;
  includeParameters?: boolean;
  includeRules?: boolean;
  category?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.activeOnly) query.append('activeOnly', 'true');
  if (params?.includeParameters) query.append('includeParameters', 'true');
  if (params?.includeRules) query.append('includeRules', 'true');
  if (params?.category) query.append('category', params.category);
  
  return apiCall(`/admin/config/indicators?${query.toString()}`);
};

// Get single indicator
export const getIndicator = async (id: string) => {
  return apiCall(`/admin/config/indicators/${id}`);
};

// Create indicator
export const createIndicator = async (indicator: any) => {
  return apiCall('/admin/config/indicators', {
    method: 'POST',
    body: JSON.stringify(indicator)
  });
};

// Update indicator
export const updateIndicator = async (id: string, updates: any) => {
  return apiCall(`/admin/config/indicators/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

// Delete indicator
export const deleteIndicator = async (id: string) => {
  return apiCall(`/admin/config/indicators/${id}`, {
    method: 'DELETE'
  });
};

// Validate indicator
export const validateIndicator = async (indicator: any) => {
  return apiCall('/admin/config/indicators/validate', {
    method: 'POST',
    body: JSON.stringify(indicator)
  });
};

// Get complete configuration (indicators + templates + rules)
export const getCompleteConfiguration = async () => {
  return apiCall('/admin/config/complete');
};

// Get scoring rules (with optional indicator filter)
export const getScoringRules = async (indicatorId?: string) => {
  const query = indicatorId ? `?indicator_id=${indicatorId}` : '';
  return apiCall(`/admin/config/rules${query}`);
};

// Get scoring rules for specific indicator
export const getIndicatorRules = async (indicatorId: string) => {
  return apiCall(`/admin/config/indicators/${indicatorId}/rules`);
};

// Create scoring rule
export const createScoringRule = async (rule: any) => {
  return apiCall('/admin/config/rules', {
    method: 'POST',
    body: JSON.stringify(rule)
  });
};

// Update scoring rule
export const updateScoringRule = async (id: string, updates: any) => {
  return apiCall(`/admin/config/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

// Delete scoring rule
export const deleteScoringRule = async (id: string) => {
  return apiCall(`/admin/config/rules/${id}`, {
    method: 'DELETE'
  });
};

// Form Templates
export const getFormTemplates = async () => {
  return apiCall('/admin/config/templates');
};

export const getFormTemplate = async (id: string) => {
  return apiCall(`/admin/config/templates/${id}`);
};

export const createFormTemplate = async (template: any) => {
  return apiCall('/admin/config/templates', {
    method: 'POST',
    body: JSON.stringify(template)
  });
};

export const updateFormTemplate = async (id: string, template: any) => {
  return apiCall(`/admin/config/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(template)
  });
};

export const deleteFormTemplate = async (id: string) => {
  return apiCall(`/admin/config/templates/${id}`, {
    method: 'DELETE'
  });
};

// Configuration Versions
export const getConfigurationVersions = async () => {
  return apiCall('/admin/config/versions');
};

export const createConfigurationVersion = async (version: any) => {
  return apiCall('/admin/config/versions', {
    method: 'POST',
    body: JSON.stringify(version)
  });
};

export const applyConfigurationVersion = async (versionId: string) => {
  return apiCall(`/admin/config/versions/${versionId}/apply`, {
    method: 'POST'
  });
};

// ===== ASSESSMENT ENDPOINTS =====

// Get assessment progress for agency
export const getAssessmentProgress = async (agencyId: string) => {
  return apiCall(`/assessments/progress/${agencyId}`);
};

// Get full assessment for agency
export const getFullAssessment = async (agencyId: string) => {
  return apiCall(`/assessments/full/${agencyId}`);
};

// Get assessment statistics
export const getAssessmentStats = async (agencyId: string) => {
  return apiCall(`/assessments/stats/${agencyId}`);
};

// Save single indicator assessment
export const saveIndicatorAssessment = async (data: {
  agency_id: string;
  indicatorId: string;
  score?: number;
  responseData: any;
  last_updated?: string;
}) => {
  return apiCall('/assessments/save', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Save all assessments for agency
export const saveAllAssessments = async (data: {
  agency_id: string;
  indicator_scores: Record<string, number>;
  response_data?: Record<string, any>;
  status: string;
}) => {
  return apiCall('/assessments/save-all', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Submit assessment
export const submitAssessment = async (data: {
  agency_id: string;
  submitted_at: string;
}) => {
  return apiCall('/assessments/submit', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Validate assessment
export const validateAssessment = async (agencyId: string, data: { validated_by: string }) => {
  return apiCall(`/assessments/validate/${agencyId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Finalize assessment
export const finalizeAssessment = async (agencyId: string, data: { finalized_by: string; finalization_notes?: string }) => {
  return apiCall(`/assessments/finalize/${agencyId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Unlock assessment
export const unlockAssessment = async (agencyId: string, data: { unlocked_by: string; reason: string }) => {
  return apiCall(`/assessments/unlock/${agencyId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Calculate indicator score
export const calculateIndicatorScore = async (data: {
  indicatorId: string;
  responseData: any;
  templateId?: string;
}) => {
  return apiCall('/assessments/calculate-score', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Generate assessment form
export const generateAssessmentForm = async (params: {
  templateId?: string;
  agencyId?: string;
  indicatorId?: string;
}) => {
  const query = new URLSearchParams();
  if (params.templateId) query.append('templateId', params.templateId);
  if (params.agencyId) query.append('agencyId', params.agencyId);
  if (params.indicatorId) query.append('indicatorId', params.indicatorId);
  
  return apiCall(`/assessments/form/generate?${query.toString()}`);
};

// Validate form data
export const validateFormData = async (data: {
  indicatorId: string;
  formData: any;
}) => {
  return apiCall('/assessments/form/validate', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Get agency report
export const getAgencyReport = async (agencyId: string) => {
  return apiCall(`/assessments/report/${agencyId}`);
};

// ===== AGENCY & SCORE ENDPOINTS =====

// Get agency scores (with optional fiscal year)
export const getAgencyScores = async (fiscalYear?: string) => {
  const query = fiscalYear ? `?fiscal_year=${fiscalYear}` : '';
  return apiCall(`/agency-scores${query}`);
};

// Get report summary (with optional fiscal year)
export const getReportSummary = async (fiscalYear?: string) => {
  const query = fiscalYear ? `?fiscal_year=${fiscalYear}` : '';
  return apiCall(`/reports/summary${query}`);
};

// Export report to Excel
export const exportReportToExcel = async (fiscalYear?: string) => {
  const query = fiscalYear ? `?fiscal_year=${fiscalYear}` : '';
  return apiCall(`/reports/export${query}`);
};

// ===== AUTH & USER ENDPOINTS =====

// Login
export const login = async (credentials: { email: string; password: string }) => {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
};

// Logout
export const logout = async () => {
  return apiCall('/auth/logout', {
    method: 'POST'
  });
};

// Get current user - CRITICAL for session persistence on refresh
export const getCurrentUser = async () => {
  return apiCall('/auth/me');
};

// ===== AGENCY MANAGEMENT =====

// Get all agencies
export const getAgencies = async () => {
  return apiCall('/agencies');
};

// Get single agency
export const getAgency = async (id: string) => {
  return apiCall(`/agencies/${id}`);
};

// Create agency
export const createAgency = async (agency: any) => {
  return apiCall('/agencies', {
    method: 'POST',
    body: JSON.stringify(agency)
  });
};

// Update agency
export const updateAgency = async (id: string, updates: any) => {
  return apiCall(`/agencies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

// Delete agency
export const deleteAgency = async (id: string) => {
  return apiCall(`/agencies/${id}`, {
    method: 'DELETE'
  });
};

// ===== ERROR HANDLING =====

// Global error handler for API responses
export const handleApiError = (error: any): string => {
  if (error.message === 'unauthorized') {
    return 'Your session has expired. Please log in again.';
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
    return 'Network error. Please check your connection.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
};// Rebuilt: Thu Apr  9 10:06:33 +06 2026
