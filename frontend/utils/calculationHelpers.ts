//frontend/utils/calculationHelpers.ts
/**
 * Calculation helpers for AIMS assessment forms
 * Handles formula-based calculations, especially for Indicator 4
 */

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

/**
 * Calculate weighted sum for Indicator 4 according to AIMS formula:
 * weighted_sum = (convictions × 3) + (prosecutions × 2) + (admin_actions × 1)
 */
export function calculateWeightedSum(counts: CaseCounts): number {
  return (counts.convictions * 3) + 
         (counts.prosecutions * 2) + 
         (counts.admin_actions * 1);
}

/**
 * Map weighted sum to points per AIMS guideline
 */
export function mapWeightedSumToPoints(weightedSum: number): CalculationResult {
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
export function calculateFromCounts(counts: CaseCounts): CalculationResult {
  const weightedSum = calculateWeightedSum(counts);
  return mapWeightedSumToPoints(weightedSum);
}

/**
 * Parse and evaluate a simple formula string
 * Supports basic operations: +, -, *, /, parentheses
 * Example: "(convictions * 3) + (prosecutions * 2) + (admin_actions * 1)"
 */
export function evaluateFormula(formula: string, variables: Record<string, number>): number {
  try {
    // Replace variable names with their values
    let expression = formula;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, value.toString());
    }
    
    // Remove any remaining non-numeric, non-operator characters (except parentheses)
    expression = expression.replace(/[^0-9+\-*/().]/g, '');
    
    // Use Function constructor as a simple safe evaluator
    // Note: In production, consider using a proper math expression parser library
    const result = new Function(`return ${expression}`)();
    
    return Number(result) || 0;
  } catch (error) {
    console.error('Formula evaluation error:', error, { formula, variables });
    return 0;
  }
}

/**
 * Calculate ICCS score from response data
 */
export function calculateICCScore(responseData: any): number {
  let score = 0;
  
  // Each subsystem: exists = 3 points, functions = 4 points
  if (responseData.complaint_exists) score += 3;
  if (responseData.complaint_functions) score += 4;
  if (responseData.conflict_exists) score += 3;
  if (responseData.conflict_functions) score += 4;
  if (responseData.gift_exists) score += 3;
  if (responseData.gift_functions) score += 4;
  
  // Proactive measures
  if (responseData.proactive_level === 'level1') score += 7;
  else if (responseData.proactive_level === 'level2') score += 3;
  // level3 = 0 points
  
  return score;
}

/**
 * Calculate training score from completion rate
 */
export function calculateTrainingScore(completionRate: number): number {
  if (completionRate >= 85) return 26;
  if (completionRate >= 70) return 18;
  if (completionRate >= 50) return 10;
  return 0;
}

/**
 * Calculate asset declaration score from submission rate
 */
export function calculateADScore(submissionRate: number): number {
  if (submissionRate === 100) return 16;
  if (submissionRate >= 95) return 10;
  if (submissionRate >= 90) return 5;
  return 0;
}

/**
 * Calculate ATR score from timeliness rate
 */
export function calculateATRScore(timelinessRate: number): number {
  if (timelinessRate >= 90) return 10;
  if (timelinessRate >= 70) return 7;
  return 3;
}

/**
 * Calculate total AIMS score from all indicator scores
 */
export function calculateTotalAIMSScore(scores: {
  iccs: number;
  training: number;
  ad: number;
  cases: number;
  atr: number;
}): number {
  return scores.iccs + scores.training + scores.ad + scores.cases + scores.atr;
}

/**
 * Determine integrity level based on total score
 */
export function determineIntegrityLevel(totalScore: number): {
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
 * Format score for display with color coding
 */
export function formatScore(score: number, maxScore: number): {
  text: string;
  color: string;
  percentage: number;
} {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  
  let color = 'gray';
  if (percentage >= 80) color = 'green';
  else if (percentage >= 50) color = 'yellow';
  else color = 'red';
  
  return {
    text: `${score}/${maxScore}`,
    color,
    percentage
  };
}

export default {
  calculateWeightedSum,
  mapWeightedSumToPoints,
  calculateFromCounts,
  evaluateFormula,
  calculateICCScore,
  calculateTrainingScore,
  calculateADScore,
  calculateATRScore,
  calculateTotalAIMSScore,
  determineIntegrityLevel,
  formatScore
};