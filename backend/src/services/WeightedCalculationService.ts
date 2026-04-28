// backend/src/services/weightedCalculationService.ts
import { pool } from '../models/db';

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
      const counts: CaseCounts = {
        convictions: parseInt(responseData.convictions) || 0,
        prosecutions: parseInt(responseData.prosecutions) || 0,
        admin_actions: parseInt(responseData.admin_actions) || 0
      };

      const result = this.calculateFromCounts(counts);

      // Check if response exists
      const { rows } = await pool.query(
        'SELECT * FROM dynamic_assessment_responses WHERE assessment_id = $1 AND indicator_id = $2',
        [assessmentId, 'ind_cases']
      );

      if (rows[0]) {
        const responseJson = JSON.parse(rows[0].response_data || '{}');
        responseJson.weighted_sum = result.weighted_sum;

        await pool.query(
          `UPDATE dynamic_assessment_responses
           SET response_data = $1, calculated_score = $2, updated_at = CURRENT_TIMESTAMP
           WHERE assessment_id = $3 AND indicator_id = $4`,
          [JSON.stringify(responseJson), result.points, assessmentId, 'ind_cases']
        );
      } else {
        const responseJson = {
          ...responseData,
          weighted_sum: result.weighted_sum
        };

        await pool.query(
          `INSERT INTO dynamic_assessment_responses
           (id, assessment_id, indicator_id, response_data, calculated_score, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [`resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
           assessmentId,
           'ind_cases',
           JSON.stringify(responseJson),
           result.points]
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
      const { rows } = await pool.query(
        `SELECT * FROM dynamic_assessment_responses WHERE indicator_id = 'ind_cases'`
      );

      let updated = 0;
      let errors = 0;

      for (const response of rows) {
        try {
          const responseData = JSON.parse(response.response_data || '{}');
          if (responseData.weighted_sum !== undefined) continue;

          const counts: CaseCounts = {
            convictions: parseInt(responseData.convictions) || 0,
            prosecutions: parseInt(responseData.prosecutions) || 0,
            admin_actions: parseInt(responseData.admin_actions) || 0
          };

          const result = this.calculateFromCounts(counts);
          responseData.weighted_sum = result.weighted_sum;

          await pool.query(
            `UPDATE dynamic_assessment_responses
             SET response_data = $1, calculated_score = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [JSON.stringify(responseData), result.points, response.id]
          );

          updated++;

        } catch (err) {
          console.error(`❌ Error processing response ${response.id}:`, err);
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