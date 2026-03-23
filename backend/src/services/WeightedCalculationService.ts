/**
 * Service to handle weighted calculations for AIMS Indicator 4
 * Automatically calculates weighted sum from raw case counts
 */

import { getDB, runAsync, getAsync, allAsync } from '../models/db';

export interface CaseCounts {
  convictions: number;
  prosecutions: number;
  admin_actions: number;
}

export interface CalculationResult {
  weighted_sum: number;
  points: number;
  description: string;
}

export class WeightedCalculationService {
  
  /**
   * Calculate weighted sum according to AIMS formula
   * weighted_sum = (convictions × 3) + (prosecutions × 2) + (admin_actions × 1)
   */
  static calculateWeightedSum(counts: CaseCounts): number {
    return (counts.convictions * 3) + 
           (counts.prosecutions * 2) + 
           (counts.admin_actions * 1);
  }
  
  /**
   * Map weighted sum to points per AIMS guideline
   */
  static mapToPoints(weightedSum: number): CalculationResult {
    let points: number;
    let description: string;
    
    if (weightedSum === 0) {
      points = 20;
      description = 'No corruption cases';
    } else if (weightedSum >= 1 && weightedSum <= 2) {
      points = 10;
      description = 'Low severity cases (weighted score 1-2)';
    } else if (weightedSum >= 3 && weightedSum <= 4) {
      points = 5;
      description = 'Medium severity cases (weighted score 3-4)';
    } else {
      points = 0;
      description = 'High severity cases (weighted score ≥5)';
    }
    
    return {
      weighted_sum: weightedSum,
      points,
      description
    };
  }
  
  /**
   * Calculate everything from raw counts
   */
  static calculateFromCounts(counts: CaseCounts): CalculationResult {
    const weightedSum = this.calculateWeightedSum(counts);
    return this.mapToPoints(weightedSum);
  }
  
  /**
   * Process assessment response for Indicator 4
   * Automatically calculates weighted_sum if raw counts are provided
   */
  static async processIndicator4Response(
    assessmentId: string,
    responseData: any
  ): Promise<CalculationResult | null> {
    try {
      // Extract counts from response data
      const counts: CaseCounts = {
        convictions: parseInt(responseData.convictions) || 0,
        prosecutions: parseInt(responseData.prosecutions) || 0,
        admin_actions: parseInt(responseData.admin_actions) || 0
      };
      
      // Calculate result
      const result = this.calculateFromCounts(counts);
      
      // Update the response in database with calculated weighted_sum
      const db = getDB();
      
      // Check if dynamic response exists
      const existingResponse = await getAsync<any>(
        db,
        'SELECT * FROM dynamic_assessment_responses WHERE assessment_id = ? AND indicator_id = ?',
        [assessmentId, 'ind_cases']
      );
      
      if (existingResponse) {
        // Parse existing response data
        const responseJson = JSON.parse(existingResponse.response_data || '{}');
        
        // Add calculated weighted_sum
        responseJson.weighted_sum = result.weighted_sum;
        
        // Update with calculated score
        await runAsync(
          db,
          `UPDATE dynamic_assessment_responses 
           SET response_data = ?, calculated_score = ?, updated_at = CURRENT_TIMESTAMP
           WHERE assessment_id = ? AND indicator_id = ?`,
          [JSON.stringify(responseJson), result.points, assessmentId, 'ind_cases']
        );
      } else {
        // Create new response with calculated values
        const responseJson = {
          ...responseData,
          weighted_sum: result.weighted_sum
        };
        
        await runAsync(
          db,
          `INSERT INTO dynamic_assessment_responses 
           (id, assessment_id, indicator_id, response_data, calculated_score, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            assessmentId,
            'ind_cases',
            JSON.stringify(responseJson),
            result.points
          ]
        );
      }
      
      console.log(`✅ Processed Indicator 4 for assessment ${assessmentId}:`, result);
      return result;
      
    } catch (error) {
      console.error('❌ Error processing Indicator 4:', error);
      return null;
    }
  }
  
  /**
   * Calculate points for all existing Indicator 4 responses
   * Useful for migration or batch processing
   */
  static async recalculateAllIndicator4Responses(): Promise<{ updated: number; errors: number }> {
    try {
      const db = getDB();
      
      // Get all Indicator 4 responses
      const responses = await allAsync<any>(
        db,
        `SELECT * FROM dynamic_assessment_responses WHERE indicator_id = 'ind_cases'`
      );
      
      let updated = 0;
      let errors = 0;
      
      for (const response of responses) {
        try {
          const responseData = JSON.parse(response.response_data || '{}');
          
          // Skip if already has calculated weighted_sum
          if (responseData.weighted_sum !== undefined) {
            continue;
          }
          
          // Calculate from raw counts
          const counts: CaseCounts = {
            convictions: parseInt(responseData.convictions) || 0,
            prosecutions: parseInt(responseData.prosecutions) || 0,
            admin_actions: parseInt(responseData.admin_actions) || 0
          };
          
          const result = this.calculateFromCounts(counts);
          
          // Update response data with weighted_sum
          responseData.weighted_sum = result.weighted_sum;
          
          await runAsync(
            db,
            `UPDATE dynamic_assessment_responses 
             SET response_data = ?, calculated_score = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [JSON.stringify(responseData), result.points, response.id]
          );
          
          updated++;
          
        } catch (error) {
          console.error(`❌ Error processing response ${response.id}:`, error);
          errors++;
        }
      }
      
      console.log(`✅ Recalculated ${updated} Indicator 4 responses, ${errors} errors`);
      return { updated, errors };
      
    } catch (error) {
      console.error('❌ Error in batch recalculation:', error);
      return { updated: 0, errors: 1 };
    }
  }
}

export default WeightedCalculationService;