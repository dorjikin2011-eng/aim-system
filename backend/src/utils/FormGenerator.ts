//backend/src/utils/FormGenerator.ts
import { FormTemplate } from '../models/FormTemplate';
import { IndicatorConfig } from '../models/IndicatorConfig';
import { ConfigValidator } from './ConfigValidator';
import { IndicatorDefinition, ParameterDefinition, ScoringRule } from '../types/config';

export class FormGenerator {
  
  /**
   * Generate form structure from template
   */
  static async generateForm(templateId: string, includeInactive: boolean = false): Promise<any> {
    try {
      const template = await FormTemplate.getById(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      if (!template.isActive && !includeInactive) {
        throw new Error('Template is not active');
      }
      
      // Get all indicators referenced in the template
      const indicatorIds = new Set<string>();
      template.sections.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.indicatorId) {
            indicatorIds.add(field.indicatorId);
          }
        });
      });
      
      // Fetch all indicators
      const indicators = await Promise.all(
        Array.from(indicatorIds).map(id => IndicatorConfig.getById(id))
      );
      
      const indicatorMap = new Map();
      indicators.forEach(ind => {
        if (ind) {
          indicatorMap.set(ind.id, ind);
        }
      });
      
      // Enhance sections with indicator data
      const enhancedSections = template.sections.map((section) => {
        const enhancedFields = section.fields.map((field) => {
          const indicator = indicatorMap.get(field.indicatorId);
          
          if (!indicator) {
            return null;
          }
          
          // Find parameter in indicator
          const parameter = indicator.parameters.find((p: ParameterDefinition) => p.code === field.parameterCode);
          
          if (!parameter) {
            return null;
          }
          
          return {
            ...field,
            indicator: {
              id: indicator.id,
              name: indicator.name,
              code: indicator.code,
              description: indicator.description,
              weight: indicator.weight,
              scoringMethod: indicator.scoringMethod
            },
            parameter: {
              ...parameter,
              validation: {
                required: field.required || false,
                ...parameter.validation
              }
            }
          };
        }).filter(field => field !== null);
        
        return {
          ...section,
          fields: enhancedFields
        };
      });
      
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.version,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        sections: enhancedSections,
        uiConfig: template.uiConfig,
        metadata: {
          totalSections: enhancedSections.length,
          totalFields: enhancedSections.reduce((sum: number, section: any) => 
            sum + (section.fields.length || 0), 0),
          indicators: enhancedSections.flatMap((section: any) => 
            section.fields.map((field: any) => field.indicator?.code).filter(Boolean)
          ).filter((value: any, index: number, self: any[]) => self.indexOf(value) === index)
        }
      };
    } catch (error) {
      console.error('Error generating form:', error);
      throw error;
    }
  }
  
  /**
   * Generate form preview (without database queries)
   */
  static generatePreview(templateStructure: any): any {
    try {
      const structure = typeof templateStructure === 'string' 
        ? JSON.parse(templateStructure) 
        : templateStructure;
      
      return {
        ...structure,
        preview: true,
        metadata: {
          totalSections: structure.sections?.length || 0,
          totalFields: structure.sections?.reduce((sum: number, section: any) => 
            sum + (section.fields?.length || 0), 0) || 0
        }
      };
    } catch (error) {
      throw new Error('Invalid template structure');
    }
  }
  
  /**
   * Generate scoring calculation based on form data
   */
  static async calculateScore(formData: any, templateId: string): Promise<{
    totalScore: number;
    indicatorScores: Record<string, number>;
    breakdown: any[];
    integrityLevel: 'high' | 'medium' | 'needsImprovement';
  }> {
    try {
      const template = await FormTemplate.getById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Get all indicators referenced in the form
      const indicatorIds = new Set<string>();
      template.sections.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.indicatorId) {
            indicatorIds.add(field.indicatorId);
          }
        });
      });
      
      // Fetch indicators
      const indicators = await Promise.all(
        Array.from(indicatorIds).map(id => IndicatorConfig.getById(id))
      );
      
      const validIndicators = indicators.filter(ind => ind !== null) as IndicatorDefinition[];
      
      // Calculate scores per indicator
      const indicatorScores: Record<string, number> = {};
      const breakdown: any[] = [];
      
      for (const indicator of validIndicators) {
        const indCode = indicator.code;
        
        // Get form data for this indicator's parameters
        const paramValues: Record<string, any> = {};
        template.sections.forEach((section) => {
          section.fields.forEach((field) => {
            if (field.indicatorId === indicator.id && field.parameterCode) {
              paramValues[field.parameterCode] = formData[field.parameterCode];
            }
          });
        });
        
        // Calculate score based on scoring method
        let score = this.calculateIndicatorScore(indicator, paramValues);
        
        // Apply weight
        const weightedScore = (score / 100) * (indicator.weight || 0);
        
        indicatorScores[indCode] = weightedScore;
        
        breakdown.push({
          indicator: indicator.name,
          code: indicator.code,
          weight: indicator.weight,
          rawScore: score,
          weightedScore: weightedScore,
          method: indicator.scoringMethod
        });
      }
      
      // Calculate total score
      const totalScore = Object.values(indicatorScores).reduce((sum, score) => sum + score, 0);
      
      // Determine integrity level (using default thresholds)
      const integrityLevel = this.determineIntegrityLevel(totalScore);
      
      return {
        totalScore: parseFloat(totalScore.toFixed(2)),
        indicatorScores,
        breakdown,
        integrityLevel
      };
    } catch (error) {
      console.error('Error calculating score:', error);
      throw error;
    }
  }
  
  /**
   * Calculate score for a single indicator
   */
  private static calculateIndicatorScore(indicator: IndicatorDefinition, paramValues: Record<string, any>): number {
    const scoringMethod = indicator.scoringMethod || 'sum';
    
    switch (scoringMethod) {
      case 'sum':
        return this.calculateSumScore(indicator, paramValues);
      case 'average':
        return this.calculateAverageScore(indicator, paramValues);
      case 'weighted':
        return this.calculateWeightedScore(indicator, paramValues);
      case 'formula':
        return this.calculateFormulaScore(indicator, paramValues);
      case 'conditional':
        return this.calculateConditionalScore(indicator, paramValues);
      default:
        return 0;
    }
  }
  
  /**
   * Helper methods for different scoring calculations
   */
  private static calculateSumScore(indicator: IndicatorDefinition, paramValues: Record<string, any>): number {
    const rules = indicator.scoringRules || [];
    let total = 0;
    
    rules.forEach((rule: ScoringRule) => {
      if (this.evaluateCondition(rule.condition, paramValues)) {
        total += rule.points || 0;
      }
    });
    
    return Math.min(total, 100); // Cap at 100
  }
  
  private static calculateAverageScore(indicator: IndicatorDefinition, paramValues: Record<string, any>): number {
    const parameters = indicator.parameters || [];
    const scores: number[] = [];
    
    parameters.forEach((param: ParameterDefinition) => {
      const value = paramValues[param.code];
      if (value !== undefined && value !== null && value !== '') {
        // Find matching scoring rule
        const rules = indicator.scoringRules || [];
        const matchingRule = rules.find((rule: ScoringRule) => {
          return rule.parameterCode === param.code && 
                 this.evaluateCondition(rule.condition, { [param.code]: value });
        });
        
        if (matchingRule) {
          scores.push(matchingRule.points || 0);
        }
      }
    });
    
    if (scores.length === 0) return 0;
    
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.min(average, 100);
  }
  
  private static calculateWeightedScore(indicator: IndicatorDefinition, paramValues: Record<string, any>): number {
    const parameters = indicator.parameters || [];
    let totalWeighted = 0;
    let totalWeight = 0;
    
    parameters.forEach((param: ParameterDefinition) => {
      const weight = param.metadata?.weight || 0;
      const value = paramValues[param.code];
      
      if (value !== undefined && value !== null && value !== '' && weight > 0) {
        // Find matching scoring rule
        const rules = indicator.scoringRules || [];
        const matchingRule = rules.find((rule: ScoringRule) => {
          return rule.parameterCode === param.code && 
                 this.evaluateCondition(rule.condition, { [param.code]: value });
        });
        
        if (matchingRule) {
          totalWeighted += (matchingRule.points || 0) * weight;
          totalWeight += weight;
        }
      }
    });
    
    if (totalWeight === 0) return 0;
    
    const score = (totalWeighted / totalWeight) * 100;
    return Math.min(score, 100);
  }
  
  private static calculateFormulaScore(indicator: IndicatorDefinition, paramValues: Record<string, any>): number {
    // This would evaluate a formula expression
    // For now, return sum as placeholder
    return this.calculateSumScore(indicator, paramValues);
  }
  
  private static calculateConditionalScore(indicator: IndicatorDefinition, paramValues: Record<string, any>): number {
    const rules = indicator.scoringRules || [];
    
    // Find the first matching rule
    for (const rule of rules) {
      if (this.evaluateCondition(rule.condition, paramValues)) {
        return rule.points || 0;
      }
    }
    
    return 0;
  }
  
  private static evaluateCondition(condition: string, paramValues: Record<string, any>): boolean {
    if (!condition) return true;
    
    try {
      const operators = ['==', '!=', '<', '>', '<=', '>=', 'in', 'not in'];
      
      for (const operator of operators) {
        if (condition.includes(operator)) {
          const [left, right] = condition.split(operator).map(p => p.trim());
          
          // Check if left is a parameter
          const paramValue = paramValues[left];
          if (paramValue === undefined) return false;
          
          const compareValue = this.parseValue(right);
          
          switch (operator) {
            case '==':
              return paramValue == compareValue;
            case '!=':
              return paramValue != compareValue;
            case '<':
              return paramValue < compareValue;
            case '>':
              return paramValue > compareValue;
            case '<=':
              return paramValue <= compareValue;
            case '>=':
              return paramValue >= compareValue;
            case 'in':
              const list = right.replace(/[\[\]]/g, '').split(',').map(v => this.parseValue(v.trim()));
              return list.includes(paramValue);
            case 'not in':
              const list2 = right.replace(/[\[\]]/g, '').split(',').map(v => this.parseValue(v.trim()));
              return !list2.includes(paramValue);
          }
        }
      }
      
      // If no operator found, check if parameter has any value
      const paramValue = paramValues[condition];
      return paramValue !== undefined && paramValue !== null && paramValue !== '';
      
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }
  
  private static parseValue(value: string): any {
    // Remove quotes
    const trimmed = value.replace(/^['"](.*)['"]$/, '$1');
    
    // Try to parse as number
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    
    // Try to parse as boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    
    // Return as string
    return trimmed;
  }
  
  /**
   * Determine integrity level based on score
   */
  private static determineIntegrityLevel(score: number): 'high' | 'medium' | 'needsImprovement' {
    // Default thresholds - these should come from config
    const highThreshold = 80;
    const mediumThreshold = 60;
    
    if (score >= highThreshold) {
      return 'high';
    } else if (score >= mediumThreshold) {
      return 'medium';
    } else {
      return 'needsImprovement';
    }
  }
  
  /**
   * Generate JSON schema for form validation
   */
  static generateJSONSchema(template: any): any {
    const structure = typeof template === 'string' 
      ? JSON.parse(template) 
      : template;
    
    const schema: any = {
      type: 'object',
      properties: {},
      required: []
    };
    
    if (!structure.sections) return schema;
    
    structure.sections.forEach((section: any) => {
      if (!section.fields) return;
      
      section.fields.forEach((field: any) => {
        if (field.parameterCode) {
          const fieldSchema: any = {
            title: field.label || field.parameterCode
          };
          
          // Map field type to JSON schema type
          switch (field.type) {
            case 'number':
              fieldSchema.type = 'number';
              if (field.uiSettings?.min !== undefined) fieldSchema.minimum = field.uiSettings.min;
              if (field.uiSettings?.max !== undefined) fieldSchema.maximum = field.uiSettings.max;
              break;
            case 'text':
            case 'textarea':
              fieldSchema.type = 'string';
              if (field.validation?.minLength !== undefined) fieldSchema.minLength = field.validation.minLength;
              if (field.validation?.maxLength !== undefined) fieldSchema.maxLength = field.validation.maxLength;
              break;
            case 'select':
            case 'radio':
              fieldSchema.type = 'string';
              if (field.options) {
                fieldSchema.enum = field.options.map((opt: any) => opt.value);
              }
              break;
            case 'checkbox':
              fieldSchema.type = 'boolean';
              break;
            case 'date':
              fieldSchema.type = 'string';
              fieldSchema.format = 'date';
              break;
            case 'file':
              fieldSchema.type = 'string';
              break;
            default:
              fieldSchema.type = 'string';
          }
          
          schema.properties[field.parameterCode] = fieldSchema;
          
          if (field.required) {
            schema.required.push(field.parameterCode);
          }
        }
      });
    });
    
    return schema;
  }
  
  /**
   * Generate form field definitions for frontend
   */
  static generateFieldDefinitions(template: any): any[] {
    const structure = typeof template === 'string' 
      ? JSON.parse(template) 
      : template;
    
    const fields: any[] = [];
    
    if (!structure.sections) return fields;
    
    structure.sections.forEach((section: any, sectionIndex: number) => {
      if (!section.fields) return;
      
      section.fields.forEach((field: any, fieldIndex: number) => {
        if (field.parameterCode) {
          fields.push({
            id: `${sectionIndex}-${fieldIndex}`,
            sectionId: section.id || `section-${sectionIndex}`,
            sectionTitle: section.title,
            ...field,
            fieldOrder: fieldIndex
          });
        }
      });
    });
    
    return fields;
  }
}
