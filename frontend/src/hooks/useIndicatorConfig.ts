// frontend/src/hooks/useIndicatorConfig.ts - FULLY FIXED VERSION
import { useState, useCallback } from 'react';
import { configService } from '../services/configService';
import type { 
  IndicatorDefinition, 
  FormTemplate, 
  ValidationResult,
  ApiResponse,
  CreateIndicatorInput,
  UpdateIndicatorInput
} from '../types/config';

export function useIndicatorConfig() {
  const [indicators, setIndicators] = useState<IndicatorDefinition[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Load indicators
  const loadIndicators = useCallback(async (params?: {
    category?: string;
    activeOnly?: boolean;
    includeParameters?: boolean;
    includeRules?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await configService.getIndicators(params);
      if (response.success && response.data) {
        setIndicators(response.data);
      } else {
        setError(response.error || 'Failed to load indicators');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load indicators');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load form templates
  const loadTemplates = useCallback(async (params?: {
    indicatorIds?: string[];
    activeOnly?: boolean;
    templateType?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const serviceParams = {
        activeOnly: params?.activeOnly,
        ...(params?.indicatorIds && params.indicatorIds.length > 0 && { category: 'filtered' }) // placeholder mapping
      };
      const response = await configService.getFormTemplates(serviceParams);
      if (response.success && response.data) {
        setTemplates(response.data);
      } else {
        setError(response.error || 'Failed to load templates');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create indicator
  const createIndicator = useCallback(async (indicator: CreateIndicatorInput): Promise<ApiResponse<IndicatorDefinition>> => {
    setLoading(true);
    setError(null);
    setValidationResult(null);

    try {
      const validationResponse = await configService.validateIndicator(indicator);
      if (!validationResponse.success || (validationResponse.data && !validationResponse.data.isValid)) {
        setValidationResult(validationResponse.data || {
          isValid: false,
          errors: validationResponse.errors || [validationResponse.error || 'Validation failed']
        });
        return {
          success: false,
          error: validationResponse.error || 'Validation failed',
          errors: validationResponse.errors || validationResponse.data?.errors
        };
      }

      const response = await configService.createIndicator(indicator);
      if (response.success && response.data) {
        const newIndicator = response.data;
        setIndicators(prev => [...prev, newIndicator]);
      } else {
        setError(response.error || 'Failed to create indicator');
      }
      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create indicator';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update indicator
  const updateIndicator = useCallback(async (id: string, updates: UpdateIndicatorInput): Promise<ApiResponse<IndicatorDefinition>> => {
    setLoading(true);
    setError(null);
    setValidationResult(null);

    try {
      const currentIndicator = indicators.find(ind => ind.id === id);
      if (!currentIndicator) {
        const errorMsg = 'Indicator not found';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      const updatedIndicator = { ...currentIndicator, ...updates };
      const validationResponse = await configService.validateIndicator(updatedIndicator);

      if (!validationResponse.success || (validationResponse.data && !validationResponse.data.isValid)) {
        setValidationResult(validationResponse.data || {
          isValid: false,
          errors: validationResponse.errors || [validationResponse.error || 'Validation failed']
        });
        return {
          success: false,
          error: validationResponse.error || 'Validation failed',
          errors: validationResponse.errors || validationResponse.data?.errors
        };
      }

      const response = await configService.updateIndicator(id, updates);
      if (response.success && response.data) {
        const updated = response.data;
        setIndicators(prev => prev.map(ind => ind.id === id ? updated : ind));
      } else {
        setError(response.error || 'Failed to update indicator');
      }
      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update indicator';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [indicators]);

  // Delete indicator
  const deleteIndicator = useCallback(async (id: string, hardDelete: boolean = false): Promise<ApiResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await configService.deleteIndicator(id, hardDelete);
      if (response.success) {
        if (hardDelete) {
          setIndicators(prev => prev.filter(ind => ind.id !== id));
        } else {
          setIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, isActive: false } : ind));
        }
      } else {
        setError(response.error || 'Failed to delete indicator');
      }
      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete indicator';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Reorder indicators
  const reorderIndicators = useCallback(async (category: string, orderedIds: string[]): Promise<ApiResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await configService.reorderIndicators(category, orderedIds);
      if (response.success) {
        await loadIndicators({ category, activeOnly: false });
      } else {
        setError(response.error || 'Failed to reorder indicators');
      }
      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to reorder indicators';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [loadIndicators]);

  // Validate indicator
  const validateIndicator = useCallback(async (indicator: Partial<IndicatorDefinition>): Promise<ValidationResult> => {
    setLoading(true);
    setError(null);
    try {
      const response = await configService.validateIndicator(indicator);
      if (response.success && response.data) {
        setValidationResult(response.data);
        return response.data;
      } else {
        const errorMsg = response.error || 'Validation failed';
        setError(errorMsg);
        return { isValid: false, errors: [errorMsg] };
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Validation failed';
      setError(errorMsg);
      return { isValid: false, errors: [errorMsg] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Create form template
  const createFormTemplate = useCallback(async (template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<ApiResponse<FormTemplate>> => {
    setLoading(true);
    setError(null);
    try {
      const templateWithRequired = {
        ...template,
        createdBy: template.createdBy || 'admin',
        updatedBy: template.updatedBy || 'admin'
      };
      const response = await configService.createFormTemplate(templateWithRequired);
      if (response.success && response.data) {
        const newTemplate = response.data;
        setTemplates(prev => [...prev, newTemplate]);
      } else {
        setError(response.error || 'Failed to create template');
      }
      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create template';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update form template
  const updateFormTemplate = useCallback(async (id: string, updates: Partial<FormTemplate>): Promise<ApiResponse<FormTemplate>> => {
    setLoading(true);
    setError(null);
    try {
      const response = await configService.updateFormTemplate(id, updates);
      if (response.success && response.data) {
        const updated = response.data;
        setTemplates(prev => prev.map(tpl => tpl.id === id ? updated : tpl));
      } else {
        setError(response.error || 'Failed to update template');
      }
      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update template';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete form template
  const deleteFormTemplate = useCallback(async (id: string, hardDelete: boolean = false): Promise<ApiResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await configService.deleteFormTemplate(id, hardDelete);
      if (response.success) {
        if (hardDelete) {
          setTemplates(prev => prev.filter(tpl => tpl.id !== id));
        } else {
          setTemplates(prev => prev.map(tpl => tpl.id === id ? { ...tpl, isActive: false } : tpl));
        }
      } else {
        setError(response.error || 'Failed to delete template');
      }
      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete template';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Remaining getters and utility functions
  const getIndicatorById = useCallback((id: string): IndicatorDefinition | undefined => indicators.find(ind => ind.id === id), [indicators]);
  const getTemplateById = useCallback((id: string): FormTemplate | undefined => templates.find(tpl => tpl.id === id), [templates]);
  const clearValidation = useCallback(() => setValidationResult(null), []);
  const clearError = useCallback(() => setError(null), []);
  const resetLoading = useCallback(() => setLoading(false), []);

  return {
    indicators,
    templates,
    loading,
    error,
    validationResult,

    loadIndicators,
    loadTemplates,
    createIndicator,
    updateIndicator,
    deleteIndicator,
    reorderIndicators,
    validateIndicator,
    createFormTemplate,
    updateFormTemplate,
    deleteFormTemplate,

    getIndicatorById,
    getTemplateById,

    clearValidation,
    clearError,
    resetLoading
  };
}