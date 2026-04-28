// frontend/src/services/api.ts

// 1. Define API_BASE (Ensure no trailing slash)
export const API_BASE = (import.meta.env.VITE_API_BASE || 'https://backend-theta-navy-44.vercel.app').replace(/\/$/, '');

// 2. The Refined apiCall Function
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  // Ensure endpoint starts with / and doesn't double up /api
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiPath = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
  
  const url = `${API_BASE}${apiPath}`;

  console.log(`🚀 Calling API: ${url}`);
  console.log(`📤 Request method: ${options.method || 'GET'}`);

  // Get token from localStorage
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    // Handle 401 for /auth/me specially
    if (endpoint.includes('/auth/me') && response.status === 401) {
      return { user: null };
    }

    // Handle 401 for other endpoints
    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('token');
      throw new Error('unauthorized');
    }

    // Read body as text first to handle non-JSON responses safely
    const text = await response.text();
    console.log(`📄 Response preview: ${text.substring(0, 200)}`);
    
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('❌ API Error - Received non-JSON response from:', url);
      console.error('Response preview:', text.substring(0, 500));
      
      // Check if it's an HTML error page
      if (text.includes('<!doctype') || text.includes('<html')) {
        throw new Error(`Server returned HTML instead of JSON. Endpoint may not exist: ${url}`);
      }
      throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
    }

    // Handle non-OK responses using the parsed data
    if (!response.ok) {
      throw new Error(data.error || data.message || `API Error: ${response.status}`);
    }

    // Return the parsed JSON data
    return data;
  } catch (error) {
    console.error(`❌ Fetch error for ${url}:`, error);
    throw error;
  }
}

// ===== AUTHENTICATION ENDPOINTS =====

export const login = async (email: string, password: string) => {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
};

export const logout = async () => {
  return apiCall('/auth/logout', {
    method: 'POST'
  });
};

export const getCurrentUser = async () => {
  try {
    const response = await apiCall('/auth/me');
    return response;
  } catch (error: any) {
    if (error.message === 'unauthorized') {
      return { user: null };
    }
    throw error;
  }
};

// ===== ADMIN: USERS ENDPOINTS =====

export const getUsers = async (params?: {
  agencyId?: string;
  role?: string;
  search?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.agencyId) query.append('agency_id', params.agencyId);
  if (params?.role) query.append('role', params.role);
  if (params?.search) query.append('search', params.search);
  
  const queryString = query.toString();
  return apiCall(`/admin/users${queryString ? `?${queryString}` : ''}`);
};

export const getUser = async (id: string) => {
  return apiCall(`/admin/users/${id}`);
};

export const createUser = async (userData: {
  email: string;
  name: string;
  role: string;
  agency_id?: string;
  password?: string;
}) => {
  return apiCall('/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const updateUser = async (id: string, updates: Partial<User>) => {
  return apiCall(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

export const deleteUser = async (id: string) => {
  return apiCall(`/admin/users/${id}`, {
    method: 'DELETE'
  });
};

// ===== ADMIN: AGENCIES ENDPOINTS =====

export const getAgencies = async (params?: {
  activeOnly?: boolean;
  search?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.activeOnly) query.append('active_only', 'true');
  if (params?.search) query.append('search', params.search);
  
  const queryString = query.toString();
  return apiCall(`/admin/agencies${queryString ? `?${queryString}` : ''}`);
};

export const getAgency = async (id: string) => {
  return apiCall(`/admin/agencies/${id}`);
};

export const createAgency = async (agencyData: {
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
}) => {
  return apiCall('/admin/agencies', {
    method: 'POST',
    body: JSON.stringify(agencyData)
  });
};

export const updateAgency = async (id: string, updates: any) => {
  return apiCall(`/admin/agencies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

export const deleteAgency = async (id: string) => {
  return apiCall(`/admin/agencies/${id}`, {
    method: 'DELETE'
  });
};

// ===== ADMIN: REPORTS ENDPOINTS =====

export const getReports = async (params?: {
  type?: string;
  agencyId?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.type) query.append('type', params.type);
  if (params?.agencyId) query.append('agency_id', params.agencyId);
  if (params?.fromDate) query.append('from_date', params.fromDate);
  if (params?.toDate) query.append('to_date', params.toDate);
  
  const queryString = query.toString();
  return apiCall(`/admin/reports${queryString ? `?${queryString}` : ''}`);
};

export const generateReport = async (reportConfig: {
  type: string;
  title: string;
  parameters: Record<string, any>;
  format?: 'pdf' | 'excel' | 'csv';
}) => {
  return apiCall('/admin/reports/generate', {
    method: 'POST',
    body: JSON.stringify(reportConfig)
  });
};

export const getReport = async (id: string) => {
  return apiCall(`/admin/reports/${id}`);
};

export const downloadReport = async (id: string, format: 'pdf' | 'excel' | 'csv' = 'pdf') => {
  // For file downloads, we need to handle differently
  const token = localStorage.getItem('token');
  const url = `${API_BASE}/api/admin/reports/${id}/download?format=${format}`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `report_${id}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
  
  return { success: true };
};

// ===== ADMIN: ASSIGNMENTS ENDPOINTS =====

export const getAssignments = async (params?: {
  userId?: string;
  agencyId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.userId) query.append('user_id', params.userId);
  if (params?.agencyId) query.append('agency_id', params.agencyId);
  if (params?.status) query.append('status', params.status);
  if (params?.fromDate) query.append('from_date', params.fromDate);
  if (params?.toDate) query.append('to_date', params.toDate);
  
  const queryString = query.toString();
  return apiCall(`/admin/assignments${queryString ? `?${queryString}` : ''}`);
};

export const getAssignment = async (id: string) => {
  return apiCall(`/admin/assignments/${id}`);
};

export const createAssignment = async (assignmentData: {
  user_id: string;
  agency_id: string;
  role: string;
  start_date?: string;
  end_date?: string;
}) => {
  return apiCall('/admin/assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData)
  });
};

export const updateAssignment = async (id: string, updates: any) => {
  return apiCall(`/admin/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

export const deleteAssignment = async (id: string) => {
  return apiCall(`/admin/assignments/${id}`, {
    method: 'DELETE'
  });
};

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
  if (params?.activeOnly) query.append('active_only', 'true');
  if (params?.includeParameters) query.append('include_parameters', 'true');
  if (params?.includeRules) query.append('include_rules', 'true');
  if (params?.category) query.append('category', params.category);
  
  return apiCall(`/indicator-config?${query.toString()}`);
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

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  agency_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  created_at?: string;
  updated_at?: string;
}