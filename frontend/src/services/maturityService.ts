// frontend/src/services/maturityService.ts

import type {
  MaturityFramework,
  MaturityAssessment,
  PercentageAssessment,
  SeverityAssessment,
  MaturityFrameworkTemplate,
  MaturityValidationResult,
  SubsystemDefinition,
  MaturityLevel
} from '../types/maturity';
import type { ApiResponse } from '../types/config';

class MaturityService {
  private baseUrl = '${API_BASE}/api/maturity';

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP error ${response.status}`
        };
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to process response'
      };
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
  }

  /**
   * FRAMEWORK MANAGEMENT
   */

  /**
   * Get maturity framework for an indicator
   */
  async getIndicatorFramework(indicatorId: string): Promise<ApiResponse<MaturityFramework>> {
    try {
      const response = await fetch(`${this.baseUrl}/frameworks/indicator/${indicatorId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return this.handleResponse<MaturityFramework>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load maturity framework'
      };
    }
  }

  /**
   * Update maturity framework for an indicator
   */
  async updateIndicatorFramework(
    indicatorId: string,
    framework: MaturityFramework
  ): Promise<ApiResponse<MaturityFramework>> {
    try {
      // Validate framework before saving
      const validation = await this.validateFramework(framework);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid framework configuration: ${validation.errors.join(', ')}`
        };
      }

      const response = await fetch(`${this.baseUrl}/frameworks/indicator/${indicatorId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(framework)
      });
      return this.handleResponse<MaturityFramework>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update maturity framework'
      };
    }
  }

  /**
   * Get maturity framework for a subsystem
   */
  async getSubsystemFramework(
    indicatorId: string,
    subsystemId: string
  ): Promise<ApiResponse<MaturityFramework>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/frameworks/indicator/${indicatorId}/subsystem/${subsystemId}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );
      return this.handleResponse<MaturityFramework>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load subsystem framework'
      };
    }
  }

  /**
   * Get all subsystems for an indicator (especially for ICCS)
   */
  async getSubsystems(indicatorId: string): Promise<ApiResponse<SubsystemDefinition[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/subsystems/${indicatorId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return this.handleResponse<SubsystemDefinition[]>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load subsystems'
      };
    }
  }

  /**
   * Update subsystems for an indicator
   */
  async updateSubsystems(
    indicatorId: string,
    subsystems: SubsystemDefinition[]
  ): Promise<ApiResponse<SubsystemDefinition[]>> {
    try {
      // Validate total weight doesn't exceed parent indicator weight
      const totalWeight = subsystems.reduce((sum, s) => sum + s.weight, 0);
      const parentIndicator = await this.getParentIndicatorWeight(indicatorId);
      
      if (parentIndicator && Math.abs(totalWeight - parentIndicator) > 0.1) {
        return {
          success: false,
          error: `Subsystem total weight (${totalWeight}) must equal parent indicator weight (${parentIndicator})`
        };
      }

      const response = await fetch(`${this.baseUrl}/subsystems/${indicatorId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(subsystems)
      });
      return this.handleResponse<SubsystemDefinition[]>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update subsystems'
      };
    }
  }

  /**
   * FRAMEWORK TEMPLATES
   */

  /**
   * Get all maturity framework templates
   */
  async getFrameworkTemplates(): Promise<ApiResponse<MaturityFrameworkTemplate[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return this.handleResponse<MaturityFrameworkTemplate[]>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load framework templates'
      };
    }
  }

  /**
   * Create a new framework template
   */
  async createFrameworkTemplate(
    template: Omit<MaturityFrameworkTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<MaturityFrameworkTemplate>> {
    try {
      const validation = await this.validateFramework(template.framework);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid framework configuration: ${validation.errors.join(', ')}`
        };
      }

      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(template)
      });
      return this.handleResponse<MaturityFrameworkTemplate>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create framework template'
      };
    }
  }

  /**
   * Update a framework template
   */
  async updateFrameworkTemplate(
    templateId: string,
    template: Partial<MaturityFrameworkTemplate>
  ): Promise<ApiResponse<MaturityFrameworkTemplate>> {
    try {
      if (template.framework) {
        const validation = await this.validateFramework(template.framework);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Invalid framework configuration: ${validation.errors.join(', ')}`
          };
        }
      }

      const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(template)
      });
      return this.handleResponse<MaturityFrameworkTemplate>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update framework template'
      };
    }
  }

  /**
   * Delete a framework template
   */
  async deleteFrameworkTemplate(templateId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP error ${response.status}`
        };
      }
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete framework template'
      };
    }
  }

  /**
   * Apply a template to an indicator
   */
  async applyTemplateToIndicator(
    templateId: string,
    indicatorId: string
  ): Promise<ApiResponse<MaturityFramework>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/templates/${templateId}/apply/${indicatorId}`,
        {
          method: 'POST',
          headers: this.getHeaders()
        }
      );
      return this.handleResponse<MaturityFramework>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to apply template to indicator'
      };
    }
  }

  /**
   * ASSESSMENT MANAGEMENT
   */

  /**
   * Submit a maturity-based assessment
   */
  async submitMaturityAssessment(
    assessment: MaturityAssessment
  ): Promise<ApiResponse<{ score: number; level: MaturityLevel }>> {
    try {
      // Validate that all required parameters for the selected level are satisfied
      const framework = await this.getIndicatorFramework(assessment.indicatorId);
      if (!framework.success || !framework.data) {
        throw new Error('Could not load framework for validation');
      }

      const levelDef = framework.data.levels.find(l => l.level === assessment.selectedLevel);
      if (!levelDef) {
        return {
          success: false,
          error: `Level ${assessment.selectedLevel} not defined in framework`
        };
      }

      const requiredParams = levelDef.parameters.filter(p => p.required).map(p => p.id);
      const missingRequired = requiredParams.filter(id => !assessment.satisfiedParameters.includes(id));
      
      if (missingRequired.length > 0) {
        return {
          success: false,
          error: `Missing required parameters: ${missingRequired.join(', ')}`
        };
      }

      const response = await fetch(`${this.baseUrl}/assessments/maturity`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(assessment)
      });
      return this.handleResponse<{ score: number; level: MaturityLevel }>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to submit maturity assessment'
      };
    }
  }

  /**
   * Submit a percentage-based assessment
   */
  async submitPercentageAssessment(
    assessment: PercentageAssessment
  ): Promise<ApiResponse<{ score: number; level: MaturityLevel; percentage: number }>> {
    try {
      // Calculate percentage if not provided
      if (!assessment.percentage && assessment.denominator > 0) {
        assessment.percentage = (assessment.numerator / assessment.denominator) * 100;
      }

      const response = await fetch(`${this.baseUrl}/assessments/percentage`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(assessment)
      });
      return this.handleResponse<{ score: number; level: MaturityLevel; percentage: number }>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to submit percentage assessment'
      };
    }
  }

  /**
   * Submit a severity-based assessment
   */
  async submitSeverityAssessment(
    assessment: SeverityAssessment
  ): Promise<ApiResponse<{ score: number; level: MaturityLevel; severityScore: number }>> {
    try {
      // Calculate severity score if not provided
      if (!assessment.severityScore) {
        assessment.severityScore = 
          (assessment.caseCounts.conviction * 3) +
          (assessment.caseCounts.prosecution * 2) +
          (assessment.caseCounts.admin_action * 1);
      }

      const response = await fetch(`${this.baseUrl}/assessments/severity`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(assessment)
      });
      return this.handleResponse<{ score: number; level: MaturityLevel; severityScore: number }>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to submit severity assessment'
      };
    }
  }

  /**
   * Get all assessments for an agency
   */
  async getAgencyAssessments(
    agencyId: string,
    fiscalYear?: string
  ): Promise<ApiResponse<Array<MaturityAssessment | PercentageAssessment | SeverityAssessment>>> {
    try {
      const url = fiscalYear 
        ? `${this.baseUrl}/assessments/agency/${agencyId}?fiscalYear=${fiscalYear}`
        : `${this.baseUrl}/assessments/agency/${agencyId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return this.handleResponse<Array<MaturityAssessment | PercentageAssessment | SeverityAssessment>>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load agency assessments'
      };
    }
  }

  /**
   * VALIDATION & UTILITY
   */

  /**
   * Validate a maturity framework configuration
   */
  async validateFramework(framework: MaturityFramework): Promise<MaturityValidationResult> {
    const result: MaturityValidationResult = {
      isValid: true,
      levelValidation: [],
      errors: [],
      warnings: []
    };

    // Check that all levels 0-3 are defined
    const definedLevels = framework.levels.map(l => l.level);
    for (let level = 0; level <= 3; level++) {
      if (!definedLevels.includes(level as MaturityLevel)) {
        result.errors.push(`Level ${level} is not defined`);
        result.isValid = false;
      }
    }

    // Validate each level
    for (const level of framework.levels) {
      const levelValidation = {
        level: level.level,
        hasParameters: level.parameters.length > 0,
        parameterCount: level.parameters.length,
        pointsDefined: level.points > 0,
        errors: [] as string[],
        warnings: [] as string[]
      };

      // Check points progression (higher levels should have more points)
      if (level.level > 0) {
        const prevLevel = framework.levels.find(l => l.level === level.level - 1);
        if (prevLevel && level.points <= prevLevel.points) {
          levelValidation.warnings.push(
            `Level ${level.level} points (${level.points}) should be greater than Level ${level.level - 1} (${prevLevel.points})`
          );
        }
      }

      // Check parameter codes are unique within level
      const codes = level.parameters.map(p => p.code);
      const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index);
      if (duplicateCodes.length > 0) {
        levelValidation.errors.push(`Duplicate parameter codes: ${[...new Set(duplicateCodes)].join(', ')}`);
        result.isValid = false;
      }

      // Check required fields
      level.parameters.forEach((param, idx) => {
        if (!param.description) {
          levelValidation.errors.push(`Parameter ${param.code || idx} missing description`);
          result.isValid = false;
        }
        if (!param.whatToLookFor) {
          levelValidation.warnings.push(`Parameter ${param.code || idx} missing 'what to look for' guidance`);
        }
      });

      result.levelValidation.push(levelValidation);
    }

    // Validate scoring rule based on type
    switch (framework.scoringRule.type) {
      case 'maturity-level':
        if (!framework.scoringRule.levelPoints) {
          result.errors.push('Maturity level scoring requires levelPoints definition');
          result.isValid = false;
        }
        break;
      
      case 'percentage-range':
        if (!framework.scoringRule.percentageThresholds || framework.scoringRule.percentageThresholds.length === 0) {
          result.errors.push('Percentage range scoring requires percentageThresholds');
          result.isValid = false;
        }
        break;
      
      case 'severity-index':
        if (!framework.scoringRule.severityWeights || !framework.scoringRule.severityMapping) {
          result.errors.push('Severity index scoring requires severityWeights and severityMapping');
          result.isValid = false;
        }
        break;
    }

    return result;
  }

  /**
   * Get parent indicator weight (helper method)
   */
  private async getParentIndicatorWeight(indicatorId: string): Promise<number | null> {
    try {
      // This would typically call an API to get the indicator
      // For now, return mock data based on known indicators
      const weights: Record<string, number> = {
        'ind_iccs': 32,
        'ind_capacity': 24,
        'ind_ad': 14,
        'ind_coc': 10,
        'ind_cases': 20
      };
      return weights[indicatorId] || null;
    } catch {
      return null;
    }
  }

  /**
   * Export framework configuration
   */
  async exportFramework(indicatorId: string): Promise<ApiResponse<string>> {
    try {
      const response = await fetch(`${this.baseUrl}/export/${indicatorId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error ${response.status}`
        };
      }

      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `maturity-framework-${indicatorId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to export framework'
      };
    }
  }

  /**
   * Import framework configuration
   */
  async importFramework(
    indicatorId: string,
    file: File
  ): Promise<ApiResponse<MaturityFramework>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${this.baseUrl}/import/${indicatorId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      return this.handleResponse<MaturityFramework>(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to import framework'
      };
    }
  }
}

// Export a singleton instance
export const maturityService = new MaturityService();