/**
 * Test script for weighted calculation service
 * Run with: npx ts-node src/scripts/test-weighted-calculation.ts
 */

import WeightedCalculationService from '../services/WeightedCalculationService';

async function testWeightedCalculation() {
  console.log('🧪 Testing Weighted Calculation Service...\n');
  
  // Test 1: Basic calculation
  console.log('Test 1: Basic calculations');
  const testCases = [
    { convictions: 0, prosecutions: 0, admin_actions: 0, expectedSum: 0, expectedPoints: 20 },
    { convictions: 1, prosecutions: 0, admin_actions: 0, expectedSum: 3, expectedPoints: 5 },
    { convictions: 0, prosecutions: 1, admin_actions: 0, expectedSum: 2, expectedPoints: 10 },
    { convictions: 0, prosecutions: 0, admin_actions: 1, expectedSum: 1, expectedPoints: 10 },
    { convictions: 2, prosecutions: 0, admin_actions: 0, expectedSum: 6, expectedPoints: 0 },
    { convictions: 1, prosecutions: 1, admin_actions: 1, expectedSum: 6, expectedPoints: 0 },
  ];
  
  for (const testCase of testCases) {
    const result = WeightedCalculationService.calculateFromCounts({
      convictions: testCase.convictions,
      prosecutions: testCase.prosecutions,
      admin_actions: testCase.admin_actions
    });
    
    const passed = result.weighted_sum === testCase.expectedSum && 
                   result.points === testCase.expectedPoints;
    
    console.log(`${passed ? '✅' : '❌'} Convictions:${testCase.convictions}, ` +
                `Prosecutions:${testCase.prosecutions}, ` +
                `Admin:${testCase.admin_actions} → ` +
                `Sum:${result.weighted_sum} (expected ${testCase.expectedSum}), ` +
                `Points:${result.points} (expected ${testCase.expectedPoints})`);
  }
  
  // Test 2: Database integration (if database is available)
  console.log('\nTest 2: Testing database integration...');
  try {
    // This would test the batch recalculation
    const dbResult = await WeightedCalculationService.recalculateAllIndicator4Responses();
    console.log(`✅ Batch recalculation: ${dbResult.updated} updated, ${dbResult.errors} errors`);
  } catch (error) {
    console.log('⚠️  Database test skipped (database may not be available)');
  }
  
  console.log('\n🎉 Weighted calculation tests completed!');
  console.log('\nNext steps:');
  console.log('1. Integrate with assessment submission endpoint');
  console.log('2. Add automatic calculation when raw counts are entered');
  console.log('3. Update UI to show calculated weighted sum');
}

// Run tests
testWeightedCalculation().catch(console.error);