/**
 * Utility to handle AIMS-specific scoring calculations
 * Integrates with existing assessment system
 */

import WeightedCalculationService from '../services/WeightedCalculationService';

export interface AssessmentResponse {
  indicator_id: string;
  response_data: Record<string, any>;
  calculated_score?: number;
}

export class AssessmentCalculator {
  
  /**
   * Process assessment responses with AIMS-specific calculations
   */
  static async processResponses(
    assessmentId: string,
    responses: AssessmentResponse[]
  ): Promise<AssessmentResponse[]> {
    const processedResponses = [...responses];
    
    for (const response of processedResponses) {
      // Handle Indicator 4 (Corruption Cases) weighted calculation
      if (response.indicator_id === 'ind_cases') {
        await this.processIndicator4Response(assessmentId, response);
      }
      
      // Add other indicator-specific calculations here as needed
      // Example: Indicator 1 ICCS scoring, etc.
    }
    
    return processedResponses;
  }
  
  /**
   * Special handling for Indicator 4
   */
  private static async processIndicator4Response(
    assessmentId: string,
    response: AssessmentResponse
  ): Promise<void> {
    try {
      const counts = {
        convictions: parseInt(response.response_data.convictions) || 0,
        prosecutions: parseInt(response.response_data.prosecutions) || 0,
        admin_actions: parseInt(response.response_data.admin_actions) || 0
      };
      
      // Calculate weighted sum and points
      const result = WeightedCalculationService.calculateFromCounts(counts);
      
      // Update response data with calculated weighted_sum
      response.response_data.weighted_sum = result.weighted_sum;
      
      // Update calculated score
      response.calculated_score = result.points;
      
      // Also update in database via WeightedCalculationService
      await WeightedCalculationService.processIndicator4Response(
        assessmentId,
        response.response_data
      );
      
    } catch (error) {
      console.error('Error processing Indicator 4 response:', error);
      // Don't throw - continue with other responses
    }
  }
  
  /**
   * Calculate total AIMS score from individual indicator scores
   */
  static calculateTotalScore(responses: AssessmentResponse[]): number {
    let totalScore = 0;
    
    for (const response of responses) {
      if (response.calculated_score !== undefined) {
        totalScore += response.calculated_score;
      }
    }
    
    return totalScore;
  }
  
  /**
   * Determine integrity level based on total score
   */
  static determineIntegrityLevel(totalScore: number): {
    level: 'high' | 'medium' | 'low';
    label: string;
    color: string;
  } {
    if (totalScore >= 80) {
      return { level: 'high', label: 'High Integrity', color: 'green' };
    } else if (totalScore >= 50) {
      return { level: 'medium', label: 'Medium Integrity', color: 'yellow' };
    } else {
      return { level: 'low', label: 'Needs Improvement', color: 'red' };
    }
  }
  
  /**
   * Validate AIMS assessment completeness
   */
  static validateAIMSAssessment(responses: AssessmentResponse[]): {
    isValid: boolean;
    missingIndicators: string[];
    warnings: string[];
  } {
    const aimIndicatorIds = [
      'ind_iccs',      // Indicator 1
      'ind_training',  // Indicator 2
      'ind_ad',        // Indicator 3
      'ind_cases',     // Indicator 4
      'ind_atr'        // Indicator 5
    ];
    
    const providedIds = responses.map(r => r.indicator_id);
    const missingIndicators = aimIndicatorIds.filter(id => !providedIds.includes(id));
    
    const warnings: string[] = [];
    
    // Check Indicator 4 has all required fields
    const indicator4 = responses.find(r => r.indicator_id === 'ind_cases');
    if (indicator4) {
      const requiredFields = ['convictions', 'prosecutions', 'admin_actions'];
      const missingFields = requiredFields.filter(
        field => indicator4.response_data[field] === undefined
      );
      
      if (missingFields.length > 0) {
        warnings.push(`Indicator 4 missing fields: ${missingFields.join(', ')}`);
      }
    }
    
    return {
      isValid: missingIndicators.length === 0,
      missingIndicators,
      warnings
    };
  }
}

export default AssessmentCalculator;