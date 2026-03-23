const { FormGenerator } = require('./src/utils/FormGenerator');
const { IndicatorConfig } = require('./src/models/IndicatorConfig');
const { FormTemplate } = require('./src/models/FormTemplate');

async function testDynamicFlow() {
  console.log('=== Testing Complete Dynamic Flow ===\n');
  
  try {
    // 1. Get the ICCS indicator
    console.log('1. Getting ICCS indicator...');
    const iccsIndicator = await IndicatorConfig.getById('ind_iccs');
    if (!iccsIndicator) {
      throw new Error('ICCS indicator not found');
    }
    console.log(`   ✅ Found: ${iccsIndicator.name} (${iccsIndicator.code})`);
    console.log(`   Parameters: ${iccsIndicator.parameters.length}`);
    console.log(`   Scoring Rules: ${iccsIndicator.scoringRules.length}`);
    
    // 2. Get the template
    console.log('\n2. Getting AIMS template...');
    const template = await FormTemplate.getById('template_aims_assessment');
    if (!template) {
      throw new Error('Template not found');
    }
    console.log(`   ✅ Found: ${template.name}`);
    console.log(`   Sections: ${template.sections.length}`);
    console.log(`   Indicator IDs: ${template.indicatorIds.join(', ')}`);
    
    // 3. Test FormGenerator.generateForm()
    console.log('\n3. Testing FormGenerator.generateForm()...');
    try {
      const generatedForm = await FormGenerator.generateForm('template_aims_assessment');
      console.log(`   ✅ Form generated successfully`);
      console.log(`   Form sections: ${generatedForm.sections.length}`);
      console.log(`   Total fields: ${generatedForm.metadata.totalFields}`);
      
      // Check if fields have indicator data
      const firstSection = generatedForm.sections[1]; // ICCS section
      const firstField = firstSection.fields[0];
      console.log(`   First field indicator: ${firstField?.indicator?.name || 'None'}`);
    } catch (error) {
      console.log(`   ❌ Form generation failed: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }
    
    // 4. Test FormGenerator.calculateScore()
    console.log('\n4. Testing FormGenerator.calculateScore()...');
    
    // Create test form data
    const testFormData = {
      // Basic info
      agency_name: "Test Agency",
      fiscal_year: "2024-25",
      contact_person: "John Doe",
      
      // ICCS assessment - all positive
      complaint_exists: true,
      complaint_functioning: true,
      conflict_exists: true,
      conflict_functioning: true,
      gift_exists: true,
      gift_functioning: true,
      proactive_measures: "level1"  // Best case
    };
    
    try {
      const scoreResult = await FormGenerator.calculateScore(testFormData, 'template_aims_assessment');
      console.log(`   ✅ Score calculation successful`);
      console.log(`   Total Score: ${scoreResult.totalScore}`);
      console.log(`   Integrity Level: ${scoreResult.integrityLevel}`);
      console.log(`   Breakdown items: ${scoreResult.breakdown.length}`);
      
      // Show breakdown
      console.log('\n   Score Breakdown:');
      scoreResult.breakdown.forEach(item => {
        console.log(`     - ${item.indicator}: ${item.rawScore} (weighted: ${item.weightedScore})`);
      });
      
      // Expected score calculation:
      // 3 systems × (3 exists + 4 functioning) = 21 points
      // + 7 points for ACC recommendations = 28 points
      // Weighted: (28/100) × indicator.weight (let's check)
      console.log(`\n   Expected max: 28 points (indicator.maxScore: ${iccsIndicator.maxScore})`);
      
    } catch (error) {
      console.log(`   ❌ Score calculation failed: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }
    
    // 5. Test evaluateCondition with actual scoring rules
    console.log('\n5. Testing scoring rule evaluation...');
    const scoringRules = iccsIndicator.scoringRules;
    if (scoringRules && scoringRules.length > 0) {
      console.log(`   Testing ${scoringRules.length} rules:`);
      
      // Test first rule
      const firstRule = scoringRules[0];
      console.log(`   Rule 1: ${firstRule.parameter_code} ${firstRule.condition} → ${firstRule.points} pts`);
      
      // Test with sample data
      const testData = { complaint_exists: true };
      console.log(`   Test data: { complaint_exists: true }`);
      console.log(`   Condition "${firstRule.condition}" with test data...`);
      
      // We can't directly call FormGenerator.evaluateCondition as it's private
      // But we can test via calculateScore
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testDynamicFlow();