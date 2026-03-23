/**
 * Test complete AIMS assessment flow with weighted calculation - FIXED VERSION
 */

import WeightedCalculationService from '../services/WeightedCalculationService';
import AssessmentCalculator, { AssessmentResponse } from '../utils/AssessmentCalculator';

interface TestResponse extends AssessmentResponse {
  response_data: Record<string, any>;
  calculated_score?: number;
}

async function testCompleteAIMSFlow() {
  console.log('🧪 Testing Complete AIMS Assessment Flow...\n');
  
  // Test data for a complete AIMS assessment
  const testAssessment = {
    assessment_id: 'test_assessment_' + Date.now(),
    responses: [
      {
        indicator_id: 'ind_iccs',
        response_data: {
          complaint_exists: true,
          complaint_functions: true,
          conflict_exists: true,
          conflict_functions: false,
          gift_exists: true,
          gift_functions: true,
          proactive_level: 'level1'
        }
      } as TestResponse,
      {
        indicator_id: 'ind_training',
        response_data: {
          completion_rate: 85
        }
      } as TestResponse,
      {
        indicator_id: 'ind_ad',
        response_data: {
          submission_rate: 95
        }
      } as TestResponse,
      {
        indicator_id: 'ind_cases',
        response_data: {
          convictions: 1,
          prosecutions: 0,
          admin_actions: 2
        }
      } as TestResponse,
      {
        indicator_id: 'ind_atr',
        response_data: {
          timeliness_rate: 80
        }
      } as TestResponse
    ]
  };
  
  console.log('Test Assessment Data:');
  console.log(JSON.stringify(testAssessment, null, 2));
  console.log('');
  
  // 1. Validate AIMS assessment
  const validation = AssessmentCalculator.validateAIMSAssessment(testAssessment.responses);
  console.log('1. Validation Result:');
  console.log(`   Valid: ${validation.isValid}`);
  console.log(`   Missing Indicators: ${validation.missingIndicators.join(', ') || 'None'}`);
  console.log(`   Warnings: ${validation.warnings.join(', ') || 'None'}`);
  console.log('');
  
  // 2. Process responses (simulated - would update database in real scenario)
  console.log('2. Processing responses with calculations:');
  
  // Process Indicator 4 specifically
  const indicator4 = testAssessment.responses.find(r => r.indicator_id === 'ind_cases');
  if (indicator4) {
    const counts = {
      convictions: parseInt(indicator4.response_data.convictions?.toString() || '0') || 0,
      prosecutions: parseInt(indicator4.response_data.prosecutions?.toString() || '0') || 0,
      admin_actions: parseInt(indicator4.response_data.admin_actions?.toString() || '0') || 0
    };
    
    const result = WeightedCalculationService.calculateFromCounts(counts);
    console.log(`   Indicator 4 - Corruption Cases:`);
    console.log(`     Raw counts: ${counts.convictions} convictions, ${counts.prosecutions} prosecutions, ${counts.admin_actions} admin actions`);
    console.log(`     Weighted sum: ${result.weighted_sum}`);
    console.log(`     Points: ${result.points} (${result.description})`);
    console.log('');
    
    // Update response with calculated value
    indicator4.response_data.weighted_sum = result.weighted_sum;
    indicator4.calculated_score = result.points;
  }
  
  // 3. Calculate scores for other indicators (simplified)
  console.log('3. Calculating scores for all indicators:');
  
  // ICCS scoring simulation
  const iccs = testAssessment.responses.find(r => r.indicator_id === 'ind_iccs');
  if (iccs) {
    let iccsScore = 0;
    if (iccs.response_data.complaint_exists) iccsScore += 3;
    if (iccs.response_data.complaint_functions) iccsScore += 4;
    if (iccs.response_data.conflict_exists) iccsScore += 3;
    if (iccs.response_data.gift_exists) iccsScore += 3;
    if (iccs.response_data.gift_functions) iccsScore += 4;
    
    if (iccs.response_data.proactive_level === 'level1') iccsScore += 7;
    else if (iccs.response_data.proactive_level === 'level2') iccsScore += 3;
    
    iccs.calculated_score = iccsScore;
    console.log(`   Indicator 1 - ICCS: ${iccsScore}/28 points`);
  }
  
  // Training scoring
  const training = testAssessment.responses.find(r => r.indicator_id === 'ind_training');
  if (training) {
    const rate = Number(training.response_data.completion_rate) || 0;
    let trainingScore = 0;
    if (rate >= 85) trainingScore = 26;
    else if (rate >= 70) trainingScore = 18;
    else if (rate >= 50) trainingScore = 10;
    
    training.calculated_score = trainingScore;
    console.log(`   Indicator 2 - Training: ${trainingScore}/26 points (${rate}% completion)`);
  }
  
  // AD scoring
  const ad = testAssessment.responses.find(r => r.indicator_id === 'ind_ad');
  if (ad) {
    const rate = Number(ad.response_data.submission_rate) || 0;
    let adScore = 0;
    if (rate === 100) adScore = 16;
    else if (rate >= 95) adScore = 10;
    else if (rate >= 90) adScore = 5;
    
    ad.calculated_score = adScore;
    console.log(`   Indicator 3 - Asset Declaration: ${adScore}/16 points (${rate}% submission)`);
  }
  
  // ATR scoring
  const atr = testAssessment.responses.find(r => r.indicator_id === 'ind_atr');
  if (atr) {
    const rate = Number(atr.response_data.timeliness_rate) || 0;
    let atrScore = 0;
    if (rate >= 90) atrScore = 10;
    else if (rate >= 70) atrScore = 7;
    else atrScore = 3;
    
    atr.calculated_score = atrScore;
    console.log(`   Indicator 5 - ATR: ${atrScore}/10 points (${rate}% timely)`);
  }
  
  console.log('');
  
  // 4. Calculate total score
  const totalScore = AssessmentCalculator.calculateTotalScore(testAssessment.responses);
  const integrityLevel = AssessmentCalculator.determineIntegrityLevel(totalScore);
  
  console.log('4. Total Score and Integrity Level:');
  console.log(`   Total Score: ${totalScore}/100`);
  console.log(`   Integrity Level: ${integrityLevel.label} (${integrityLevel.level})`);
  console.log('');
  
  // 5. Summary
  console.log('🎉 AIMS Assessment Flow Test Completed!');
  console.log('');
  console.log('Summary:');
  console.log(`   Assessment ID: ${testAssessment.assessment_id}`);
  console.log(`   Total Score: ${totalScore}/100`);
  console.log(`   Integrity: ${integrityLevel.label}`);
  console.log('');
  console.log('Next Steps:');
  console.log('1. Integrate with actual assessment submission endpoint');
  console.log('2. Update UI to show calculated weighted sums');
  console.log('3. Test with actual form submissions');
}

// Run test
testCompleteAIMSFlow().catch(console.error);